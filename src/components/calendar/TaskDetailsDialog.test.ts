/** The calendar's task dialog: its Close button looks as usable as it is, and closes. */
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/plugins/i18n';
import { vuetify } from '@/plugins/vuetify';
import type { Task } from '@/types/models';
import TaskDetailsDialog from './TaskDetailsDialog.vue';

vi.mock('@/services/labels', () => ({ listLabels: vi.fn(), createLabel: vi.fn() }));

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

/** Vuetify's overlays place themselves in the visual viewport; jsdom has none. */
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

const TASK: Task = {
  id: 't1',
  uid: 'ann',
  title: 'New Task',
  description: 'Hello man',
  status: 'todo',
  indefinite: false,
  date: '2026-11-03',
  time: '00:30',
  timeZone: 'Asia/Kolkata',
  remindAt: null,
  reminded: false,
  labelIds: [],
};

let wrapper: VueWrapper | null = null;

function closeButton(): HTMLButtonElement {
  const found = [
    ...document.querySelectorAll<HTMLButtonElement>('[data-testid="task-details"] button'),
  ].find((b) => b.textContent?.trim() === 'Close');
  if (!found) throw new Error('no Close button');
  return found;
}

beforeEach(async () => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  vi.stubGlobal('visualViewport', visualViewportStub);
  i18n.global.locale.value = 'en';
  setActivePinia(createPinia());
  wrapper = mount(TaskDetailsDialog, {
    props: { task: TASK },
    global: { plugins: [vuetify, i18n] },
    attachTo: document.body,
  });
  await flushPromises();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('TaskDetailsDialog', () => {
  it('draws Close in the primary colour, not the dark grey that reads as disabled', () => {
    expect(closeButton().classList).toContain('text-primary');
    expect(closeButton().classList).not.toContain('text-secondary');
    expect(closeButton().disabled).toBe(false);
  });

  it('closes on Close', async () => {
    closeButton().click();
    await flushPromises();

    expect(wrapper?.emitted('close')).toHaveLength(1);
  });
});
