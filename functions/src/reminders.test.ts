/**
 * The reminder run (spec P5, P3) against the Firestore emulator, with FCM faked.
 * `npm --prefix functions run test` starts the emulator and sets FIRESTORE_EMULATOR_HOST.
 */
import { initializeApp } from 'firebase-admin/app';
import { Timestamp, getFirestore, type DocumentData } from 'firebase-admin/firestore';
import type { Message, Messaging, TokenMessage } from 'firebase-admin/messaging';
import * as logger from 'firebase-functions/logger';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reminderBody } from './dueTasks';
import { DEFAULT_REMINDER_LIMITS, runReminders } from './reminders';

vi.mock('firebase-functions/logger', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  write: vi.fn(),
}));

const projectId = 'demo-todo';
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
if (!emulatorHost) {
  throw new Error(
    'FIRESTORE_EMULATOR_HOST is not set: run these tests with `npm --prefix functions run test`.',
  );
}

const app = initializeApp({ projectId }, 'reminders-test');
const db = getFirestore(app);

const NOW = new Date('2026-11-02T03:00:00Z');

async function clearFirestore(): Promise<void> {
  const url = `http://${emulatorHost}/emulator/v1/projects/${projectId}/databases/(default)/documents`;
  const response = await fetch(url, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Clearing the Firestore emulator failed: ${response.status}`);
}

/** A dated, not-done task as the new client writes it, reminding at `remindAt`. */
function task(uid: string, remindAt: string, overrides: DocumentData = {}): DocumentData {
  return {
    uid,
    title: 'Buy milk',
    description: '',
    status: 'todo',
    indefinite: false,
    date: '2026-11-02',
    time: '09:00',
    timeZone: 'Asia/Kolkata',
    remindAt: Timestamp.fromDate(new Date(remindAt)),
    reminded: false,
    labelIds: [],
    ...overrides,
  };
}

async function addTask(id: string, data: DocumentData): Promise<void> {
  await db.collection('tasks').doc(id).set(data);
}

async function addDevice(uid: string, token: string): Promise<void> {
  await db
    .collection('users')
    .doc(uid)
    .collection('devices')
    .doc(token)
    .set({ uid, token, userAgent: 'vitest', updatedAt: Timestamp.now() });
}

async function isReminded(id: string): Promise<unknown> {
  return (await db.collection('tasks').doc(id).get()).get('reminded');
}

async function notificationsFor(taskId: string): Promise<DocumentData[]> {
  const snap = await db.collection('notifications').where('taskId', '==', taskId).get();
  return snap.docs.map((doc) => doc.data());
}

/** An FCM error as firebase-admin raises it: the code is what callers branch on. */
function fcmError(code: string): Error {
  return Object.assign(new Error(`FCM failed: ${code}`), { code });
}

/**
 * A stand-in for FCM's `send`. `behaviour` decides each message's fate; it may throw synchronously,
 * as a misbehaving client could.
 */
type SendBehaviour = (message: TokenMessage) => Promise<string> | string;

function fakeMessaging(behaviour: SendBehaviour = () => 'ok') {
  const send = vi.fn((message: Message) => behaviour(message as TokenMessage));
  const messaging = { send } as unknown as Messaging;
  const sentTokens = () => send.mock.calls.map(([message]) => (message as TokenMessage).token);
  const sentTaskIds = () =>
    send.mock.calls.map(([message]) => (message as TokenMessage).data?.taskId);
  return { messaging, send, sentTokens, sentTaskIds };
}

beforeEach(async () => {
  vi.clearAllMocks();
  await clearFirestore();
});

describe('runReminders: the due window', () => {
  it('sends remindAt in (now, now + 60 min]: 03:00:00 no, 03:00:30 yes, 04:00:00 yes, 04:00:01 no', async () => {
    await addDevice('alice', 'tok-alice');
    await addTask('at-0300', task('alice', '2026-11-02T03:00:00Z'));
    await addTask('at-030030', task('alice', '2026-11-02T03:00:30Z'));
    await addTask('at-0400', task('alice', '2026-11-02T04:00:00Z'));
    await addTask('at-040001', task('alice', '2026-11-02T04:00:01Z'));
    const fcm = fakeMessaging();

    const result = await runReminders(db, fcm.messaging, NOW);

    expect(fcm.sentTaskIds().sort()).toEqual(['at-030030', 'at-0400']);
    expect(result).toEqual({ sent: 2, failed: 0, removedTokens: 0 });
    expect(await isReminded('at-0300')).toBe(false);
    expect(await isReminded('at-030030')).toBe(true);
    expect(await isReminded('at-0400')).toBe(true);
    expect(await isReminded('at-040001')).toBe(false);
  });

  it('sends a task due later within the current minute', async () => {
    await addDevice('alice', 'tok-alice');
    await addTask('this-minute', task('alice', '2026-11-02T03:00:59Z'));
    const fcm = fakeMessaging();

    const result = await runReminders(db, fcm.messaging, new Date('2026-11-02T03:00:45Z'));

    expect(fcm.sentTaskIds()).toEqual(['this-minute']);
    expect(result.sent).toBe(1);
  });

  it('never reads done or indefinite tasks (remindAt null), nor tasks already reminded', async () => {
    await addDevice('alice', 'tok-alice');
    await addTask(
      'done',
      task('alice', '2026-11-02T03:30:00Z', { status: 'done', remindAt: null }),
    );
    await addTask(
      'indefinite',
      task('alice', '2026-11-02T03:30:00Z', {
        indefinite: true,
        date: null,
        time: null,
        remindAt: null,
      }),
    );
    await addTask('already', task('alice', '2026-11-02T03:30:00Z', { reminded: true }));
    const before = await db.getAll(
      db.doc('tasks/done'),
      db.doc('tasks/indefinite'),
      db.doc('tasks/already'),
    );
    const fcm = fakeMessaging();

    const result = await runReminders(db, fcm.messaging, NOW);

    expect(fcm.send).not.toHaveBeenCalled();
    expect(result).toEqual({ sent: 0, failed: 0, removedTokens: 0 });
    const after = await db.getAll(
      db.doc('tasks/done'),
      db.doc('tasks/indefinite'),
      db.doc('tasks/already'),
    );
    expect(after.map((snap) => snap.updateTime?.toMillis())).toEqual(
      before.map((snap) => snap.updateTime?.toMillis()),
    );
  });
});

describe('runReminders: sending', () => {
  it("sends to each of the owner's devices, writes one notification, marks the task reminded", async () => {
    await addDevice('alice', 'tok-alice-phone');
    await addDevice('alice', 'tok-alice-laptop');
    await addDevice('bob', 'tok-bob');
    await addTask('milk', task('alice', '2026-11-02T03:30:00Z'));
    const fcm = fakeMessaging();

    const result = await runReminders(db, fcm.messaging, NOW);

    expect(result).toEqual({ sent: 2, failed: 0, removedTokens: 0 });
    expect(fcm.sentTokens().sort()).toEqual(['tok-alice-laptop', 'tok-alice-phone']);
    const message = fcm.send.mock.calls[0]?.[0] as TokenMessage;
    expect(message.notification).toEqual({
      title: 'Task reminder',
      body: 'Upcoming task "Buy milk" at 09:00',
    });
    expect(message.data).toEqual({ taskId: 'milk' });

    const notifications = await notificationsFor('milk');
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      uid: 'alice',
      taskId: 'milk',
      title: 'Task reminder',
      body: 'Upcoming task "Buy milk" at 09:00',
    });
    expect(notifications[0]?.createdAt).toBeInstanceOf(Timestamp);
    expect(await isReminded('milk')).toBe(true);
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('sends nothing on a second run', async () => {
    await addDevice('alice', 'tok-alice-phone');
    await addDevice('alice', 'tok-alice-laptop');
    await addTask('milk', task('alice', '2026-11-02T03:30:00Z'));
    const fcm = fakeMessaging();
    await runReminders(db, fcm.messaging, NOW);

    const second = await runReminders(db, fcm.messaging, new Date('2026-11-02T03:05:00Z'));

    expect(second).toEqual({ sent: 0, failed: 0, removedTokens: 0 });
    expect(fcm.send).toHaveBeenCalledTimes(2);
    expect(await notificationsFor('milk')).toHaveLength(1);
  });

  it('marks a task with no devices reminded without sending or writing a notification', async () => {
    await addTask('lonely', task('carol', '2026-11-02T03:30:00Z'));
    const fcm = fakeMessaging();

    const result = await runReminders(db, fcm.messaging, NOW);

    expect(result).toEqual({ sent: 0, failed: 0, removedTokens: 0 });
    expect(fcm.send).not.toHaveBeenCalled();
    expect(await isReminded('lonely')).toBe(true);
    expect(await notificationsFor('lonely')).toHaveLength(0);
  });

  it('caps a long legacy title at 200 characters in the message', async () => {
    await addDevice('alice', 'tok-alice');
    await addTask('long', task('alice', '2026-11-02T03:30:00Z', { title: 'x'.repeat(1000) }));
    const fcm = fakeMessaging();

    await runReminders(db, fcm.messaging, NOW);

    const message = fcm.send.mock.calls[0]?.[0] as TokenMessage;
    expect(message.notification?.body).toBe(reminderBody(`${'x'.repeat(199)}…`, '09:00'));
  });

  it.each([
    ['https://todo.example', 'https://todo.example/img/icons/android-chrome-192x192.png'],
    ['https://todo.example/', 'https://todo.example/img/icons/android-chrome-192x192.png'],
    ['', 'https://todo.spanion.in/img/icons/android-chrome-192x192.png'],
  ])('with APP_URL=%j, the web push icon is %s', async (appUrl, icon) => {
    vi.stubEnv('APP_URL', appUrl);
    try {
      await addDevice('alice', 'tok-alice');
      await addTask('milk', task('alice', '2026-11-02T03:30:00Z'));
      const fcm = fakeMessaging();

      await runReminders(db, fcm.messaging, NOW);

      const message = fcm.send.mock.calls[0]?.[0] as TokenMessage;
      expect(message.webpush?.notification?.icon).toBe(icon);
      // The service worker routes a click itself (src/sw.ts), so the message carries no link.
      expect(message.webpush?.fcmOptions?.link).toBeUndefined();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe('runReminders: failures', () => {
  it.each(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'])(
    'deletes the device FCM rejects with %s, still sends to the other, still marks the task',
    async (code) => {
      await addDevice('alice', 'tok-dead');
      await addDevice('alice', 'tok-live');
      await addTask('milk', task('alice', '2026-11-02T03:30:00Z'));
      const fcm = fakeMessaging(async (message) => {
        if (message.token === 'tok-dead') throw fcmError(code);
        return 'ok';
      });

      const result = await runReminders(db, fcm.messaging, NOW);

      expect(result).toEqual({ sent: 1, failed: 0, removedTokens: 1 });
      expect(fcm.sentTokens().sort()).toEqual(['tok-dead', 'tok-live']);
      expect((await db.doc('users/alice/devices/tok-dead').get()).exists).toBe(false);
      expect((await db.doc('users/alice/devices/tok-live').get()).exists).toBe(true);
      expect(await isReminded('milk')).toBe(true);
      expect(await notificationsFor('milk')).toHaveLength(1);
    },
  );

  it('keeps a device whose send fails for another reason', async () => {
    await addDevice('alice', 'tok-flaky');
    await addDevice('alice', 'tok-live');
    await addTask('milk', task('alice', '2026-11-02T03:30:00Z'));
    const fcm = fakeMessaging(async (message) => {
      if (message.token === 'tok-flaky') throw fcmError('messaging/server-unavailable');
      return 'ok';
    });

    const result = await runReminders(db, fcm.messaging, NOW);

    expect(result).toEqual({ sent: 1, failed: 0, removedTokens: 0 });
    expect((await db.doc('users/alice/devices/tok-flaky').get()).exists).toBe(true);
    expect(await isReminded('milk')).toBe(true);
    expect(logger.warn).toHaveBeenCalledWith('reminders: send failed', {
      taskId: 'milk',
      code: 'messaging/server-unavailable',
    });
  });

  it('still sends task B when send throws for task A; A stays unreminded for the next run', async () => {
    await addDevice('alice', 'tok-alice-secret');
    await addDevice('bob', 'tok-bob');
    await addTask('task-a', task('alice', '2026-11-02T03:30:00Z'));
    await addTask('task-b', task('bob', '2026-11-02T03:40:00Z'));
    const fcm = fakeMessaging((message) => {
      // A synchronous throw, the harshest way a send can fail.
      if (message.token === 'tok-alice-secret') throw fcmError('messaging/internal-error');
      return 'ok';
    });

    const result = await runReminders(db, fcm.messaging, NOW);

    expect(result).toEqual({ sent: 1, failed: 1, removedTokens: 0 });
    expect(fcm.sentTaskIds()).toContain('task-b');
    expect(await isReminded('task-a')).toBe(false);
    expect(await isReminded('task-b')).toBe(true);
    expect(await notificationsFor('task-a')).toHaveLength(0);
    expect(await notificationsFor('task-b')).toHaveLength(1);
    expect((await db.doc('users/alice/devices/tok-alice-secret').get()).exists).toBe(true);
    expect(logger.warn).toHaveBeenCalledWith('reminders: send failed', {
      taskId: 'task-a',
      code: 'messaging/internal-error',
    });
    // Logs name the task and the error class, never a token or the message text.
    const logged = JSON.stringify([
      vi.mocked(logger.warn).mock.calls,
      vi.mocked(logger.error).mock.calls,
    ]);
    expect(logged).not.toContain('tok-alice-secret');
    expect(logged).not.toContain('Buy milk');

    const later = new Date('2026-11-02T03:05:00Z');
    const retry = await runReminders(db, fakeMessaging().messaging, later);
    expect(retry).toEqual({ sent: 1, failed: 0, removedTokens: 0 });
    expect(await isReminded('task-a')).toBe(true);
  });

  it('skips a task whose owner is not a valid uid, logs it, and still sends the others', async () => {
    await addDevice('alice', 'tok-alice');
    await addTask('bad-owner', task('a/b', '2026-11-02T03:30:00Z'));
    await addTask('no-owner', task('x', '2026-11-02T03:30:00Z', { uid: 42 }));
    await addTask('good', task('alice', '2026-11-02T03:30:00Z'));
    const fcm = fakeMessaging();

    const result = await runReminders(db, fcm.messaging, NOW);

    expect(result).toEqual({ sent: 1, failed: 2, removedTokens: 0 });
    expect(fcm.sentTaskIds()).toEqual(['good']);
    expect(await isReminded('bad-owner')).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith('reminders: task has no valid owner', {
      taskId: 'bad-owner',
    });
    expect(logger.warn).toHaveBeenCalledWith('reminders: task has no valid owner', {
      taskId: 'no-owner',
    });
  });
});

/** `2026-11-02T03:MM:SSZ`: inside NOW's due window for any minute from 01 to 59. */
function at(minute: number, second = 0): string {
  const mm = String(minute).padStart(2, '0');
  const ss = String(second).padStart(2, '0');
  return `2026-11-02T03:${mm}:${ss}Z`;
}

describe('runReminders: limits (review I7)', () => {
  it('runs with 500 tasks a run, 20 per owner and 10 at a time by default', () => {
    expect(DEFAULT_REMINDER_LIMITS).toEqual({ perRun: 500, perOwner: 20, concurrency: 10 });
  });

  it('reads only the run limit of due tasks, earliest first; the rest wait for the next run', async () => {
    for (const [i, owner] of ['ann', 'ben', 'cat', 'dan'].entries()) {
      await addDevice(owner, `tok-${owner}`);
      // Written latest first, so only the query's order puts them earliest first.
      await addTask(`task-${owner}`, task(owner, at(40 - i * 10)));
    }
    const limits = { perRun: 3, perOwner: 20, concurrency: 2 };
    const fcm = fakeMessaging();

    const result = await runReminders(db, fcm.messaging, NOW, limits);

    expect(result).toEqual({ sent: 3, failed: 0, removedTokens: 0 });
    expect(fcm.sentTaskIds().sort()).toEqual(['task-ben', 'task-cat', 'task-dan']);
    expect(await isReminded('task-ann')).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(
      'reminders: run reached its task limit; the rest wait',
      {
        limit: 3,
      },
    );

    const next = await runReminders(db, fcm.messaging, new Date(at(5)), limits);
    expect(next).toEqual({ sent: 1, failed: 0, removedTokens: 0 });
    expect(await isReminded('task-ann')).toBe(true);
  });

  it("holds an owner's 21st due task for the next run, and still sends another owner's task", async () => {
    await addDevice('alice', 'tok-alice');
    await addDevice('bob', 'tok-bob');
    for (let i = 1; i <= 21; i += 1) {
      await addTask(`alice-${i}`, task('alice', at(i)));
    }
    // Later than all of Alice's, so a cap that stopped the run would miss it.
    await addTask('bob-1', task('bob', at(50)));
    const fcm = fakeMessaging();

    const result = await runReminders(db, fcm.messaging, NOW);

    expect(result).toEqual({ sent: 21, failed: 0, removedTokens: 0 });
    expect(fcm.sentTaskIds()).toContain('bob-1');
    expect(fcm.sentTaskIds()).not.toContain('alice-21');
    expect(fcm.sentTaskIds().filter((id) => id?.startsWith('alice-'))).toHaveLength(20);
    expect(await isReminded('alice-20')).toBe(true);
    expect(await isReminded('alice-21')).toBe(false);
    expect(await isReminded('bob-1')).toBe(true);
    expect(logger.info).toHaveBeenCalledWith(
      'reminders: owners over their limit wait for the next run',
      { deferred: 1 },
    );

    // The next run, 5 minutes later, sends it while it is still due.
    const next = await runReminders(db, fcm.messaging, new Date(at(5)));
    expect(next).toEqual({ sent: 1, failed: 0, removedTokens: 0 });
    expect(await isReminded('alice-21')).toBe(true);
  });

  it("doesn't let one owner's failing tasks hold up another owner's, with few slots", async () => {
    await addDevice('alice', 'tok-alice');
    await addDevice('bob', 'tok-bob');
    for (let i = 1; i <= 5; i += 1) {
      await addTask(`alice-${i}`, task('alice', at(i)));
    }
    await addTask('bob-1', task('bob', at(30)));
    const fcm = fakeMessaging(async (message) => {
      if (message.token === 'tok-alice') throw fcmError('messaging/internal-error');
      return 'ok';
    });

    const result = await runReminders(db, fcm.messaging, NOW, {
      perRun: 500,
      perOwner: 20,
      concurrency: 2,
    });

    expect(result).toEqual({ sent: 1, failed: 5, removedTokens: 0 });
    expect(await isReminded('bob-1')).toBe(true);
    expect(await notificationsFor('bob-1')).toHaveLength(1);
    for (let i = 1; i <= 5; i += 1) {
      expect(await isReminded(`alice-${i}`)).toBe(false);
    }
  });
});

describe('functions entry point', () => {
  it('exports the reminders, the budget kill-switch and the account-data deletion, and no HTTP trigger (S1, D7)', async () => {
    const entry = await import('./index');

    // A new export must be added here on purpose; none may answer HTTP or callable requests.
    expect(Object.keys(entry).sort()).toEqual([
      'deleteUserData',
      'sendReminders',
      'stopBillingOnBudget',
    ]);
    for (const fn of Object.values(entry)) {
      expect(fn.__endpoint.httpsTrigger).toBeUndefined();
      expect(fn.__endpoint.callableTrigger).toBeUndefined();
    }
    expect(entry.stopBillingOnBudget.__endpoint.eventTrigger).toBeDefined();

    // D6: runs on Auth's user deletion, and the platform retries a failure.
    expect(entry.deleteUserData.__endpoint.eventTrigger).toMatchObject({
      eventType: 'providers/firebase.auth/eventTypes/user.delete',
      retry: true,
    });

    const endpoint = entry.sendReminders.__endpoint;
    expect(endpoint.httpsTrigger).toBeUndefined();
    expect(endpoint.callableTrigger).toBeUndefined();
    expect(endpoint.scheduleTrigger).toMatchObject({
      schedule: 'every 5 minutes',
      timeZone: 'UTC',
    });
  });
});
