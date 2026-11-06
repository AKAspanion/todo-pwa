/**
 * The PWA on a production build served by `vite preview` (the dev server has no service worker):
 * the offline app shell for deep links (W2), the TWA asset-links statement (W1), and the "new
 * version" prompt that never reloads the page on its own (D20).
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { appendFileSync, cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import { expect, test, type Page } from '@playwright/test';
import { AUTH_EMULATOR_HOST, createUser, resetEmulators, type TestUser } from './support/emulator';

/** A port of its own, beside the dev server the other specs use. */
const PREVIEW_PORT = Number(process.env.E2E_PREVIEW_PORT ?? 4179);
const ORIGIN = `http://localhost:${PREVIEW_PORT}`;
const PASSWORD = 'abc-def_9';
/** The Play app, renamed from app.web.spanion_todo.twa (knowledge/apps/android-twa.md). */
const TWA_PACKAGE = 'in.spanion.todo.twa';
/**
 * The upload key's SHA-256, which the statement must list. Play's app-signing key joins it after the
 * first upload, so the test allows more fingerprints, as tests/android/twa-manifest.test.ts does.
 */
const UPLOAD_KEY_FINGERPRINT =
  '05:FF:05:24:25:81:9B:BA:C2:A8:85:AF:0B:A2:33:B1:19:E9:C1:A0:22:EF:24:D1:B8:6A:79:19:AF:BA:A0:80';
const demoEnv = parseEnv(readFileSync('.env.ci', 'utf8')) as Record<string, string>;
/** The app's demo key: Firebase Auth keeps the signed-in user under a key named after it. */
const API_KEY = demoEnv.VITE_FIREBASE_API_KEY ?? 'demo-api-key';

let workDir = '';
/** The first release, and the next one: the same files with a different service worker. */
let release1 = '';
let release2 = '';
let preview: ChildProcess | null = null;

function viteCommand(args: string[]): string[] {
  return ['node_modules/vite/bin/vite.js', ...args];
}

/** Serves `dist` with `vite preview` on the preview port, once it answers. */
async function startPreview(dist: string): Promise<void> {
  preview = spawn(
    process.execPath,
    viteCommand(['preview', '--outDir', dist, '--port', String(PREVIEW_PORT), '--strictPort']),
    { env: { ...process.env, ...demoEnv }, stdio: 'ignore' },
  );
  await expect
    .poll(
      async () => {
        try {
          const response = await fetch(`${ORIGIN}/robots.txt`, {
            signal: AbortSignal.timeout(2_000),
          });
          return response.ok;
        } catch {
          return false;
        }
      },
      { timeout: 30_000, message: 'vite preview did not start' },
    )
    .toBe(true);
}

async function stopPreview(): Promise<void> {
  const running = preview;
  preview = null;
  if (!running || running.exitCode !== null) return;
  const exited = new Promise<void>((resolve) => running.once('exit', () => resolve()));
  running.kill('SIGTERM');
  await exited;
}

/** Waits until this page is controlled by the app's active service worker. */
async function waitForServiceWorker(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
}

/** A new worker is installed and waiting to take over. */
function hasWaitingWorker(page: Page): Promise<boolean> {
  return page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return Boolean(registration?.waiting);
  });
}

/**
 * Signs the production build in as `user` without its sign-in screen: the session Firebase Auth
 * would have saved after a sign-in through the Auth emulator, written where it reads it on load.
 */
