import { defineStore } from 'pinia';
import { LOCALE_STORAGE_KEY, i18n } from '@/plugins/i18n';
import { THEME_STORAGE_KEY, vuetify } from '@/plugins/vuetify';

export type Locale = 'en' | 'hi';
export type Theme = 'light' | 'dark';
export interface Snack {
  text: string;
  actionLabel?: string;
  action?: () => void;
  timeoutMs: number;
}

/** How long a snack stays when the caller gives no timeout. */
export const DEFAULT_SNACK_TIMEOUT_MS = 5000;

interface UiState {
  locale: Locale;
  theme: Theme;
  snack: Snack | null;
}

function save(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    // Storage can be blocked or full: the choice still applies until the page reloads.
    console.warn(`[ui] could not save "${key}":`, (error as Error).name);
  }
}

/**
 * Device-wide UI state: language and theme (remembered on this device, spec §3.9) and the one
 * snackbar. The plugins read the saved choices at start-up, so the state starts from them, and
 * `$reset()` (on sign-out) clears only the snack.
 */
export const useUiStore = defineStore('ui', {
  state: (): UiState => ({
    locale: i18n.global.locale.value as Locale,
    theme: vuetify.theme.global.name.value === 'light' ? 'light' : 'dark',
    snack: null,
  }),
  actions: {
    setLocale(l: Locale): void {
      this.locale = l;
      i18n.global.locale.value = l;
      document.documentElement.lang = l;
      save(LOCALE_STORAGE_KEY, l);
    },
    setTheme(t: Theme): void {
      this.theme = t;
      void vuetify.theme.change(t);
      save(THEME_STORAGE_KEY, String(t === 'dark'));
    },
    showSnack(
      text: string,
      opts: { actionLabel?: string; action?: () => void; timeoutMs?: number } = {},
    ): void {
      const snack: Snack = { text, timeoutMs: opts.timeoutMs ?? DEFAULT_SNACK_TIMEOUT_MS };
      if (opts.actionLabel !== undefined) snack.actionLabel = opts.actionLabel;
      if (opts.action !== undefined) snack.action = opts.action;
      this.snack = snack;
    },
    dismissSnack(): void {
      this.snack = null;
    },
  },
});
