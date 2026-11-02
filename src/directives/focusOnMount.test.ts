import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, withDirectives } from 'vue';
import { vFocusOnMount } from './focusOnMount';

/** A wrapper element holding one input, as a Vuetify field renders. */
const Field = defineComponent({
  setup() {
    return () =>
      withDirectives(h('div', { class: 'field' }, [h('input', { id: 'target' })]), [
        [vFocusOnMount],
      ]);
  },
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('vFocusOnMount', () => {
  it("focuses the field's input as soon as it is mounted", () => {
    const wrapper = mount(Field, { attachTo: document.body });

    expect(document.activeElement?.id).toBe('target');
    wrapper.unmount();
  });

  it('leaves the focus in another field the user is typing in', () => {
    const other = document.createElement('textarea');
    document.body.append(other);
    other.focus();

    const wrapper = mount(Field, { attachTo: document.body });

    expect(document.activeElement).toBe(other);
    wrapper.unmount();
  });

  it('takes the focus from a button, such as the one that opened the field', () => {
    const button = document.createElement('button');
    document.body.append(button);
    button.focus();

    const wrapper = mount(Field, { attachTo: document.body });

    expect(document.activeElement?.id).toBe('target');
    wrapper.unmount();
  });
});
