import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VDatePicker } from 'vuetify/components';
import DateField from '@/components/fields/DateField.vue';
import TimeField from '@/components/fields/TimeField.vue';
import { i18n } from '@/plugins/i18n';
import { vuetify } from '@/plugins/vuetify';
import type { Label, Task } from '@/types/models';
import TaskCard from './TaskCard.vue';
import TaskEditForm from './TaskEditForm.vue';

/** Vuetify's inputs measure themselves; jsdom has no ResizeObserver. */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

/** Vuetify's menus place themselves in the visual viewport; jsdom has none. */
const visualViewportStub = {
  width: 1024,
  height: 768,
  offsetLeft: 0,
  offsetTop: 0,
  pageLeft: 0,
  pageTop: 0,
  scale: 1,
  addEventListener(): void {},
  removeEventListener(): void {},
};

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    uid: 'u1',
    title: 'Buy milk',
    description: 'From the corner shop',
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

const HOME: Label = { id: 'a', uid: 'u1', label: 'Home', color: '#E91E63' };
const SAVE_ERROR = "Couldn't save. Try again.";

const global = { plugins: [vuetify, i18n] };

function mountCard(task: Task, labels: Label[] = [], attach = false) {
  return mount(TaskCard, {
    props: { task, labels },
    global,
    ...(attach ? { attachTo: document.body } : {}),
  });
}

function mountForm(
  props: { task: Task; labels: Label[]; saving: boolean; error: string | null },
  attach = false,
) {
  return mount(TaskEditForm, { props, global, ...(attach ? { attachTo: document.body } : {}) });
}

function inputValue(wrapper: ReturnType<typeof mountForm>, selector: string): string {
  return (wrapper.find(selector).element as HTMLInputElement | HTMLTextAreaElement).value;
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  vi.stubGlobal('visualViewport', visualViewportStub);
  i18n.global.locale.value = 'en';
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('TaskCard', () => {
  it('shows check, edit and delete without hover, each labelled and reachable by keyboard (D11)', () => {
    const wrapper = mountCard(makeTask(), [], true);

    for (const name of ['Mark as done', 'Edit task', 'Delete task']) {
      const button = wrapper.find(`button[aria-label="${name}"]`);
      expect(button.exists(), name).toBe(true);
      expect(button.isVisible(), name).toBe(true);
      const element = button.element as HTMLButtonElement;
      expect(element.disabled, name).toBe(false);
      expect(element.tabIndex, name).toBeGreaterThanOrEqual(0);
      element.focus();
      expect(document.activeElement, name).toBe(element);
    }

    wrapper.unmount();
  });

  it('labels the check button "Mark as not done" on a done task', () => {
    const wrapper = mountCard(makeTask({ status: 'done' }));

    expect(wrapper.find('button[aria-label="Mark as not done"]').isVisible()).toBe(true);
    expect(wrapper.find('button[aria-label="Delete task"]').isVisible()).toBe(true);
  });

  it('drops a label id with no matching label: no chip for it, and no event (D6)', () => {
    const wrapper = mountCard(makeTask({ labelIds: ['deleted-label', 'a'] }), [HOME]);

    const chips = wrapper.findAll('[data-testid="label-chip"]');
    expect(chips).toHaveLength(1);
    expect(chips[0]?.text()).toBe('Home');
    expect(wrapper.text()).not.toContain('deleted-label');
    expect(wrapper.emitted()).toEqual({});
  });

  it('shows no chip list at all when every label id is missing', () => {
    const wrapper = mountCard(makeTask({ labelIds: ['deleted-label'] }), []);

    expect(wrapper.findAll('[data-testid="label-chip"]')).toHaveLength(0);
    expect(wrapper.emitted()).toEqual({});
  });

  it('emits toggle with the task when the check button is pressed', async () => {
    const task = makeTask();
    const wrapper = mountCard(task);

    await wrapper.find('button[aria-label="Mark as done"]').trigger('click');

    expect(wrapper.emitted('toggle')).toEqual([[task]]);
  });

  it('asks before deleting, and emits remove only once confirmed', async () => {
    const task = makeTask();
    const wrapper = mountCard(task);

    await wrapper.find('button[aria-label="Delete task"]').trigger('click');
    expect(wrapper.text()).toContain('Delete this task?');
    expect(wrapper.emitted('remove')).toBeUndefined();

    await wrapper.find('button[aria-label="Delete"]').trigger('click');

    expect(wrapper.emitted('remove')).toEqual([[task]]);
  });

  it('renders a description with an HTML image as text: no img element (S3)', () => {
    const wrapper = mountCard(makeTask({ description: '<img src=x onerror="alert(1)">' }));

    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.find('[onerror]').exists()).toBe(false);
  });

  it('shows an indefinite task as having no due date', () => {
    const wrapper = mountCard(makeTask({ indefinite: true, date: null, time: null }));

    expect(wrapper.text()).toContain('No due date');
  });
});

