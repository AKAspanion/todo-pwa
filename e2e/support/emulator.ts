/**
 * Test data in the Firebase Emulator Suite, for project `demo-todo` only: never a real project.
 *
 * The emulator ports have one source, firebase.json (this project uses its own ports, auth 9199
 * and firestore 8180, so it can run beside other projects on the default ones).
 * `firebase emulators:exec` (the `e2e` and `test` npm scripts) also sets the hosts in the
 * environment, from the same file.
 */
import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';

export const PROJECT_ID = 'demo-todo';

interface EmulatorSettings {
  emulators: { auth: { port: number }; firestore: { port: number } };
}
const { emulators } = JSON.parse(
  readFileSync(new URL('../../firebase.json', import.meta.url), 'utf8'),
) as EmulatorSettings;

export const AUTH_EMULATOR_HOST =
  process.env.FIREBASE_AUTH_EMULATOR_HOST ?? `127.0.0.1:${emulators.auth.port}`;
export const FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST ?? `127.0.0.1:${emulators.firestore.port}`;
const AUTH_HOST = AUTH_EMULATOR_HOST;
const FIRESTORE_HOST = FIRESTORE_EMULATOR_HOST;
/** The emulators accept any API key; the app's demo key is used for symmetry. */
const API_KEY = 'demo-api-key';
/** No call to an emulator should take long; one that hangs fails the test instead of the suite. */
const REQUEST_TIMEOUT_MS = 10_000;

const DOCUMENTS_PATH = `projects/${PROJECT_ID}/databases/(default)/documents`;

if (!PROJECT_ID.startsWith('demo-')) {
  // A demo- project can't reach production services, which is what keeps the tests off live data.
  throw new Error('e2e tests run only against a demo- project');
}

export interface TestUser {
  uid: string;
  email: string;
  password: string;
  displayName: string | null;
}

/** Calls an emulator endpoint and returns its JSON, or throws with the status and a short reason. */
async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `${init.method ?? 'GET'} ${url} failed: ${response.status} ${text.slice(0, 200)}`,
    );
  }
  return (text ? JSON.parse(text) : {}) as T;
}

/** Deletes every account and every document in the emulators. */
export async function resetEmulators(): Promise<void> {
  await Promise.all([
    call(`http://${AUTH_HOST}/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: 'DELETE' }),
    call(`http://${FIRESTORE_HOST}/emulator/v1/${DOCUMENTS_PATH}`, { method: 'DELETE' }),
  ]);
}

/** Creates an email and password account in the Auth emulator. */
export async function createUser(
  email: string,
  password: string,
  displayName?: string,
): Promise<TestUser> {
  const auth = `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1`;
  const json = { 'Content-Type': 'application/json' };
  const created = await call<{ localId: string; idToken: string }>(
    `${auth}/accounts:signUp?key=${API_KEY}`,
    {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  if (displayName !== undefined) {
    await call(`${auth}/accounts:update?key=${API_KEY}`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ idToken: created.idToken, displayName, returnSecureToken: false }),
    });
  }
  return { uid: created.localId, email, password, displayName: displayName ?? null };
}

/**
 * Signs the app in as an existing user, without its sign-in screen: through the app's own
 * `signInEmail` (src/services/auth.ts), loaded from the dev server, so the session is the one the
 * app sees. Opens the app first when the page isn't on it yet.
 */
export async function signInAs(page: Page, email: string, password: string): Promise<void> {
  if (!page.url().startsWith('http')) await page.goto('/signin');
  await page.evaluate(
    async ([userEmail, userPassword]) => {
      // A path the dev server resolves, kept in a variable so the e2e type-check doesn't follow it.
      const servicePath = '/src/services/auth.ts';
      const auth = (await import(servicePath)) as {
        signInEmail(email: string, password: string): Promise<unknown>;
      };
      await auth.signInEmail(userEmail, userPassword);
    },
    [email, password] as const,
  );
}

/** A reference to another document, for fields such as a legacy task's `type` list. */
export class DocRef {
  constructor(readonly path: string) {}
}

export function docRef(path: string): DocRef {
  return new DocRef(path);
}

type FirestoreValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { stringValue: string }
  | { timestampValue: string }
  | { referenceValue: string }
  | { arrayValue: { values: FirestoreValue[] } }
  | { mapValue: { fields: Record<string, FirestoreValue> } };

/** A JavaScript value as a Firestore REST value: Date is a timestamp, DocRef a reference. */
export function toFirestoreValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === 'string') return { stringValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (value instanceof DocRef) return { referenceValue: `${DOCUMENTS_PATH}/${value.path}` };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === 'object') {
    return { mapValue: { fields: toFirestoreFields(value as Record<string, unknown>) } };
  }
  throw new Error(`seedDoc can't store a ${typeof value}`);
}

function toFirestoreFields(data: Record<string, unknown>): Record<string, FirestoreValue> {
  return Object.fromEntries(Object.entries(data).map(([key, v]) => [key, toFirestoreValue(v)]));
}

/** Checks a document path (`collection/id`, `collection/id/sub/id`) and encodes each segment. */
function documentUrlPath(path: string): string {
  const segments = path.split('/');
  if (segments.length % 2 !== 0 || segments.some((s) => s === '' || s === '.' || s === '..')) {
    throw new Error(`not a document path: ${path}`);
  }
  return segments.map(encodeURIComponent).join('/');
}

/**
 * Writes a document as an administrator would, past the security rules, replacing any document
 * already at `path`.
 */
export async function seedDoc(path: string, data: Record<string, unknown>): Promise<void> {
  await call(`http://${FIRESTORE_HOST}/v1/${DOCUMENTS_PATH}/${documentUrlPath(path)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });
}

/** Reads a document past the security rules, as raw Firestore REST fields; null when missing. */
export async function readDoc(path: string): Promise<Record<string, FirestoreValue> | null> {
  try {
    const doc = await call<{ fields?: Record<string, FirestoreValue> }>(
      `http://${FIRESTORE_HOST}/v1/${DOCUMENTS_PATH}/${documentUrlPath(path)}`,
      { headers: { Authorization: 'Bearer owner' } },
    );
    return doc.fields ?? {};
  } catch (error) {
    if (error instanceof Error && / failed: 404 /.test(error.message)) return null;
    throw error;
  }
}

/** The accounts in the Auth emulator, by email. */
export async function listUserEmails(): Promise<string[]> {
  const result = await call<{ userInfo?: { email?: string }[] }>(
    `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:query`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify({ returnUserInfo: true }),
    },
  );
  return (result.userInfo ?? []).map((u) => u.email ?? '').sort();
}

/** Sets an account's photo URL in the Auth emulator, signing in over REST to do it. */
export async function setPhotoUrl(
  email: string,
  password: string,
  photoUrl: string,
): Promise<void> {
  const base = `http://${AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1`;
  const headers = { 'Content-Type': 'application/json' };
  const signIn = await fetch(`${base}/accounts:signInWithPassword?key=demo-api-key`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const { idToken } = (await signIn.json()) as { idToken: string };
  const update = await fetch(`${base}/accounts:update?key=demo-api-key`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ idToken, photoUrl, returnSecureToken: false }),
  });
  if (!update.ok) throw new Error(`setting the photo failed: ${await update.text()}`);
}
