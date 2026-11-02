/**
 * The one-off legacy migration (spec §10, §11.3) against the Firestore emulator.
 * `npm --prefix functions run test` starts the emulator and sets FIRESTORE_EMULATOR_HOST.
 */
import { initializeApp } from 'firebase-admin/app';
import { Timestamp, getFirestore, type DocumentSnapshot } from 'firebase-admin/firestore';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  legacyRemindAt,
  migrateLegacy,
  parseArgs,
  parseLegacyTimestamp,
  type MigrationReport,
} from './migrate-legacy';

const projectId = 'demo-todo';
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
if (!emulatorHost) {
  throw new Error(
    'FIRESTORE_EMULATOR_HOST is not set: run these tests with `npm --prefix functions run test`.',
  );
}

const app = initializeApp({ projectId }, 'migration-test');
const db = getFirestore(app);

const IST = 'Asia/Kolkata';

async function clearFirestore(): Promise<void> {
  const url = `http://${emulatorHost}/emulator/v1/projects/${projectId}/databases/(default)/documents`;
  const response = await fetch(url, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Clearing the Firestore emulator failed: ${response.status}`);
}

/** The legacy data of the acceptance case: one dated task, two fcm docs, one old notification. */
async function seedLegacy(): Promise<void> {
  await db.doc('tasks/alice-task').set({
    uid: 'alice',
    id: 'alice-task',
    title: 'Dentist',
    description: '',
    status: 'todo',
    indefinite: false,
    date: '2026-11-03',
    time: '09:00',
    type: [],
  });
  await db.doc('fcm/alice').set({ token: 't1' });
  await db.doc('fcm/bob').set({ token: null });
  await db.doc('notifications/n1').set({
    uid: 'alice',
    title: 'Task reminder',
    body: 'Upcoming task "Dentist" at 09:00Hrs',
    timestamp: '11/2/2026, 3:30:00 PM',
  });
}

const SEEDED = ['tasks/alice-task', 'fcm/alice', 'fcm/bob', 'notifications/n1'];

/** Every document path in the emulator's database with its last update time. */
async function snapshotAll(): Promise<Record<string, number | undefined>> {
  const paths = [...SEEDED, 'users/alice/devices/t1'];
  const snaps: DocumentSnapshot[] = await db.getAll(...paths.map((path) => db.doc(path)));
  const devices = await db.collectionGroup('devices').get();
  const result: Record<string, number | undefined> = {};
  snaps.forEach((snap, i) => {
    result[paths[i] ?? ''] = snap.exists ? snap.updateTime?.toMillis() : undefined;
  });
  result['devices'] = devices.size;
  return result;
}

beforeEach(async () => {
  await clearFirestore();
});

describe('migrateLegacy on the seeded legacy data', () => {
  it('--dry-run writes nothing and reports what it would change', async () => {
    await seedLegacy();
    const before = await snapshotAll();

    const report = await migrateLegacy(db, { timeZone: IST, dryRun: true });

    expect(report).toEqual<MigrationReport>({
      dryRun: true,
      tasks: { updated: 1, unchanged: 0 },
      devices: { created: 1, existing: 0, skipped: 1 },
      notifications: { updated: 1, unchanged: 0, unparseable: 0 },
    });
    expect(await snapshotAll()).toEqual(before);
    expect((await db.doc('tasks/alice-task').get()).get('timeZone')).toBeUndefined();
    expect((await db.doc('notifications/n1').get()).get('createdAt')).toBeUndefined();
  });

  it('a real run fills the task, copies the token and dates the notification', async () => {
    await seedLegacy();

    const report = await migrateLegacy(db, { timeZone: IST, dryRun: false });

    expect(report).toEqual<MigrationReport>({
      dryRun: false,
      tasks: { updated: 1, unchanged: 0 },
      devices: { created: 1, existing: 0, skipped: 1 },
      notifications: { updated: 1, unchanged: 0, unparseable: 0 },
    });

    const taskDoc = await db.doc('tasks/alice-task').get();
    expect(taskDoc.get('timeZone')).toBe('Asia/Kolkata');
    expect((taskDoc.get('remindAt') as Timestamp).toDate().toISOString()).toBe(
      '2026-11-03T03:30:00.000Z',
    );
    expect(taskDoc.get('reminded')).toBe(false);
    // Fields the old app wrote stay as they were: readers accept them (spec §10).
    expect(taskDoc.get('date')).toBe('2026-11-03');
    expect(taskDoc.get('time')).toBe('09:00');

    const device = await db.doc('users/alice/devices/t1').get();
    expect(device.exists).toBe(true);
    expect(Object.keys(device.data() ?? {}).sort()).toEqual([
      'token',
      'uid',
      'updatedAt',
      'userAgent',
    ]);
    expect(device.data()).toMatchObject({ uid: 'alice', token: 't1' });
    expect(typeof device.get('userAgent')).toBe('string');
    expect(device.get('updatedAt')).toBeInstanceOf(Timestamp);
    expect((await db.collection('users/bob/devices').get()).empty).toBe(true);

    const notification = await db.doc('notifications/n1').get();
    // 3:30 PM in Asia/Kolkata (UTC+05:30) is 10:00 UTC.
    expect((notification.get('createdAt') as Timestamp).toDate().toISOString()).toBe(
      '2026-11-02T10:00:00.000Z',
    );
  });

  it('running it again changes nothing', async () => {
    await seedLegacy();
    await migrateLegacy(db, { timeZone: IST, dryRun: false });
    const before = await snapshotAll();

    const report = await migrateLegacy(db, { timeZone: IST, dryRun: false });

    expect(report).toEqual<MigrationReport>({
      dryRun: false,
      tasks: { updated: 0, unchanged: 1 },
      devices: { created: 0, existing: 1, skipped: 1 },
      notifications: { updated: 0, unchanged: 1, unparseable: 0 },
    });
    expect(await snapshotAll()).toEqual(before);
  });
});

describe('migrateLegacy on other legacy shapes', () => {
  it("gives 'NA', done and indefinite tasks remindAt null, and keeps fields already set", async () => {
    await db.doc('tasks/na').set({ uid: 'alice', title: 'a', date: 'NA', time: 'NA' });
    await db.doc('tasks/done').set({
      uid: 'alice',
      title: 'b',
      status: 'done',
      date: '2026-11-03',
      time: '09:00',
    });
    await db.doc('tasks/indefinite').set({
      uid: 'alice',
      title: 'c',
      indefinite: true,
      date: '2026-11-03',
      time: '09:00',
    });
    await db.doc('tasks/partial').set({
      uid: 'alice',
      title: 'd',
      status: 'todo',
      date: '2026-11-03',
      time: '09:00',
      timeZone: 'America/New_York',
      reminded: true,
    });

    const report = await migrateLegacy(db, { timeZone: IST, dryRun: false });

    expect(report.tasks).toEqual({ updated: 4, unchanged: 0 });
    for (const id of ['na', 'done', 'indefinite']) {
      const snap = await db.doc(`tasks/${id}`).get();
      expect(snap.get('remindAt')).toBeNull();
      expect(snap.get('timeZone')).toBe(IST);
      expect(snap.get('reminded')).toBe(false);
    }
    const partial = await db.doc('tasks/partial').get();
    expect(partial.get('timeZone')).toBe('America/New_York');
    expect(partial.get('reminded')).toBe(true);
    // 09:00 EST is 14:00 UTC, the due instant.
    expect((partial.get('remindAt') as Timestamp).toDate().toISOString()).toBe(
      '2026-11-03T14:00:00.000Z',
    );
  });

  it('skips tokens that are missing, empty, not strings or not valid document ids', async () => {
    await db.doc('fcm/u1').set({ token: '' });
    await db.doc('fcm/u2').set({ token: 'a/b' });
    await db.doc('fcm/u3').set({ token: 42 });
    await db.doc('fcm/u4').set({});
    await db.doc('fcm/u5').set({ token: '__reserved__' });

    const report = await migrateLegacy(db, { timeZone: IST, dryRun: false });

    expect(report.devices).toEqual({ created: 0, existing: 0, skipped: 5 });
    expect((await db.collectionGroup('devices').get()).empty).toBe(true);
  });

  it('dates an unreadable or missing notification timestamp at epoch 0, so lists still show it', async () => {
    await db.doc('notifications/garbage').set({ uid: 'alice', timestamp: 'yesterday-ish' });
    await db.doc('notifications/missing').set({ uid: 'alice' });
    const createdAt = Timestamp.fromDate(new Date('2026-11-02T10:00:00Z'));
    await db.doc('notifications/new').set({ uid: 'alice', createdAt });

    const report = await migrateLegacy(db, { timeZone: IST, dryRun: false });

    expect(report.notifications).toEqual({ updated: 2, unchanged: 1, unparseable: 2 });
    for (const id of ['garbage', 'missing']) {
      const value = (await db.doc(`notifications/${id}`).get()).get('createdAt') as Timestamp;
      expect(value.toMillis()).toBe(0);
    }
    const kept = (await db.doc('notifications/new').get()).get('createdAt') as Timestamp;
    expect(kept.isEqual(createdAt)).toBe(true);
  });

  it('commits more documents than one batch holds', async () => {
    const writes = Array.from({ length: 620 }, (_, i) =>
      db.doc(`tasks/bulk-${i}`).set({ uid: 'alice', title: 't', date: 'NA', time: 'NA' }),
    );
    await Promise.all(writes);

    const report = await migrateLegacy(db, { timeZone: IST, dryRun: false });

    expect(report.tasks).toEqual({ updated: 620, unchanged: 0 });
    const missing = await db.collection('tasks').where('reminded', '==', false).count().get();
    expect(missing.data().count).toBe(620);
  });
});

describe('legacyRemindAt', () => {
  it('is the local date and time, the due instant, as UTC', () => {
    const at = legacyRemindAt({ date: '2026-11-02', time: '09:00', status: 'todo' }, IST);
    expect(at?.toISOString()).toBe('2026-11-02T03:30:00.000Z');
  });

  it('follows daylight saving time', () => {
    const at = legacyRemindAt({ date: '2026-03-08', time: '09:00' }, 'America/New_York');
    expect(at?.toISOString()).toBe('2026-03-08T13:00:00.000Z');
  });

  it.each([
    { date: '2026-02-30', time: '09:00' },
    { date: '2026-11-02', time: '24:00' },
    { date: '2026-11-02', time: '9:00' },
    { date: '2026-11-02', time: null },
    { date: 20261102, time: '09:00' },
  ])('is null for an invalid date or time: %o', (fields) => {
    expect(legacyRemindAt(fields, IST)).toBeNull();
  });
});

describe('parseLegacyTimestamp', () => {
  it.each([
    ['11/2/2026, 3:30:00 PM', '2026-11-02T10:00:00.000Z'],
    ['11/2/2026, 12:05:00 AM', '2026-11-01T18:35:00.000Z'],
    ['11/2/2026, 12:05:00 PM', '2026-11-02T06:35:00.000Z'],
    ['11/2/2026, 3:30:00 PM', '2026-11-02T10:00:00.000Z'],
    ['11/2/2026, 15:30:00', '2026-11-02T10:00:00.000Z'],
  ])('reads %s as wall time in Asia/Kolkata', (text, iso) => {
    expect(parseLegacyTimestamp(text, IST)?.toISOString()).toBe(iso);
  });

  it.each([['13/2/2026, 3:30:00 PM'], ['11/2/2026, 13:30:00 PM'], ['nonsense'], [42], [null]])(
    'is null for %o',
    (value) => {
      expect(parseLegacyTimestamp(value, IST)).toBeNull();
    },
  );

  it('rejects an overlong string without reading it', () => {
    expect(parseLegacyTimestamp(`11/2/2026, 3:30:00 PM${' '.repeat(10_000)}`, IST)).toBeNull();
  });
});

describe('parseArgs', () => {
  it('reads --tz and --dry-run', () => {
    expect(parseArgs(['--tz', 'Asia/Kolkata', '--dry-run'])).toEqual({
      timeZone: 'Asia/Kolkata',
      dryRun: true,
    });
    expect(parseArgs(['--tz', 'Asia/Kolkata'])).toEqual({
      timeZone: 'Asia/Kolkata',
      dryRun: false,
    });
  });

  it.each([[[]], [['--tz']], [['--tz', 'Mars/Olympus']], [['--tz', IST, '--force']]])(
    'refuses %o',
    (argv) => {
      expect(() => parseArgs(argv)).toThrow(/usage/i);
    },
  );
});