describe('TaskEditForm', () => {
  it('keeps the typed values while saving', async () => {
    const wrapper = mountForm({ task: makeTask(), labels: [HOME], saving: false, error: null });
    await wrapper.find('input[name="title"]').setValue('Buy oat milk');
    await wrapper.find('textarea[name="description"]').setValue('Two litres');

    await wrapper.setProps({ saving: true });

    expect(inputValue(wrapper, 'input[name="title"]')).toBe('Buy oat milk');
    expect(inputValue(wrapper, 'textarea[name="description"]')).toBe('Two litres');
  });

  it('keeps the typed values when the task prop changes while saving', async () => {
    const task = makeTask();
    const wrapper = mountForm({ task, labels: [HOME], saving: false, error: null });
    await wrapper.find('input[name="title"]').setValue('Buy oat milk');

    await wrapper.setProps({ saving: true, task: { ...task } });

    expect(inputValue(wrapper, 'input[name="title"]')).toBe('Buy oat milk');
  });

  it('with an error, stays open and shows the error text and the typed title', async () => {
    const wrapper = mountForm({ task: makeTask(), labels: [], saving: false, error: null });
    await wrapper.find('input[name="title"]').setValue('Buy oat milk');
    await wrapper.setProps({ saving: true });

    await wrapper.setProps({ saving: false, error: SAVE_ERROR });

    expect(wrapper.find('form').exists()).toBe(true);
    expect(wrapper.find('[data-testid="save-error"]').text()).toContain(SAVE_ERROR);
    expect(inputValue(wrapper, 'input[name="title"]')).toBe('Buy oat milk');
  });

  it('submits only the editable fields, keeping a label id with no matching label (D6, D7)', async () => {
    const wrapper = mountForm({
      task: makeTask({ labelIds: ['deleted-label', 'a'] }),
      labels: [HOME],
      saving: false,
      error: null,
    });
    await wrapper.find('input[name="title"]').setValue('  Buy oat milk ');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.emitted('submit')).toEqual([
      [
        {
          title: 'Buy oat milk',
          description: 'From the corner shop',
          indefinite: false,
          date: '2026-11-02',
          time: '09:00',
          labelIds: ['deleted-label', 'a'],
        },
      ],
    ]);
  });

  it('submits no date or time for an indefinite task', async () => {
    const wrapper = mountForm({
      task: makeTask({ indefinite: true, date: null, time: null }),
      labels: [],
      saving: false,
      error: null,
    });

    await wrapper.find('form').trigger('submit');

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      indefinite: true,
      date: null,
      time: null,
    });
  });

  it('refuses a blank title and says why', async () => {
    const wrapper = mountForm({ task: makeTask(), labels: [], saving: false, error: null });
    await wrapper.find('input[name="title"]').setValue('   ');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.emitted('submit')).toBeUndefined();
    expect(wrapper.text()).toContain("Enter the task's title");
  });

  it('does not submit again while a save is in flight', async () => {
    const wrapper = mountForm({ task: makeTask(), labels: [], saving: true, error: null });

    await wrapper.find('form').trigger('submit');

    expect(wrapper.emitted('submit')).toBeUndefined();
  });

  it('uses the shared date and time fields, never native date or time inputs', () => {
    const wrapper = mountForm({ task: makeTask(), labels: [], saving: false, error: null });

    expect(wrapper.find('input[type="date"]').exists()).toBe(false);
    expect(wrapper.find('input[type="time"]').exists()).toBe(false);
    expect(inputValue(wrapper, 'input[name="date"]')).toBe('Monday, 2 November 2026');
    expect(inputValue(wrapper, 'input[name="time"]')).toBe('9:00 AM');
  });

  it('submits a day picked in the date picker as that local day (D1)', async () => {
    const wrapper = mountForm({ task: makeTask(), labels: [], saving: false, error: null }, true);
    await wrapper.find('input[name="date"]').trigger('keydown', { key: 'Enter' });
    await flushPromises();

    wrapper.findComponent(VDatePicker).vm.$emit('update:modelValue', new Date(2026, 10, 5));
    await wrapper.find('form').trigger('submit');

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      date: '2026-11-05',
      time: '09:00',
    });
    wrapper.unmount();
  });

  it('submits no time once the time is cleared', async () => {
    const wrapper = mountForm({ task: makeTask(), labels: [], saving: false, error: null });

    wrapper.findComponent(TimeField).vm.$emit('update:modelValue', '');
    await wrapper.find('form').trigger('submit');

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({ date: '2026-11-02', time: null });
  });

  it('disables the date and time fields for an indefinite task, and keeps them read-only while saving', async () => {
    const wrapper = mountForm({
      task: makeTask({ indefinite: true, date: null, time: null }),
      labels: [],
      saving: false,
      error: null,
    });
    expect(wrapper.findComponent(DateField).props('disabled')).toBe(true);
    expect(wrapper.findComponent(TimeField).props('disabled')).toBe(true);

    await wrapper.setProps({ task: makeTask(), saving: true });

    expect(wrapper.findComponent(DateField).props('readonly')).toBe(true);
    expect(wrapper.findComponent(TimeField).props('readonly')).toBe(true);
  });

  it('shows a selected label chip filled with its colour and an unselected one tonal, as Add task does', () => {
    const work: Label = { id: 'w', uid: 'u1', label: 'Work', color: '#1976D2' };
    const wrapper = mountForm({
      task: makeTask({ labelIds: ['a'] }),
      labels: [HOME, work],
      saving: false,
      error: null,
    });

    const home = wrapper.find('[data-label-id="a"]');
    const other = wrapper.find('[data-label-id="w"]');
    expect(home.classes()).toEqual(
      expect.arrayContaining(['v-chip--selected', 'v-chip--variant-flat']),
    );
    expect(other.classes()).toContain('v-chip--variant-tonal');
    expect(other.classes()).not.toContain('v-chip--selected');
  });

  it('emits cancel from the cancel button', async () => {
    const wrapper = mountForm({ task: makeTask(), labels: [], saving: false, error: null });

    await wrapper.find('[data-testid="edit-cancel"]').trigger('click');

    expect(wrapper.emitted('cancel')).toEqual([[]]);
  });
});
