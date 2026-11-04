/// <reference types="node" />
import { afterEach, describe, expect, it } from 'vitest';
import { i18n } from './i18n';
import { readFileSync } from 'node:fs';
import { toAppMessageKey, vuetify, storedTheme, THEME_COLOR, BACKGROUND_COLOR } from './vuetify';

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

describe('vuetify look (restore the original design, 4.1)', () => {
  const shared = {
    secondary: '#424242',
    error: '#FF5252',
    info: '#2196F3',
    success: '#4CAF50',
    warning: '#FB8C00',
  };

  it('uses the md2 blueprint: uppercase buttons and filled fields', () => {
    const defaults = vuetify.defaults.value ?? {};
    expect(defaults.VBtn?.class).toBe('text-uppercase');
    expect(defaults.VTextField?.variant).toBe('filled');
    expect(defaults.VSelect?.variant).toBe('filled');
  });

  it("has Vuetify 2.6.10's light colours with the old primary", () => {
    const colors = vuetify.theme.themes.value.light.colors;
    expect(colors).toMatchObject({
      ...shared,
      primary: '#1976D2',
      accent: '#82B1FF',
      background: '#FFFFFF',
      surface: '#FFFFFF',
    });
  });

  it("has Vuetify 2.6.10's dark colours, whose primary is its dark preset's, as the old app's", () => {
    const colors = vuetify.theme.themes.value.dark.colors;
    expect(colors).toMatchObject({
      ...shared,
      primary: '#2196F3',
      accent: '#FF4081',
      background: '#121212',
      surface: '#1E1E1E',
    });
  });

  it('defaults to dark unless the device saved "false"', () => {
    localStorage.removeItem('dark');
    expect(storedTheme()).toBe('dark');
    localStorage.setItem('dark', 'true');
    expect(storedTheme()).toBe('dark');
    localStorage.setItem('dark', 'false');
    expect(storedTheme()).toBe('light');
    localStorage.removeItem('dark');
  });

  it('keeps the manifest colours', () => {
    expect(THEME_COLOR).toBe('#1976D2');
    expect(BACKGROUND_COLOR).toBe('#FAFAFA');
    const config = readFileSync('vite.config.ts', 'utf8');
    expect(config).toContain("theme_color: '#1976D2'");
    expect(config).toContain("background_color: '#FAFAFA'");
  });

  it('carries the old shimmer, ellipsis and strike-through rules', () => {
    const css = readFileSync('src/assets/style.css', 'utf8');
    for (const rule of ['.selectable', '.overflow-text', '.line-through-text', '.shimmer']) {
      expect(css).toContain(rule);
    }
    expect(css).toContain('.v-theme--dark .animate');
    expect(css).not.toContain('small-icon-shimmer');
  });
});
