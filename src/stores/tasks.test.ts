import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTask, deleteTask, listTasks, updateTask } from '@/services/tasks';
import { useSessionStore } from './session';
import { useTasksStore } from './tasks';
import type { Task } from '@/types/models';

vi.mock('@/services/auth', () => ({ onUserChanged: vi.fn(), signOutUser: vi.fn() }));
vi.mock('@/services/labels', () => ({ listLabels: vi.fn(), createLabel: vi.fn() }));
vi.mock('@/services/notifications', () => ({
  listNotifications: vi.fn(),
  deleteNotification: vi.fn(),
}));
vi.mock('@/services/tasks', () => ({
  listTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}));

function makeTask(fields: Partial<Task> & { id: string }): Task {
  return {
    uid: 'alice',
    title: fields.id,
    description: '',
    status: 'todo',
    indefinite: false,
    date: '2026-11-03',
    time: '09:00',
    timeZone: 'Asia/Kolkata',
    remindAt: null,
    reminded: false,
    labelIds: [],
    ...fields,
  };
}

const noFilter = { text: '', labelIds: [], date: null };

describe('tasks store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useSessionStore().user = {
      uid: 'alice',
      email: 'a@example.com',
      displayName: null,
      photoURL: null,
      emailVerified: true,
    };
    for (const fn of [listTasks, createTask, updateTask, deleteTask]) vi.mocked(fn).mockReset();
  });

  describe('byStatus', () => {
    it('orders by date, then time, with indefinite tasks last', () => {
      const store = useTasksStore();
      store.tasks = [
        makeTask({ id: 'undated', indefinite: true, date: null, time: null }),
        makeTask({ id: 'd4-07', date: '2026-11-04', time: '07:00' }),
        makeTask({ id: 'd3-10', date: '2026-11-03', time: '10:00' }),
        makeTask({ id: 'done', status: 'done' }),
        makeTask({ id: 'd3-08', date: '2026-11-03', time: '08:00' }),
      ];

      expect(store.byStatus.todo.map((t) => t.id)).toEqual(['d3-08', 'd3-10', 'd4-07', 'undated']);
      expect(store.byStatus.done.map((t) => t.id)).toEqual(['done']);
    });
  });

  describe('filter (D8)', () => {
    it('treats a missing description as empty, so only the title can match', () => {
      const store = useTasksStore();
      const noDescription = undefined as unknown as string;
      store.tasks = [
        makeTask({ id: 'a', title: 'Buy foo', description: noDescription }),
        makeTask({ id: 'b', title: 'Buy bar', description: noDescription }),
      ];

      const result = store.filter({ ...noFilter, text: 'foo' });

      expect(result.todo.map((t) => t.id)).toEqual(['a']);
    });

    it('matches text in the description, ignoring case', () => {
      const store = useTasksStore();
      store.tasks = [makeTask({ id: 'a', title: 'x', description: 'Some FOO here' })];

      expect(store.filter({ ...noFilter, text: 'foo' }).todo).toHaveLength(1);
    });

    it('compares label ids exactly, never as substrings of joined ids', () => {
      const store = useTasksStore();
      store.tasks = [
        makeTask({ id: 'split', labelIds: ['a', 'b'] }),
        makeTask({ id: 'exact', labelIds: ['ab'] }),
      ];

      const result = store.filter({ ...noFilter, labelIds: ['ab'] });

      expect(result.todo.map((t) => t.id)).toEqual(['exact']);
    });

    it('keeps todo tasks on the chosen date and indefinite ones, and every done task', () => {
      const store = useTasksStore();
      store.tasks = [
        makeTask({ id: 'on', date: '2026-11-03' }),
        makeTask({ id: 'off', date: '2026-11-04' }),
        makeTask({ id: 'undated', indefinite: true, date: null, time: null }),
        makeTask({ id: 'done-off', status: 'done', date: '2026-11-04' }),
      ];

      const result = store.filter({ ...noFilter, date: '2026-11-03' });

      expect(result.todo.map((t) => t.id)).toEqual(['on', 'undated']);
      expect(result.done.map((t) => t.id)).toEqual(['done-off']);
    });
  });

  describe('load (D12)', () => {
    it('keeps the existing tasks when loading fails, and reports load-failed', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const store = useTasksStore();
      const existing = [makeTask({ id: 'kept' })];
      store.tasks = existing;
      vi.mocked(listTasks).mockRejectedValue(
        Object.assign(new Error('offline'), { code: 'unavailable' }),
      );

      await store.load();

      expect(store.tasks).toEqual(existing);
      expect(store.error).toBe('load-failed');
      expect(store.loading).toBe(false);
      expect(warn).toHaveBeenCalledWith('[tasks] load failed:', 'unavailable');
    });

    it("loads the signed-in user's tasks and clears an earlier error", async () => {
      const store = useTasksStore();
      store.error = 'load-failed';
      vi.mocked(listTasks).mockResolvedValue([makeTask({ id: 'fresh' })]);

      await store.load();

      expect(listTasks).toHaveBeenCalledWith('alice');
      expect(store.tasks.map((t) => t.id)).toEqual(['fresh']);
      expect(store.error).toBeNull();
    });

    it('drops a result that arrives after the user changed', async () => {
      const store = useTasksStore();
      let finish: (tasks: Task[]) => void = () => {};
      vi.mocked(listTasks).mockReturnValue(new Promise((resolve) => (finish = resolve)));

      const loading = store.load();
      useSessionStore().user = null;
      finish([makeTask({ id: 'alices' })]);
      await loading;

      expect(store.tasks).toEqual([]);
      expect(store.loading).toBe(false);
    });
  });

  describe('update (D7)', () => {
    it('leaves the stored task unchanged when the save fails, and rejects', async () => {
      const store = useTasksStore();
      const original = makeTask({ id: 't1', title: 'Before' });
      store.tasks = [original];
      vi.mocked(updateTask).mockRejectedValue(new Error('permission-denied'));

      await expect(store.update(original, { title: 'After' })).rejects.toThrow('permission-denied');

      expect(store.tasks).toEqual([makeTask({ id: 't1', title: 'Before' })]);
    });

    it('replaces the task once the save succeeds', async () => {
      const store = useTasksStore();
      const original = makeTask({ id: 't1', title: 'Before' });
      store.tasks = [original];
      vi.mocked(updateTask).mockResolvedValue({ ...original, title: 'After' });

      const updated = await store.update(original, { title: 'After' });

      expect(updated.title).toBe('After');
      expect(store.tasks.map((t) => t.title)).toEqual(['After']);
    });
  });

  describe('add and remove', () => {
    it('adds the saved task for the signed-in user', async () => {
      const store = useTasksStore();
      const saved = makeTask({ id: 'new' });
      vi.mocked(createTask).mockResolvedValue(saved);
      const input = {
        title: 'new',
        description: '',
        indefinite: false,
        date: '2026-11-03',
        time: '09:00',
        labelIds: [],
      };

      await expect(store.add(input)).resolves.toEqual(saved);

      expect(createTask).toHaveBeenCalledWith('alice', input);
      expect(store.tasks).toEqual([saved]);
    });

    it('refuses to add without a signed-in user', async () => {
      useSessionStore().user = null;

      await expect(
        useTasksStore().add({
          title: 'x',
          description: '',
          indefinite: true,
          date: null,
          time: null,
          labelIds: [],
        }),
      ).rejects.toThrow('auth/not-signed-in');
      expect(createTask).not.toHaveBeenCalled();
    });

    it('removes a task only after the delete succeeds', async () => {
      const store = useTasksStore();
      store.tasks = [makeTask({ id: 't1' })];
      vi.mocked(deleteTask).mockRejectedValueOnce(new Error('offline'));

      await expect(store.remove('t1')).rejects.toThrow('offline');
      expect(store.tasks).toHaveLength(1);

      vi.mocked(deleteTask).mockResolvedValueOnce();
      await store.remove('t1');
      expect(store.tasks).toEqual([]);
    });
  });
});
