import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/plugins/i18n';
import { vuetify } from '@/plugins/vuetify';
import { useUiStore } from './ui';

/** Loads the plugins and the store afresh, as the app does on load, so they read localStorage again. */
async function loadAppFresh() {
  vi.resetModules();
  const pinia = await import('pinia');
  pinia.setActivePinia(pinia.createPinia());
  const [{ useUiStore: useFreshUiStore }, { vuetify: freshVuetify }] = await Promise.all([
    import('./ui'),
    import('@/plugins/vuetify'),
  ]);
  return { ui: useFreshUiStore(), vuetify: freshVuetify };
}

describe('ui store', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  describe('theme', () => {
    it('setTheme("dark") saves "true" under "dark" and makes the Vuetify theme dark', () => {
      const ui = useUiStore();
      ui.setTheme('light');

      ui.setTheme('dark');

      expect(localStorage.getItem('dark')).toBe('true');
      expect(ui.theme).toBe('dark');
      expect(vuetify.theme.global.name.value).toBe('dark');
    });

    it('setTheme("light") saves "false" under "dark" and makes the Vuetify theme light', () => {
      const ui = useUiStore();
      ui.setTheme('dark');

      ui.setTheme('light');

      expect(localStorage.getItem('dark')).toBe('false');
      expect(ui.theme).toBe('light');
      expect(vuetify.theme.global.name.value).toBe('light');
    });

    it('loads as light when the old app saved dark = "false"', async () => {
      localStorage.setItem('dark', 'false');

      const app = await loadAppFresh();

      expect(app.ui.theme).toBe('light');
      expect(app.vuetify.theme.global.name.value).toBe('light');
    });

    it('loads as dark when the old app saved dark = "true"', async () => {
      localStorage.setItem('dark', 'true');

      const app = await loadAppFresh();

      expect(app.ui.theme).toBe('dark');
      expect(app.vuetify.theme.global.name.value).toBe('dark');
    });
  });

  describe('locale', () => {
    it('setLocale("hi") saves it under "lang" and switches the i18n locale', () => {
      const ui = useUiStore();

      ui.setLocale('hi');

      expect(localStorage.getItem('lang')).toBe('hi');
      expect(ui.locale).toBe('hi');
      expect(i18n.global.locale.value).toBe('hi');
      ui.setLocale('en');
      expect(i18n.global.locale.value).toBe('en');
    });

    it('loads the saved locale', async () => {
      localStorage.setItem('lang', 'hi');

      const app = await loadAppFresh();

      expect(app.ui.locale).toBe('hi');
    });
  });

  describe('snack', () => {
    it('showSnack without a timeout shows the text for 5000 ms', () => {
      const ui = useUiStore();

      ui.showSnack('Saved');

      expect(ui.snack).toEqual({ text: 'Saved', timeoutMs: 5000 });
    });

    it('showSnack keeps the action, its label and the timeout it was given', () => {
      const ui = useUiStore();
      const action = vi.fn();

      ui.showSnack('A new version is available', { actionLabel: 'Reload', action, timeoutMs: -1 });

      expect(ui.snack).toEqual({
        text: 'A new version is available',
        actionLabel: 'Reload',
        action,
        timeoutMs: -1,
      });
    });

    it('dismissSnack clears the snack', () => {
      const ui = useUiStore();
      ui.showSnack('Saved');

      ui.dismissSnack();

      expect(ui.snack).toBeNull();
    });

    it("$reset clears the snack but keeps this device's locale and theme", () => {
      const ui = useUiStore();
      ui.setLocale('hi');
      ui.setTheme('dark');
      ui.showSnack('Saved');

      ui.$reset();

      expect(ui.snack).toBeNull();
      expect(ui.locale).toBe('hi');
      expect(ui.theme).toBe('dark');
      ui.setLocale('en');
    });
  });
});