async function signInProduction(page: Page, user: TestUser): Promise<void> {
  const response = await fetch(
    `http://${AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: user.password, returnSecureToken: true }),
      signal: AbortSignal.timeout(10_000),
    },
  );
  expect(response.ok, `emulator sign-in failed: ${response.status}`).toBe(true);
  const session = (await response.json()) as {
    localId: string;
    idToken: string;
    refreshToken: string;
    expiresIn: string;
  };
  const now = Date.now();
  const saved = {
    uid: session.localId,
    email: user.email,
    emailVerified: false,
    isAnonymous: false,
    displayName: user.displayName ?? undefined,
    providerData: [
      {
        providerId: 'password',
        uid: user.email,
        email: user.email,
        displayName: user.displayName,
        phoneNumber: null,
        photoURL: null,
      },
    ],
    stsTokenManager: {
      refreshToken: session.refreshToken,
      accessToken: session.idToken,
      expirationTime: now + Number(session.expiresIn) * 1000,
    },
    createdAt: String(now),
    lastLoginAt: String(now),
    apiKey: API_KEY,
    appName: '[DEFAULT]',
  };
  // A same-origin page that isn't the app, so the app reads the session on its first load.
  await page.goto(`${ORIGIN}/robots.txt`);
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [
    `firebase:authUser:${API_KEY}:[DEFAULT]`,
    JSON.stringify(saved),
  ] as const);
}

test.describe('PWA production build', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'one build, one browser');
  test.describe.configure({ mode: 'serial', timeout: 300_000 });

  test.beforeAll(async () => {
    workDir = mkdtempSync(join(tmpdir(), 'todo-pwa-preview-'));
    release1 = join(workDir, 'release-1');
    release2 = join(workDir, 'release-2');
    const build = spawnSync(
      process.execPath,
      viteCommand(['build', '--outDir', release1, '--emptyOutDir']),
      { encoding: 'utf8', env: { ...process.env, ...demoEnv }, timeout: 240_000 },
    );
    expect(build.status, `${build.stdout}\n${build.stderr}`).toBe(0);
    // The next release: byte-different sw.js, which the browser installs as a new worker.
    cpSync(release1, release2, { recursive: true });
    appendFileSync(join(release2, 'sw.js'), '\n// next release\n');
    await startPreview(release1);
  });

  test.afterAll(async () => {
    await stopPreview();
    if (workDir) rmSync(workDir, { recursive: true, force: true });
  });

  test('after one online visit, an offline reload of /home renders the app shell (W2)', async ({
    page,
    context,
  }) => {
    await page.goto(`${ORIGIN}/home`);
    await waitForServiceWorker(page);

    await context.setOffline(true);
    try {
      const response = await page.goto(`${ORIGIN}/home`);

      expect(response?.fromServiceWorker()).toBe(true);
      await expect(page.locator('#app .v-application')).toBeVisible();
      await expect(page).toHaveTitle(/\S/);
    } finally {
      await context.setOffline(false);
    }
  });

  test('/.well-known/assetlinks.json is JSON naming the TWA and its upload key (W1)', async ({
    request,
  }) => {
    const response = await request.get(`${ORIGIN}/.well-known/assetlinks.json`);

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    const statements = (await response.json()) as {
      relation: string[];
      target: { namespace: string; package_name: string; sha256_cert_fingerprints: string[] };
    }[];
    expect(statements).toHaveLength(1);
    expect(statements[0]?.relation).toEqual(['delegate_permission/common.handle_all_urls']);
    expect(statements[0]?.target).toMatchObject({
      namespace: 'android_app',
      package_name: TWA_PACKAGE,
    });
    const fingerprints = statements[0]?.target.sha256_cert_fingerprints ?? [];
    expect(fingerprints).toContain(UPLOAD_KEY_FINGERPRINT);
    for (const fingerprint of fingerprints) {
      expect(fingerprint).toMatch(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
    }
  });

  test('a waiting new version shows "A new version is available" and reloads only on Reload (D20)', async ({
    page,
  }) => {
    await resetEmulators();
    const user = await createUser('ada@example.info', PASSWORD, 'Ada');
    await signInProduction(page, user);
    await page.goto(`${ORIGIN}/add`);
    await waitForServiceWorker(page);
    // A returning visitor: the page loads under the installed worker.
    await page.reload();
    await waitForServiceWorker(page);
    const title = page.getByLabel('Title', { exact: true });
    await title.fill('Buy milk');
    // Gone once the page reloads.
    await page.evaluate(() => {
      (window as { __samePage?: boolean }).__samePage = true;
    });

    await stopPreview();
    await startPreview(release2);
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update();
    });

    const snack = page.locator('.v-snackbar');
    await expect(snack.getByText('A new version is available')).toBeVisible({ timeout: 30_000 });
    const reload = snack.getByRole('button', { name: 'Reload' });
    await expect(reload).toBeVisible();
    // The new worker waits: nothing reloads, and the half-filled form keeps its text.
    expect(await hasWaitingWorker(page)).toBe(true);
    await expect(title).toHaveValue('Buy milk');
    expect(await page.evaluate(() => (window as { __samePage?: boolean }).__samePage)).toBe(true);

    const reloaded = page.waitForEvent('load');
    await reload.click();
    await reloaded;

    expect(
      await page.evaluate(() => (window as { __samePage?: boolean }).__samePage),
    ).toBeUndefined();
    await waitForServiceWorker(page);
    expect(await hasWaitingWorker(page)).toBe(false);
  });
});
