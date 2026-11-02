import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { i18n } from '@/plugins/i18n';
import { vuetify } from '@/plugins/vuetify';
import { useTasksStore } from '@/stores/tasks';
import { useUiStore } from '@/stores/ui';
import type { Label, Task } from '@/types/models';
import TaskBoard from './TaskBoard.vue';

/** Vuetify's inputs measure themselves; jsdom has no ResizeObserver. */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    uid: 'u1',
    title: 'Buy milk',
    description: '',
    status: 'todo',
    indefinite: false,
    date: '2026-11-02',
    time: '09:00',
    timeZone: 'UTC',
    remindAt: null,
    reminded: false,
    labelIds: [],
    ...overrides,
  };
}

interface BoardProps {
  todo: Task[];
  done: Task[];
  labels: Label[];
  loading: boolean;
}

function mountBoard(props: BoardProps) {
  const pinia = createPinia();
  setActivePinia(pinia);
  return mount(TaskBoard, {
    props: { ...props, today: '2026-11-02' },
    global: { plugins: [pinia, vuetify, i18n] },
  });
}

const SKELETON = '[data-testid="task-skeleton"]';
const CARD = '[data-testid="task-card"]';

/** Opens the first card's edit form and types a new title. */
async function editTitle(wrapper: ReturnType<typeof mountBoard>, title: string): Promise<void> {
  await wrapper.find('button[aria-label="Edit task"]').trigger('click');
  await wrapper.find('input[name="title"]').setValue(title);
  await wrapper.find('form').trigger('submit');
}

function titleValue(wrapper: ReturnType<typeof mountBoard>): string {
  return (wrapper.find('input[name="title"]').element as HTMLInputElement).value;
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  i18n.global.locale.value = 'en';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('TaskBoard loading (D10)', () => {
  it('while loading with no tasks, shows 4 skeletons and no cards', () => {
    const wrapper = mountBoard({ todo: [], done: [], labels: [], loading: true });

    expect(wrapper.findAll(SKELETON)).toHaveLength(4);
    expect(wrapper.findAll(CARD)).toHaveLength(0);
  });

  it('with tasks, shows cards and no skeletons, even while still loading', () => {
    const wrapper = mountBoard({
      todo: [makeTask()],
      done: [makeTask({ id: 't2', title: 'Pay rent', status: 'done' })],
      labels: [],
      loading: true,
    });

    expect(wrapper.findAll(CARD)).toHaveLength(2);
    expect(wrapper.findAll(SKELETON)).toHaveLength(0);
  });

  it('once loaded with no tasks, shows both empty columns and no skeletons', () => {
    const wrapper = mountBoard({ todo: [], done: [], labels: [], loading: false });

    expect(wrapper.findAll(SKELETON)).toHaveLength(0);
    expect(wrapper.text()).toContain('No task to do');
    expect(wrapper.text()).toContain('No task done');
  });
});

describe('TaskBoard saving an edit (D7)', () => {
  it('a rejected save keeps the form open with the error and the typed title', async () => {
    const wrapper = mountBoard({ todo: [makeTask()], done: [], labels: [], loading: false });
    const update = vi
      .spyOn(useTasksStore(), 'update')
      .mockRejectedValue(Object.assign(new Error('denied'), { code: 'permission-denied' }));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await editTitle(wrapper, 'Buy oat milk');
    await flushPromises();

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 't1' }),
      expect.objectContaining({ title: 'Buy oat milk' }),
    );
    expect(wrapper.find('form').exists()).toBe(true);
    expect(wrapper.find('[data-testid="save-error"]').text()).toContain(
      "Couldn't save. Try again.",
    );
    expect(titleValue(wrapper)).toBe('Buy oat milk');
    expect(warn).toHaveBeenCalledWith('[home] save failed:', 'permission-denied');
  });

  it('a save with no answer keeps the form open, and after 15 s says it is still saving', async () => {
    const wrapper = mountBoard({ todo: [makeTask()], done: [], labels: [], loading: false });
    vi.spyOn(useTasksStore(), 'update').mockReturnValue(new Promise<Task>(() => {}));
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    await editTitle(wrapper, 'Buy oat milk');
    await vi.advanceTimersByTimeAsync(14_000);
    await nextTick();
    expect(wrapper.text()).not.toContain('Still saving. Check your connection.');

    await vi.advanceTimersByTimeAsync(1_000);
    await nextTick();

    expect(wrapper.text()).toContain('Still saving. Check your connection.');
    expect(wrapper.find('form').exists()).toBe(true);
    expect(titleValue(wrapper)).toBe('Buy oat milk');
  });

  it('a successful save closes the form and confirms it', async () => {
    const wrapper = mountBoard({ todo: [makeTask()], done: [], labels: [], loading: false });
    vi.spyOn(useTasksStore(), 'update').mockImplementation(async (task, patch) => ({
      ...task,
      ...patch,
    }));

    await editTitle(wrapper, 'Buy oat milk');
    await flushPromises();

    expect(wrapper.find('form').exists()).toBe(false);
    expect(useUiStore().snack?.text).toBe('Task updated');
  });

  it('a save after a failure clears the old error', async () => {
    const wrapper = mountBoard({ todo: [makeTask()], done: [], labels: [], loading: false });
    const update = vi
      .spyOn(useTasksStore(), 'update')
      .mockRejectedValueOnce(new Error('offline'))
      .mockReturnValueOnce(new Promise<Task>(() => {}));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await editTitle(wrapper, 'Buy oat milk');
    await flushPromises();

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(update).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[data-testid="save-error"]').exists()).toBe(false);
  });
});

describe('TaskBoard status changes', () => {
  it('the check button marks a todo task done', async () => {
    const task = makeTask();
    const wrapper = mountBoard({ todo: [task], done: [], labels: [], loading: false });
    const update = vi
      .spyOn(useTasksStore(), 'update')
      .mockResolvedValue({ ...task, status: 'done' });

    await wrapper.find('button[aria-label="Mark as done"]').trigger('click');
    await flushPromises();

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }), { status: 'done' });
  });

  it('a failed status change says so in the snackbar', async () => {
    const wrapper = mountBoard({ todo: [makeTask()], done: [], labels: [], loading: false });
    vi.spyOn(useTasksStore(), 'update').mockRejectedValue(new Error('offline'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await wrapper.find('button[aria-label="Mark as done"]').trigger('click');
    await flushPromises();

    expect(useUiStore().snack?.text).toBe("Couldn't save. Try again.");
    expect(warn).toHaveBeenCalledWith('[home] status change failed:', 'Error');
  });
});
