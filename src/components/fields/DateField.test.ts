import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VDatePicker } from 'vuetify/components';
import { i18n } from '@/plugins/i18n';
import { vuetify } from '@/plugins/vuetify';
import DateField from './DateField.vue';

/** Vuetify's inputs and overlays measure themselves; jsdom has no ResizeObserver. */
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

type DateFieldProps = InstanceType<typeof DateField>['$props'];

function mountField(props: Partial<DateFieldProps> = {}) {
  return mount(DateField, {
    props: { modelValue: '2026-11-02', ...props },
    global: { plugins: [vuetify, i18n] },
    attachTo: document.body,
  });
}

function input(wrapper: ReturnType<typeof mountField>): HTMLInputElement {
  return wrapper.find('input').element as HTMLInputElement;
}

async function pressEnter(wrapper: ReturnType<typeof mountField>): Promise<void> {
  await wrapper.find('input').trigger('keydown', { key: 'Enter' });
  await flushPromises();
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  vi.stubGlobal('visualViewport', visualViewportStub);
  i18n.global.locale.value = 'en';
});

afterEach(() => {
  i18n.global.locale.value = 'en';
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('DateField', () => {
  it('shows the local day as a long date in a text field, not a native date input', () => {
    const wrapper = mountField();

    expect(input(wrapper).value).toBe('Monday, 2 November 2026');
    expect(input(wrapper).type).toBe('text');
    expect(wrapper.find('input[type="date"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('is labelled "Select date" unless given a label, in English and Hindi', async () => {
    const wrapper = mountField();
    expect(wrapper.find('label').text()).toBe('Select date');

    i18n.global.locale.value = 'hi';
    await flushPromises();
    expect(wrapper.find('label').text()).toBe('तारीख चुनें');

    await wrapper.setProps({ label: 'Date' });
    expect(wrapper.find('label').text()).toBe('Date');
    wrapper.unmount();
  });

  it('opens the date picker from the keyboard with Enter', async () => {
    const wrapper = mountField();

    await pressEnter(wrapper);

    expect(wrapper.findComponent(VDatePicker).exists()).toBe(true);
    wrapper.unmount();
  });

  it('emits the picked day as that local day, never shifted through UTC (D1)', async () => {
    const wrapper = mountField();
    await pressEnter(wrapper);

    // The picker gives the day at local midnight.
    wrapper.findComponent(VDatePicker).vm.$emit('update:modelValue', new Date(2026, 10, 5));
    await flushPromises();

    expect(wrapper.emitted('update:modelValue')).toEqual([['2026-11-05']]);
    wrapper.unmount();
  });

  it('ignores a picker value that is not a real date', async () => {
    const wrapper = mountField();
    await pressEnter(wrapper);

    wrapper.findComponent(VDatePicker).vm.$emit('update:modelValue', null);
    wrapper.findComponent(VDatePicker).vm.$emit('update:modelValue', new Date(Number.NaN));
    await flushPromises();

    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    wrapper.unmount();
  });

  it('when disabled, shows no date and opens no picker', async () => {
    const wrapper = mountField({ disabled: true });

    await pressEnter(wrapper);

    expect(input(wrapper).value).toBe('');
    expect(input(wrapper).disabled).toBe(true);
    expect(wrapper.findComponent(VDatePicker).exists()).toBe(false);
    wrapper.unmount();
  });

  it('when read-only (a save in flight), keeps the date and opens no picker', async () => {
    const wrapper = mountField({ readonly: true });

    await pressEnter(wrapper);

    expect(input(wrapper).value).toBe('Monday, 2 November 2026');
    expect(wrapper.findComponent(VDatePicker).exists()).toBe(false);
    wrapper.unmount();
  });

  it('shows its error message', () => {
    const wrapper = mountField({ modelValue: '', errorMessages: 'Pick a date' });

    expect(wrapper.text()).toContain('Pick a date');
    wrapper.unmount();
  });
});
