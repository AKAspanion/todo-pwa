/**
 * Account deletion's server half (spec D6) against the Firestore emulator.
 * `npm --prefix functions run test` starts the emulator and sets FIRESTORE_EMULATOR_HOST.
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore, type WriteBatch } from 'firebase-admin/firestore';
import type { UserRecord } from 'firebase-functions/v1/auth';
import * as logger from 'firebase-functions/logger';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE_BATCH, deleteUserData, deleteUserDocuments } from './deleteUserData';

vi.mock('firebase-functions/logger', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  write: vi.fn(),
}));

// The trigger reads the default app's Firestore; its tests hand it the emulator's, or a fake.
vi.mock('firebase-admin/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase-admin/firestore')>();
  return { ...actual, getFirestore: vi.fn(actual.getFirestore) };
});

const projectId = 'demo-todo';
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
if (!emulatorHost) {
  throw new Error(
    'FIRESTORE_EMULATOR_HOST is not set: run these tests with `npm --prefix functions run test`.',
  );
}

const app = initializeApp({ projectId }, 'delete-user-data-test');
const db = getFirestore(app);

async function clearFirestore(): Promise<void> {
  const url = `http://${emulatorHost}/emulator/v1/projects/${projectId}/databases/(default)/documents`;
  const response = await fetch(url, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Clearing the Firestore emulator failed: ${response.status}`);
}

interface Holdings {
  tasks: number;
  types: number;
  notifications: number;
  devices: number;
}

/** Seeds `uid`'s documents, plus users/{uid} and fcm/{uid}, as the web app writes them. */
async function seedUser(uid: string, holdings: Holdings): Promise<void> {
  const writes: Array<(batch: WriteBatch) => void> = [];
  for (let i = 0; i < holdings.tasks; i++) {
    writes.push((b) => b.set(db.collection('tasks').doc(`${uid}-task-${i}`), { uid, title: 't' }));
  }
  for (let i = 0; i < holdings.types; i++) {
    writes.push((b) => b.set(db.collection('types').doc(`${uid}-type-${i}`), { uid, name: 'n' }));
  }
  for (let i = 0; i < holdings.notifications; i++) {
    writes.push((b) =>
      b.set(db.collection('notifications').doc(`${uid}-note-${i}`), { uid, title: 't' }),
    );
  }
  for (let i = 0; i < holdings.devices; i++) {
    writes.push((b) =>
      b.set(db.collection('users').doc(uid).collection('devices').doc(`${uid}-tok-${i}`), {
        uid,
        token: `${uid}-tok-${i}`,
      }),
    );
  }
  writes.push((b) => b.set(db.collection('users').doc(uid), { uid }));
  writes.push((b) => b.set(db.collection('fcm').doc(uid), { token: `${uid}-legacy` }));

  for (let start = 0; start < writes.length; start += DELETE_BATCH) {
    const batch = db.batch();
    for (const write of writes.slice(start, start + DELETE_BATCH)) write(batch);
    await batch.commit();
  }
}

/** How many of `uid`'s documents exist, in every place D6 deletes from. */
async function countDocuments(uid: string): Promise<number> {
  const counts = await Promise.all([
    ...['tasks', 'types', 'notifications'].map(async (name) => {
      const snap = await db.collection(name).where('uid', '==', uid).count().get();
      return snap.data().count;
    }),
    db
      .collection('users')
      .doc(uid)
      .collection('devices')
      .count()
      .get()
      .then((snap) => snap.data().count),
    db
      .collection('users')
      .doc(uid)
      .get()
      .then((snap) => (snap.exists ? 1 : 0)),
    db
      .collection('fcm')
      .doc(uid)
      .get()
      .then((snap) => (snap.exists ? 1 : 0)),
  ]);
  return counts.reduce((sum, n) => sum + n, 0);
}

const ALICE: Holdings = { tasks: 501, types: 2, notifications: 2, devices: 2 };
// 501 + 2 + 2 + 2, plus users/alice and fcm/alice.
const ALICE_TOTAL = 509;
const BOB: Holdings = { tasks: 3, types: 1, notifications: 1, devices: 1 };
const BOB_TOTAL = 8;

/** A Firestore error as the client raises it: the code is what a log may name. */
function firestoreError(code: string | number): Error {
  return Object.assign(new Error('14 UNAVAILABLE: secret-detail for alice@example.com'), { code });
}

