/**
 * Tasks in the `tasks` collection. A write carries exactly the fields the security rules allow
 * (uid, title, description, status, indefinite, date, time, timeZone, remindAt, reminded,
 * labelIds) and never the client-only `id` (D7). Reminder fields are derived here on every save
 * (P6), never taken from the caller.
 */
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { computeRemindAt, deviceTimeZone } from '@/lib/dates';
import { taskFromDoc } from './legacy';
import type { Task, TaskInput, TaskStatus } from '@/types/models';

const TASKS = 'tasks';

export type TaskPatch = Partial<TaskInput> & { status?: TaskStatus };
type Editable = TaskInput & { status: TaskStatus };

const textOr = (value: unknown, fallback: string): string =>
  typeof value === 'string' ? value : fallback;
const textOrNull = (value: unknown): string | null => (typeof value === 'string' ? value : null);

/**
 * The editable fields, cleaned: an indefinite task has no date or time, labels are distinct
 * strings, and a missing value (which Firestore refuses to store) becomes empty.
 */
function normalise(fields: Editable): Editable {
  const indefinite = fields.indefinite === true;
  const labelIds: unknown[] = Array.isArray(fields.labelIds) ? fields.labelIds : [];
  return {
    title: textOr(fields.title, '').trim(),
    description: textOr(fields.description, ''),
    status: fields.status === 'done' ? 'done' : 'todo',
    indefinite,
    date: indefinite ? null : textOrNull(fields.date),
    time: indefinite ? null : textOrNull(fields.time),
    labelIds: [...new Set(labelIds.filter((id): id is string => typeof id === 'string'))],
  };
}

/** Only the keys a patch may change, whatever else the caller's object carries. */
function editableOf(patch: TaskPatch): TaskPatch {
  const picked: TaskPatch = {};
  if (patch.title !== undefined) picked.title = patch.title;
  if (patch.description !== undefined) picked.description = patch.description;
  if (patch.status !== undefined) picked.status = patch.status;
  if (patch.indefinite !== undefined) picked.indefinite = patch.indefinite;
  if (patch.date !== undefined) picked.date = patch.date;
  if (patch.time !== undefined) picked.time = patch.time;
  if (patch.labelIds !== undefined) picked.labelIds = patch.labelIds;
  return picked;
}

function storedFields(task: Omit<Task, 'id'>) {
  return {
    uid: task.uid,
    title: task.title,
    description: task.description,
    status: task.status,
    indefinite: task.indefinite,
    date: task.date,
    time: task.time,
    timeZone: task.timeZone,
    remindAt: task.remindAt ? Timestamp.fromDate(task.remindAt) : null,
    reminded: task.reminded,
    labelIds: task.labelIds,
  };
}

export async function listTasks(uid: string): Promise<Task[]> {
  const snapshot = await getDocs(query(collection(db, TASKS), where('uid', '==', uid)));
  return snapshot.docs.map((d) => taskFromDoc(d.id, d.data()));
}

/** Saves a new task: status 'todo', in the device's time zone, with its reminder not yet sent. */
export async function createTask(uid: string, input: TaskInput): Promise<Task> {
  const fields = normalise({ ...input, status: 'todo' });
  const timeZone = deviceTimeZone();
  const task: Omit<Task, 'id'> = {
    uid,
    ...fields,
    timeZone,
    remindAt: computeRemindAt({ ...fields, timeZone }),
    reminded: false,
  };
  const ref = await addDoc(collection(db, TASKS), storedFields(task));
  return { id: ref.id, ...task };
}

/**
 * Saves an edit. Writes the editable fields and the derived reminder fields only, and removes the
 * old app's `type` and `id` fields. A changed date or time (or indefinite flag) is taken as
 * entered in the device's time zone and resets `reminded`; otherwise the task keeps its zone.
 */
export async function updateTask(task: Task, patch: TaskPatch): Promise<Task> {
  const fields = normalise({
    title: task.title,
    description: task.description,
    status: task.status,
    indefinite: task.indefinite,
    date: task.date,
    time: task.time,
    labelIds: task.labelIds,
    ...editableOf(patch),
  });
  const scheduleChanged =
    fields.indefinite !== task.indefinite || fields.date !== task.date || fields.time !== task.time;
  const timeZone = scheduleChanged ? deviceTimeZone() : task.timeZone;
  const updated: Task = {
    ...task,
    ...fields,
    timeZone,
    remindAt: computeRemindAt({ ...fields, timeZone }),
    reminded: scheduleChanged ? false : task.reminded,
  };
  // `uid` is left out: it never changes, and the rules forbid changing it.
  const { uid: _uid, ...changes } = storedFields(updated);
  await updateDoc(doc(db, TASKS, task.id), {
    ...changes,
    id: deleteField(),
    type: deleteField(),
  });
  return updated;
}

export function deleteTask(id: string): Promise<void> {
  return deleteDoc(doc(db, TASKS, id));
}
