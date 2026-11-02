/**
 * Push reminders (spec P5, P3, S1, S4): every 5 minutes, find the tasks due in the coming hour
 * (`remindAt`, the due instant, in `(now, now + 60 min]`), send one FCM HTTP v1 message to each of
 * the owner's devices, leave a notification document and mark the task reminded. One task's or one
 * device's failure never stops the others.
 */
import {
  FieldValue,
  Timestamp,
  getFirestore,
  type DocumentReference,
  type Firestore,
  type QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import { getMessaging, type Messaging, type TokenMessage } from 'firebase-admin/messaging';
import * as logger from 'firebase-functions/logger';
import { defineString } from 'firebase-functions/params';
import { onSchedule, type ScheduleFunction } from 'firebase-functions/v2/scheduler';
import { REMINDER_TITLE, clipTitle, dueWindow, reminderBody } from './dueTasks';

export interface ReminderRunResult {
  /** Messages FCM accepted. */
  sent: number;
  /** Tasks left `reminded: false` for the next run, because no device could be reached. */
  failed: number;
  /** Device documents deleted because FCM reported their token dead. */
  removedTokens: number;
}

/** The live site's primary address, used when `APP_URL` isn't set. */
const DEFAULT_APP_URL = 'https://todo.spanion.in';

/**
 * The web app's address (`functions/.env`, see `functions/.env.example`). The CLI resolves it at
 * deploy time; read it with `.value()` only while a function runs.
 */
const APP_URL = defineString('APP_URL', {
  default: DEFAULT_APP_URL,
  description: "The web app's address. Reminder notifications show its icon.",
});

/** The web push icon: the app's own icon, which the site serves from public/. */
function notificationIconUrl(): string {
  const appUrl = (APP_URL.value() || DEFAULT_APP_URL).replace(/\/+$/, '');
  return `${appUrl}/img/icons/android-chrome-192x192.png`;
}

/** FCM codes meaning a token will never work again, so its device document is deleted (P3). */
const DEAD_TOKEN_CODES: ReadonlySet<string> = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

/** A Firebase Auth uid usable as a document id: at most 128 characters, no `/`, not reserved. */
function isOwnerId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[^/]{1,128}$/.test(value) &&
    value !== '.' &&
    value !== '..' &&
    !/^__.*__$/.test(value)
  );
}

/** The error's code (`messaging/...`) or class name: what a log may say about a failure. */
function errorCode(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'code' in err && typeof err.code === 'string') {
    return err.code;
  }
  return err instanceof Error ? err.name : 'unknown';
}

function reminderMessage(token: string, taskId: string, body: string): TokenMessage {
  return {
    token,
    notification: { title: REMINDER_TITLE, body },
    data: { taskId },
    webpush: { notification: { icon: notificationIconUrl() } },
  };
}

const FAILED_TASK: ReminderRunResult = { sent: 0, failed: 1, removedTokens: 0 };

/** Deletes dead device documents; a failed delete is logged, and the next run tries again. */
async function removeDevices(devices: DocumentReference[], taskId: string): Promise<number> {
  const results = await Promise.allSettled(devices.map((device) => device.delete()));
  let removed = 0;
  for (const result of results) {
    if (result.status === 'fulfilled') {
      removed += 1;
    } else {
      logger.error('reminders: dead device not deleted', {
        taskId,
        code: errorCode(result.reason),
      });
    }
  }
  return removed;
}

async function remindTask(
  db: Firestore,
  messaging: Messaging,
  task: QueryDocumentSnapshot,
): Promise<ReminderRunResult> {
  const data = task.data();
  const uid: unknown = data.uid;
  // Tokens come only from the owner's own path, so a task can't reach another user's device (S4).
  if (!isOwnerId(uid)) {
    logger.warn('reminders: task has no valid owner', { taskId: task.id });
    return FAILED_TASK;
  }

  const devices = await db.collection('users').doc(uid).collection('devices').get();
  if (devices.empty) {
    await task.ref.update({ reminded: true });
    return { sent: 0, failed: 0, removedTokens: 0 };
  }

  const title = clipTitle(typeof data.title === 'string' ? data.title : '');
  const time = typeof data.time === 'string' ? data.time : '';
  const body = reminderBody(title, time);

  // `async` turns a synchronous throw from `send` into a rejection, so it can't skip the others.
  const results = await Promise.allSettled(
    devices.docs.map(async (device) => messaging.send(reminderMessage(device.id, task.id, body))),
  );

  let sent = 0;
  let retryable = 0;
  const dead: DocumentReference[] = [];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      sent += 1;
      return;
    }
    const code = errorCode(result.reason);
    const device = devices.docs[i];
    if (DEAD_TOKEN_CODES.has(code) && device) {
      dead.push(device.ref);
    } else {
      retryable += 1;
      logger.warn('reminders: send failed', { taskId: task.id, code });
    }
  });
  const removedTokens = await removeDevices(dead, task.id);

  // Nobody got it but a device may still: leave the task for the next run.
  if (sent === 0 && retryable > 0) return { sent: 0, failed: 1, removedTokens };

  const batch = db.batch();
  if (sent > 0) {
    batch.create(db.collection('notifications').doc(), {
      uid,
      taskId: task.id,
      title: REMINDER_TITLE,
      body,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  batch.update(task.ref, { reminded: true });
  await batch.commit();
  return { sent, failed: 0, removedTokens };
}

/**
 * Sends the reminders due in {@link dueWindow}`(now)`. Each task is handled on its own: a failure
 * is logged, counted in `failed`, and the task keeps `reminded: false` so the next run tries again.
 */
export async function runReminders(
  db: Firestore,
  messaging: Messaging,
  now: Date,
): Promise<ReminderRunResult> {
  const { from, to } = dueWindow(now);
  // Served by the `tasks(reminded ASC, remindAt ASC)` index. Done and indefinite tasks have
  // `remindAt: null`, which no range matches, so they are never read.
  const due = await db
    .collection('tasks')
    .where('reminded', '==', false)
    .where('remindAt', '>', Timestamp.fromDate(from))
    .where('remindAt', '<=', Timestamp.fromDate(to))
    .get();

  const outcomes = await Promise.all(
    due.docs.map((task) =>
      remindTask(db, messaging, task).catch((err: unknown) => {
        logger.error('reminders: task failed', { taskId: task.id, code: errorCode(err) });
        return FAILED_TASK;
      }),
    ),
  );

  return outcomes.reduce<ReminderRunResult>(
    (total, outcome) => ({
      sent: total.sent + outcome.sent,
      failed: total.failed + outcome.failed,
      removedTokens: total.removedTokens + outcome.removedTokens,
    }),
    { sent: 0, failed: 0, removedTokens: 0 },
  );
}

/** The deployed schedule. firebase-admin gives each FCM call its own 15-second deadline. */
export const sendReminders: ScheduleFunction = onSchedule(
  { schedule: 'every 5 minutes', timeZone: 'UTC' },
  async () => {
    const result = await runReminders(getFirestore(), getMessaging(), new Date());
    logger.info('reminders: run finished', result);
  },
);
