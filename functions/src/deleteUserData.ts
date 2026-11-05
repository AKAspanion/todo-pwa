/**
 * Account deletion, server half (spec D6): when Firebase Auth deletes a user, the Admin SDK erases
 * every document that is theirs: their tasks, labels (`types`) and notifications, their devices
 * under `users/{uid}/devices`, `users/{uid}` itself and the old app's `fcm/{uid}`.
 *
 * Deletes are committed in batches of {@link DELETE_BATCH}, so a run that fails part-way leaves
 * only what it hadn't reached; the platform retries the trigger, and a later run deletes the rest.
 * A run with nothing left to delete succeeds, deleting nothing.
 */
import {
  getFirestore,
  type DocumentReference,
  type Firestore,
  type Query,
} from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { runWith, type CloudFunction } from 'firebase-functions/v1';
import type { UserRecord } from 'firebase-functions/v1/auth';

/** Deletes per batch commit: Firestore's limit on writes in one batch (D6). */
export const DELETE_BATCH = 500;

/** The collections whose documents carry their owner in a `uid` field. */
const OWNED_COLLECTIONS = ['tasks', 'types', 'notifications'] as const;

/**
 * A Firebase Auth uid usable as a document id: at most 128 characters, no `/`, not reserved. A uid
 * with a `/` would name a path, `users/{uid}` reaching into someone else's documents.
 */
function isOwnerId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[^/]{1,128}$/.test(value) &&
    value !== '.' &&
    value !== '..' &&
    !/^__.*__$/.test(value)
  );
}

/** The error's code (`unavailable`, or a gRPC status number) or class name: what a log may say. */
function errorCode(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    if (typeof err.code === 'string') return err.code;
    if (typeof err.code === 'number') return String(err.code);
  }
  return err instanceof Error ? err.name : 'unknown';
}

/** Deletes every document `query` matches, a batch at a time. Returns how many it deleted. */
async function deleteMatching(db: Firestore, query: Query): Promise<number> {
  const page = query.select().limit(DELETE_BATCH);
  let deleted = 0;
  for (;;) {
    const snap = await page.get();
    if (snap.empty) return deleted;
    const batch = db.batch();
    for (const doc of snap.docs) batch.delete(doc.ref);
    await batch.commit();
    deleted += snap.size;
    if (snap.size < DELETE_BATCH) return deleted;
  }
}

/** Deletes those of `refs` that exist, in one batch. Returns how many it deleted. */
async function deleteExisting(db: Firestore, refs: DocumentReference[]): Promise<number> {
  const existing = (await db.getAll(...refs)).filter((snap) => snap.exists);
  if (existing.length === 0) return 0;
  const batch = db.batch();
  for (const snap of existing) batch.delete(snap.ref);
  await batch.commit();
  return existing.length;
}

/**
 * D6: deletes every document of `uid` in tasks, types, notifications, users/{uid}/devices,
 * users/{uid} and fcm/{uid}, in batches of DELETE_BATCH. Returns how many it deleted.
 * Rejects with `user/invalid-uid`, deleting nothing, when `uid` can't be a document id.
 */
export async function deleteUserDocuments(db: Firestore, uid: string): Promise<number> {
  if (!isOwnerId(uid)) {
    throw Object.assign(new Error('The uid is not a valid document id.'), {
      code: 'user/invalid-uid',
    });
  }
  const user = db.collection('users').doc(uid);
  let deleted = 0;
  for (const name of OWNED_COLLECTIONS) {
    deleted += await deleteMatching(db, db.collection(name).where('uid', '==', uid));
  }
  deleted += await deleteMatching(db, user.collection('devices'));
  deleted += await deleteExisting(db, [user, db.collection('fcm').doc(uid)]);
  return deleted;
}

/**
 * D6: Firebase Auth user-deletion trigger, firebase-functions/v1 (v2 has no Auth deletion event),
 * runWith({ failurePolicy: true }) so the platform retries a failure. It takes the uid only from
 * the event, and logs a failure by its code, never its message or the uid.
 */
export const deleteUserData: CloudFunction<UserRecord> = runWith({ failurePolicy: true })
  .auth.user()
  .onDelete(async (user) => {
    try {
      const deleted = await deleteUserDocuments(getFirestore(), user.uid);
      logger.info('deleteUserData: deleted', { deleted });
    } catch (err) {
      logger.error('deleteUserData: failed', { code: errorCode(err) });
      throw err;
    }
  });