/** The emulator's Firestore, but the `failOn`th batch commit (1-based, or every one) rejects. */
function failingCommits(failOn: number | 'every', error: Error): Firestore {
  let commits = 0;
  return new Proxy(db, {
    get(target, prop) {
      if (prop === 'batch') {
        return () => {
          const batch = target.batch();
          const commit = batch.commit.bind(batch);
          batch.commit = () => {
            commits += 1;
            return failOn === 'every' || commits === failOn ? Promise.reject(error) : commit();
          };
          return batch;
        };
      }
      const value: unknown = Reflect.get(target, prop, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

function deletedUser(uid: string): UserRecord {
  return { uid } as UserRecord;
}

/** Everything the logger was given, as text, to check that no message or uid leaked into it. */
function loggedText(): string {
  return JSON.stringify(
    [logger.debug, logger.info, logger.log, logger.warn, logger.error].map(
      (fn) => vi.mocked(fn).mock.calls,
    ),
  );
}

beforeEach(async () => {
  vi.clearAllMocks();
  await clearFirestore();
});

describe('deleteUserDocuments (D6)', () => {
  it("deletes every one of alice's documents across batches and none of bob's", async () => {
    await seedUser('alice', ALICE);
    await seedUser('bob', BOB);
    expect(await countDocuments('alice')).toBe(ALICE_TOTAL);
    expect(await countDocuments('bob')).toBe(BOB_TOTAL);

    const deleted = await deleteUserDocuments(db, 'alice');

    expect(deleted).toBe(ALICE_TOTAL);
    expect(await countDocuments('alice')).toBe(0);
    expect(await countDocuments('bob')).toBe(BOB_TOTAL);
  });

  it('deletes nothing more when run again for the same uid, and succeeds', async () => {
    await seedUser('alice', ALICE);
    await deleteUserDocuments(db, 'alice');

    await expect(deleteUserDocuments(db, 'alice')).resolves.toBe(0);
  });

  it('resolves to 0 for a uid with no documents', async () => {
    await seedUser('bob', BOB);

    await expect(deleteUserDocuments(db, 'carol')).resolves.toBe(0);
    expect(await countDocuments('bob')).toBe(BOB_TOTAL);
  });

  it('leaves the rest when stopped after its first batch, and a second run deletes the rest', async () => {
    await seedUser('alice', ALICE);
    await seedUser('bob', BOB);

    await expect(
      deleteUserDocuments(failingCommits(2, firestoreError('unavailable')), 'alice'),
    ).rejects.toMatchObject({ code: 'unavailable' });
    expect(await countDocuments('alice')).toBe(ALICE_TOTAL - DELETE_BATCH);

    await expect(deleteUserDocuments(db, 'alice')).resolves.toBe(ALICE_TOTAL - DELETE_BATCH);
    expect(await countDocuments('alice')).toBe(0);
    expect(await countDocuments('bob')).toBe(BOB_TOTAL);
  });

  // A uid becomes a document path: `alice/devices/alice-tok-0` would reach into alice's devices.
  it.each(['', 'alice/devices/alice-tok-0', '..', '__alice__', 'x'.repeat(129)])(
    'rejects the uid %j without deleting anything',
    async (uid) => {
      await seedUser('alice', ALICE);

      await expect(deleteUserDocuments(db, uid)).rejects.toMatchObject({
        code: 'user/invalid-uid',
      });
      expect(await countDocuments('alice')).toBe(ALICE_TOTAL);
    },
  );
});

describe('deleteUserData trigger (D6)', () => {
  it("deletes the deleted user's documents, taking the uid from the event", async () => {
    await seedUser('alice', { tasks: 2, types: 1, notifications: 1, devices: 1 });
    await seedUser('bob', BOB);
    vi.mocked(getFirestore).mockReturnValueOnce(db);

    await deleteUserData.run(deletedUser('alice'), {});

    expect(await countDocuments('alice')).toBe(0);
    expect(await countDocuments('bob')).toBe(BOB_TOTAL);
    expect(loggedText()).not.toContain('alice');
  });

  // Ruling: an invalid uid can never succeed, so it is logged once and not retried.
  it('logs an invalid uid by its code alone and resolves, deleting nothing', async () => {
    await seedUser('alice', ALICE);
    vi.mocked(getFirestore).mockReturnValueOnce(db);

    await expect(deleteUserData.run(deletedUser('alice/devices/x'), {})).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith('deleteUserData: failed', {
      code: 'user/invalid-uid',
    });
    expect(loggedText()).not.toContain('alice');
    expect(loggedText()).not.toContain('not a valid document id');
    expect(await countDocuments('alice')).toBe(ALICE_TOTAL);
  });

  it('logs a failed commit by its code alone, and rejects so the platform retries', async () => {
    await seedUser('alice', { tasks: 1, types: 0, notifications: 0, devices: 0 });
    const error = firestoreError('unavailable');
    vi.mocked(getFirestore).mockReturnValueOnce(failingCommits('every', error));

    await expect(deleteUserData.run(deletedUser('alice'), {})).rejects.toBe(error);

    expect(logger.error).toHaveBeenCalledWith('deleteUserData: failed', { code: 'unavailable' });
    expect(loggedText()).not.toContain('secret-detail');
    expect(loggedText()).not.toContain('alice');
  });

  it('logs the gRPC status number of a Firestore client error, which carries a numeric code', async () => {
    await seedUser('alice', { tasks: 1, types: 0, notifications: 0, devices: 0 });
    vi.mocked(getFirestore).mockReturnValueOnce(failingCommits('every', firestoreError(14)));

    await expect(deleteUserData.run(deletedUser('alice'), {})).rejects.toMatchObject({ code: 14 });

    expect(logger.error).toHaveBeenCalledWith('deleteUserData: failed', { code: '14' });
    expect(loggedText()).not.toContain('secret-detail');
  });
});
