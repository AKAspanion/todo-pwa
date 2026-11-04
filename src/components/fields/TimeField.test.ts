import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VTimePicker } from 'vuetify/components';
import { i18n } from '@/plugins/i18n';
import { vuetify } from '@/plugins/vuetify';
import TimeField from './TimeField.vue';

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

type TimeFieldProps = InstanceType<typeof TimeField>['$props'];

function mountField(props: Partial<TimeFieldProps> = {}) {
  return mount(TimeField, {
    props: { modelValue: '09:30', ...props },
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

describe('TimeField', () => {
  it("writes the old add screen's '09:30 AM' with oldFormat", () => {
    const wrapper = mountField({ oldFormat: true });

    expect(input(wrapper).value).toBe('09:30 AM');
    wrapper.unmount();
  });

  it('shows the time on a 12-hour clock in a text field, not a native time input', () => {
    const wrapper = mountField();

    expect(input(wrapper).value).toBe('9:30 AM');
    expect(input(wrapper).type).toBe('text');
    expect(wrapper.find('input[type="time"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('is labelled "Select time" unless given a label, in English and Hindi', async () => {
    const wrapper = mountField();
    expect(wrapper.find('label').text()).toBe('Select time');

    i18n.global.locale.value = 'hi';
    await flushPromises();
    expect(wrapper.find('label').text()).toBe('समय चुनें');

    await wrapper.setProps({ label: 'Time' });
    expect(wrapper.find('label').text()).toBe('Time');
    wrapper.unmount();
  });

  it("titles the picker in the app's words, with no missing-message warning, whatever its label", async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const wrapper = mountField({ label: 'Custom' });

    await pressEnter(wrapper);

    expect(wrapper.findComponent(VTimePicker).exists()).toBe(true);
    expect(warn).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('opens the time picker from the keyboard with Enter, and its Done button closes it', async () => {
    const wrapper = mountField();

    await pressEnter(wrapper);
    const picker = wrapper.findComponent(VTimePicker);
    expect(picker.exists()).toBe(true);

    const done = picker.findAll('button').find((button) => button.text() === 'Done');
    expect(done).toBeDefined();
    await done?.trigger('click');
    await flushPromises();

    expect(wrapper.findComponent(VTimePicker).isVisible()).toBe(false);
    wrapper.unmount();
  });

  it("emits the picked time as 'HH:mm', and keeps the last full time when the picker is cleared", async () => {
    const wrapper = mountField();
    await pressEnter(wrapper);

    const picker = wrapper.findComponent(VTimePicker);
    picker.vm.$emit('update:modelValue', '14:05');
    picker.vm.$emit('update:modelValue', null);
    await flushPromises();

    expect(wrapper.emitted('update:modelValue')).toEqual([['14:05']]);
    wrapper.unmount();
  });

  it('shows nothing for no time', () => {
    const wrapper = mountField({ modelValue: '' });

    expect(input(wrapper).value).toBe('');
    wrapper.unmount();
  });

  it("when clearable, clearing emits '' (no time)", async () => {
    const wrapper = mountField({ clearable: true });

    await wrapper.find('.v-field__clearable .v-icon').trigger('click');
    await flushPromises();

    expect(wrapper.emitted('update:modelValue')).toEqual([['']]);
    wrapper.unmount();
  });

  it('when disabled, shows no time and opens no picker', async () => {
    const wrapper = mountField({ disabled: true });

    await pressEnter(wrapper);

    expect(input(wrapper).value).toBe('');
    expect(input(wrapper).disabled).toBe(true);
    expect(wrapper.findComponent(VTimePicker).exists()).toBe(false);
    wrapper.unmount();
  });

  it('when read-only (a save in flight), keeps the time, offers no clear and opens no picker', async () => {
    const wrapper = mountField({ readonly: true, clearable: true });

    await pressEnter(wrapper);

    expect(input(wrapper).value).toBe('9:30 AM');
    expect(wrapper.find('.v-field__clearable').exists()).toBe(false);
    expect(wrapper.findComponent(VTimePicker).exists()).toBe(false);
    wrapper.unmount();
  });
});
