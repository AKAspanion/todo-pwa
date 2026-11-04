/**
 * Seed data and emulator controls for the Home screen's e2e and visual tests. Everything goes
 * through the Emulator Suite (project demo-todo), never a real project.
 */
import { readFileSync } from 'node:fs';
import {
  FIRESTORE_EMULATOR_HOST,
  PROJECT_ID,
  createUser,
  docRef,
  resetEmulators,
  seedDoc,
  type TestUser,
} from '../support/emulator';

export const HOME_USER = {
  email: 'home@example.info',
  password: 'abc-def_9',
  displayName: 'Hema',
} as const;

/** The time zone the Home tests run the browser in, so "today" is the same in Node and the page. */
export const HOME_TIME_ZONE = 'UTC';

/** Today in UTC, as 'YYYY-MM-DD'. */
export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** `ymd` moved by `days`, as 'YYYY-MM-DD' (calendar arithmetic, no time zone involved). */
export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, (d ?? 1) + days)).toISOString().slice(0, 10);
}

/** Empties the emulators and creates the Home test user. */
export async function freshHomeUser(): Promise<TestUser> {
  await resetEmulators();
  return createUser(HOME_USER.email, HOME_USER.password, HOME_USER.displayName);
}

export interface SeedTask {
  id: string;
  title: string;
  description?: string;
  status?: 'todo' | 'done';
  /** 'YYYY-MM-DD', or null for an indefinite task. */
  date?: string | null;
  time?: string | null;
  labelIds?: string[];
}

/** A task as this version of the app writes it. */
export async function seedTask(uid: string, task: SeedTask): Promise<void> {
  const date = task.date ?? null;
  await seedDoc(`tasks/${task.id}`, {
    uid,
    title: task.title,
    description: task.description ?? '',
    status: task.status ?? 'todo',
    indefinite: date === null,
    date,
    time: date === null ? null : (task.time ?? null),
    timeZone: HOME_TIME_ZONE,
    remindAt: null,
    reminded: false,
    labelIds: task.labelIds ?? [],
  });
}

/**
 * A task as the old app wrote it: `date` and `time` of 'NA', labels as `type` references (here to
 * labels that may no longer exist), and no `description`, `indefinite`, `labelIds`, `timeZone`,
 * `remindAt` or `reminded` (Review Focus 2).
 */
export async function seedLegacyTask(
  uid: string,
  task: { id: string; title: string; typeIds: string[] },
): Promise<void> {
  await seedDoc(`tasks/${task.id}`, {
    uid,
    title: task.title,
    status: 'todo',
    date: 'NA',
    time: 'NA',
    type: task.typeIds.map((id) => docRef(`types/${id}`)),
  });
}

/** A label, in the `types` collection. */
export async function seedLabel(
  uid: string,
  label: { id: string; label: string; color: string },
): Promise<void> {
  await seedDoc(`types/${label.id}`, { uid, label: label.label, color: label.color });
}

/** The tasks of the board the visual states show: three todo tasks (one indefinite), one done. */
function homeBoardTasks(today: string): SeedTask[] {
  return [
    {
      id: 'milk',
      title: 'Buy milk',
      description: 'From the corner shop',
      date: today,
      time: '09:30',
      labelIds: ['home'],
    },
    {
      id: 'report',
      title: 'Send the quarterly report',
      description: '**Q4** numbers and the [summary](https://example.com/summary)',
      date: today,
      time: '14:00',
      labelIds: ['work'],
    },
    { id: 'trip', title: 'Plan the winter trip', date: null },
    {
      id: 'rent',
      title: 'Pay rent',
      status: 'done',
      date: today,
      time: '08:00',
      labelIds: ['home', 'work'],
    },
  ];
}

/** The board the visual states show: two labels, three todo tasks (one indefinite), one done. */
export async function seedHomeBoard(uid: string, today: string): Promise<void> {
  await seedLabel(uid, { id: 'work', label: 'Work', color: '#1976D2' });
  await seedLabel(uid, { id: 'home', label: 'Home', color: '#F8BBD0' });
  for (const task of homeBoardTasks(today)) await seedTask(uid, task);
}

/**
 * A task as the old app's own add form wrote it: `description` and `indefinite` as written, 'NA' for
 * the date and time of an indefinite task, labels as `type` references, and none of the fields only
 * this version of the app writes (`labelIds`, `timeZone`, `remindAt`, `reminded`).
 */
export async function seedLegacyBoardTask(uid: string, task: SeedTask): Promise<void> {
  const dated = task.date !== undefined && task.date !== null;
  await seedDoc(`tasks/${task.id}`, {
    uid,
    title: task.title,
    description: task.description ?? '',
    status: task.status ?? 'todo',
    indefinite: !dated,
    date: dated ? task.date : 'NA',
    time: dated ? (task.time ?? 'NA') : 'NA',
    type: (task.labelIds ?? []).map((id) => docRef(`types/${id}`)),
  });
}

/** The same board seedHomeBoard seeds, in the old app's shape: `type` references, 'NA' for no date or time. */
export async function seedLegacyHomeBoard(uid: string, today: string): Promise<void> {
  await seedLabel(uid, { id: 'work', label: 'Work', color: '#1976D2' });
  await seedLabel(uid, { id: 'home', label: 'Home', color: '#F8BBD0' });
  for (const task of homeBoardTasks(today)) await seedLegacyBoardTask(uid, task);
}

const RULES_URL = `http://${FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}:securityRules`;

/** Rules that refuse every read and write: a query fails, and a save is rejected. */
export const DENY_ALL_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
`;

/** Replaces the Firestore emulator's security rules until `restoreFirestoreRules`. */
export async function setFirestoreRules(content: string): Promise<void> {
  const response = await fetch(RULES_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content }] } }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(
      `setting the emulator rules failed: ${response.status} ${await response.text()}`,
    );
  }
}

/** Puts the project's own rules (firestore.rules) back. */
export async function restoreFirestoreRules(): Promise<void> {
  await setFirestoreRules(readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'));
}

/** Firestore's write stream, which the tests abort to cut the network for saves only. */
export const FIRESTORE_WRITE_CHANNEL = '**/google.firestore.v1.Firestore/Write/**';
/** Firestore's listen stream, which carries queries. */
export const FIRESTORE_LISTEN_CHANNEL = '**/google.firestore.v1.Firestore/Listen/**';
