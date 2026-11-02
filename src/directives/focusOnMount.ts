import type { Directive } from 'vue';

/** Whether `el` takes typed text: a text field, a text area or an editable element. */
function takesText(el: Element | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.matches('input, textarea, select') || el.isContentEditable;
}

/**
 * Focuses the field's input (or textarea) once it is in the page, unless another field already
 * has the focus.
 *
 * Use it instead of Vuetify's `autofocus`, which focuses 50 ms after an IntersectionObserver
 * callback: by then the user may already be typing in the next field, and the rest of what they
 * type lands in the autofocused one.
 */
export const vFocusOnMount: Directive<HTMLElement> = {
  mounted(el) {
    if (takesText(document.activeElement)) return;
    const target = el.matches('input, textarea')
      ? el
      : el.querySelector<HTMLElement>('input, textarea');
    target?.focus();
  },
};
