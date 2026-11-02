import '@mdi/font/css/materialdesignicons.css';
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import type { Theme } from '@/stores/ui';

/** The key the old app used too: `'true'` or `'false'`. */
export const THEME_STORAGE_KEY = 'dark';

/** The app's one theme colour (spec W3), shared with the web manifest. */
export const THEME_COLOR = '#1976D2';
export const BACKGROUND_COLOR = '#FAFAFA';

/**
 * The theme this device saved. As in the old app, only `'false'` means light: a device that
 * never chose, or saved anything else, gets dark.
 */
export function storedTheme(): Theme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'false' ? 'light' : 'dark';
  } catch (error) {
    // Storage can be blocked (private mode, disabled site data): use the old app's default.
    console.warn('[theme] could not read the saved theme:', (error as Error).name);
    return 'dark';
  }
}

export const vuetify = createVuetify({
  theme: {
    defaultTheme: storedTheme(),
    themes: {
      light: { colors: { primary: THEME_COLOR, background: BACKGROUND_COLOR } },
      dark: { colors: { primary: THEME_COLOR } },
    },
  },
});
