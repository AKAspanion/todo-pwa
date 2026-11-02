import { defineStore } from 'pinia';
import { createTask, deleteTask, listTasks, updateTask, type TaskPatch } from '@/services/tasks';
import type { Task, TaskInput } from '@/types/models';
import { currentUid, errorCode, requireUid } from './session';

export interface TaskFilter {
  text: string;
  labelIds: string[];
  date: string | null;
}
export interface TasksByStatus {
  todo: Task[];
  done: Task[];
}

interface TasksState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
}

const isUndated = (t: Task): boolean => t.indefinite || t.date === null;

/** By date, then time (a dated task without a time ends its day), indefinite tasks last (D9). */
function compareTasks(a: Task, b: Task): number {
  if (isUndated(a) !== isUndated(b)) return isUndated(a) ? 1 : -1;
  const aKey = `${a.date ?? ''} ${a.time ?? '~'}`;
  const bKey = `${b.date ?? ''} ${b.time ?? '~'}`;
  return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
}

function splitByStatus(tasks: Task[]): TasksByStatus {
  const sorted = [...tasks].sort(compareTasks);
  return {
    todo: sorted.filter((t) => t.status !== 'done'),
    done: sorted.filter((t) => t.status === 'done'),
  };
}

/** Text that may be missing on an old document, as lower case (D8). */
const searchable = (value: unknown): string =>
  (typeof value === 'string' ? value : '').toLowerCase();

export const useTasksStore = defineStore('tasks', {
  state: (): TasksState => ({ tasks: [], loading: false, error: null }),
  getters: {
    byStatus: (state): TasksByStatus => splitByStatus(state.tasks),
  },
  actions: {
    /** Loads the user's tasks. On failure the tasks already shown stay, and `error` is 'load-failed' (D12). */
    async load(): Promise<void> {
      const uid = currentUid();
      if (!uid) return;
      this.loading = true;
      this.error = null;
      try {
        const tasks = await listTasks(uid);
        // A result for a user who has since signed out is not shown to the next one.
        if (currentUid() === uid) this.tasks = tasks;
      } catch (error) {
        console.warn('[tasks] load failed:', errorCode(error));
        if (currentUid() === uid) this.error = 'load-failed';
      } finally {
        this.loading = false;
      }
    },

    async add(input: TaskInput): Promise<Task> {
      const uid = requireUid();
      const task = await createTask(uid, input);
      if (currentUid() === uid) this.tasks.push(task);
      return task;
    },

    /** Saves an edit. The store changes only after the save succeeds; a failure reaches the caller (D7). */
    async update(task: Task, patch: TaskPatch): Promise<Task> {
      const updated = await updateTask(task, patch);
      const index = this.tasks.findIndex((t) => t.id === updated.id);
      if (index !== -1) this.tasks.splice(index, 1, updated);
      return updated;
    },

    async remove(id: string): Promise<void> {
      await deleteTask(id);
      this.tasks = this.tasks.filter((t) => t.id !== id);
    },

    /**
     * The tasks matching every given condition, split and sorted as `byStatus`:
     * - `text` appears in the title or description, ignoring case (a missing description is empty);
     * - the task has at least one of `labelIds`, compared exactly (D8);
     * - `date`, as the home screen has always shown it: todo tasks on that date plus indefinite
     *   ones, and every done task.
     */
    filter(q: TaskFilter): TasksByStatus {
      const text = q.text.trim().toLowerCase();
      const wanted = new Set(q.labelIds);
      const matches = (t: Task): boolean => {
        const textMatches =
          searchable(t.title).includes(text) || searchable(t.description).includes(text);
        if (text && !textMatches) return false;
        if (wanted.size > 0 && !t.labelIds.some((id) => wanted.has(id))) return false;
        if (q.date !== null && t.status !== 'done' && !isUndated(t) && t.date !== q.date) {
          return false;
        }
        return true;
      };
      return splitByStatus(this.tasks.filter(matches));
    },
  },
});
