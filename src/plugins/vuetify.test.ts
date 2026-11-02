import { afterEach, describe, expect, it } from 'vitest';
import { i18n } from './i18n';
import { toAppMessageKey, vuetify } from './vuetify';

describe('vuetify locale', () => {
  afterEach(() => {
    i18n.global.locale.value = 'en';
  });

  it('reads Vuetify keys from the vuetify namespace of the app locale files', () => {
    expect(toAppMessageKey('$vuetify.calendar.today')).toBe('vuetify.calendar.today');
    expect(toAppMessageKey('calendar.today')).toBe('calendar.today');
  });

  it('follows the app language: Vuetify words switch to Hindi with vue-i18n', () => {
    expect(vuetify.locale.current.value).toBe('en');
    expect(vuetify.locale.t('$vuetify.calendar.today')).toBe('Today');

    i18n.global.locale.value = 'hi';

    expect(vuetify.locale.current.value).toBe('hi');
    expect(vuetify.locale.t('$vuetify.calendar.today')).toBe('आज');
    expect(vuetify.locale.t('$vuetify.calendar.moreEvents', 3)).toBe('3 और');
    expect(vuetify.locale.t('$vuetify.datePicker.title')).toBe('तारीख चुनें');
  });

  it('shares one language with vue-i18n: switching Vuetify switches the app too', () => {
    vuetify.locale.current.value = 'hi';

    expect(i18n.global.locale.value).toBe('hi');
    expect(i18n.global.t('vuetify.calendar.today')).toBe('आज');

    vuetify.locale.current.value = 'en';

    expect(i18n.global.locale.value).toBe('en');
  });
});
