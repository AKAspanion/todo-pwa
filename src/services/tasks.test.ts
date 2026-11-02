/**
 * The task service against the Firestore and Auth emulators (project demo-todo), signed in as a
 * fresh user per test so the security rules apply as they do in the app.
 */
import { Timestamp, doc, getDoc } from 'firebase/firestore';
import { beforeEach, describe, expect, it } from 'vitest';
import { auth, db } from '@/lib/firebase';
import { computeRemindAt, deviceTimeZone } from '@/lib/dates';
import { signInEmail, signOutUser, signUpEmail } from './auth';
import { createTask, deleteTask, listTasks, updateTask } from './tasks';
import type { TaskInput } from '@/types/models';

const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const DOCUMENTS = `projects/${PROJECT_ID}/databases/(default)/documents`;
const REST = `http://${__FIREBASE_EMULATOR_HOSTS__.firestore}/v1/${DOCUMENTS}`;
const PASSWORD = 'secret-pass-1';

if (!PROJECT_ID.startsWith('demo-')) throw new Error('these tests run only on a demo- project');

type RestValue =
  | { stringValue: string }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { referenceValue: string }
  | { arrayValue: { values: RestValue[] } };

/** Writes fields to a document past the security rules, as an administrator would. */
async function seed(path: string, fields: Record<string, RestValue>): Promise<void> {
  const mask = Object.keys(fields)
    .map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`)
    .join('&');
  const response = await fetch(`${REST}/${path}?${mask}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`seed ${path} failed: ${response.status}`);
}

const str = (stringValue: string): RestValue => ({ stringValue });

async function storedFields(id: string): Promise<Record<string, unknown>> {
  const snapshot = await getDoc(doc(db, 'tasks', id));
  return snapshot.data() ?? {};
}

let uid = '';
let email = '';

beforeEach(async () => {
  await signOutUser();
  email = `user-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  uid = (await signUpEmail(email, PASSWORD)).uid;
});

const input: TaskInput = {
  title: 'Buy milk',
  description: '',
  indefinite: false,
  date: '2026-11-03',
  time: '09:00',
  labelIds: ['a'],
};

describe('signInEmail', () => {
  it('signs an existing user in and returns them', async () => {
    await signOutUser();

    const user = await signInEmail(email, PASSWORD);

    expect(user.uid).toBe(uid);
    expect(auth.currentUser?.uid).toBe(uid);
  });

  it('rejects a wrong password with a Firebase error code', async () => {
    await signOutUser();

    await expect(signInEmail(email, 'wrong-pass-1')).rejects.toMatchObject({
      code: expect.stringMatching(/^auth\//),
    });
  });
});

describe('createTask', () => {
  it('stores exactly the task fields, status todo, the device zone and the reminder', async () => {
    const task = await createTask(uid, input);

    const stored = await storedFields(task.id);
    expect(Object.keys(stored).sort()).toEqual(
      [
        'date',
        'description',
        'indefinite',
        'labelIds',
        'remindAt',
        'reminded',
        'status',
        'time',
        'timeZone',
        'title',
        'uid',
      ].sort(),
    );
    expect(stored).toMatchObject({
      uid,
      status: 'todo',
      timeZone: deviceTimeZone(),
      reminded: false,
      labelIds: ['a'],
    });
    const expected = computeRemindAt({ ...input, status: 'todo', timeZone: deviceTimeZone() });
    expect((stored.remindAt as Timestamp).toDate().toISOString()).toBe(expected?.toISOString());
    expect(task.remindAt?.toISOString()).toBe(expected?.toISOString());
  });

  it('stores null date, time and remindAt for an indefinite task', async () => {
    const task = await createTask(uid, { ...input, indefinite: true });

    expect(await storedFields(task.id)).toMatchObject({ date: null, time: null, remindAt: null });
  });
});

describe('updateTask (D7, P6)', () => {
  it("removes a legacy task's id and type fields and recomputes remindAt", async () => {
    await seed('tasks/legacy1', {
      uid: str(uid),
      id: str('legacy1'),
      title: str('Old'),
      status: str('todo'),
      indefinite: { booleanValue: false },
      date: str('2026-11-03'),
      time: str('09:00'),
      type: { arrayValue: { values: [{ referenceValue: `${DOCUMENTS}/types/a` }] } },
    });
    const [legacy] = await listTasks(uid);
    expect(legacy?.labelIds).toEqual(['a']);

    await updateTask(legacy!, { title: 'x' });

    const stored = await storedFields('legacy1');
    expect(stored).not.toHaveProperty('id');
    expect(stored).not.toHaveProperty('type');
    expect(stored.title).toBe('x');
    expect(stored.labelIds).toEqual(['a']);
    // The schedule didn't change, so the old app's zone (§11.3) still applies.
    expect(stored.timeZone).toBe('Asia/Kolkata');
    expect((stored.remindAt as Timestamp).toDate().toISOString()).toBe('2026-11-03T02:30:00.000Z');
  });

  it('resets reminded when the time changes, and keeps it when only the title does', async () => {
    const task = await createTask(uid, input);
    await seed(`tasks/${task.id}`, { reminded: { booleanValue: true } });
    const [reminded] = await listTasks(uid);

    const renamed = await updateTask(reminded!, { title: 'Renamed' });
    expect((await storedFields(task.id)).reminded).toBe(true);
    expect(renamed.reminded).toBe(true);

    const moved = await updateTask(renamed, { time: '10:00' });
    const stored = await storedFields(task.id);
    expect(stored.reminded).toBe(false);
    expect(moved.reminded).toBe(false);
    const expected = computeRemindAt({ ...moved });
    expect((stored.remindAt as Timestamp).toDate().toISOString()).toBe(expected?.toISOString());
  });

  it('clears remindAt when the task is done', async () => {
    const task = await createTask(uid, input);

    const done = await updateTask(task, { status: 'done' });

    expect(done.remindAt).toBeNull();
    expect((await storedFields(task.id)).remindAt).toBeNull();
  });

  it('ignores fields that are not editable', async () => {
    const task = await createTask(uid, input);
    const sneaky = {
      title: 'ok',
      uid: 'someone-else',
      id: 'other',
    } as unknown as Partial<TaskInput>;

    await updateTask(task, sneaky);

    const stored = await storedFields(task.id);
    expect(stored.uid).toBe(uid);
    expect(stored).not.toHaveProperty('id');
  });
});

describe('listTasks and deleteTask', () => {
  it("lists only the signed-in user's tasks, and deletes one", async () => {
    const task = await createTask(uid, input);
    expect((await listTasks(uid)).map((t) => t.id)).toEqual([task.id]);

    await deleteTask(task.id);

    expect(await listTasks(uid)).toEqual([]);
  });
});
