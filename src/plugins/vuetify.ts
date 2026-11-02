import '@mdi/font/css/materialdesignicons.css';
import 'vuetify/styles';
import { useI18n } from 'vue-i18n';
import { createVuetify, type LocaleInstance } from 'vuetify';
import { createVueI18nAdapter } from 'vuetify/locale/adapters/vue-i18n';
import type { Theme } from '@/stores/ui';
import { i18n } from './i18n';

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

/** The prefix Vuetify puts on its own message keys, such as `$vuetify.calendar.today`. */
const VUETIFY_KEY_PREFIX = '$vuetify.';
/**
 * Where those messages live in the app's i18n: `src/i18n/locales/<lang>/vuetify.json`, which the
 * i18n plugin merges under the `vuetify` namespace, like every other feature file.
 */
const APP_KEY_PREFIX = 'vuetify.';

/** A Vuetify message key as the app's i18n stores it: `$vuetify.close` is `vuetify.close`. */
export function toAppMessageKey(key: string): string {
  return key.startsWith(VUETIFY_KEY_PREFIX)
    ? APP_KEY_PREFIX + key.slice(VUETIFY_KEY_PREFIX.length)
    : key;
}

/**
 * The locale instance with Vuetify's keys moved onto the app's. Components that provide their own
 * locale (the calendar, the pickers) get one from `provide`, so it is wrapped too.
 */
function withAppMessageKeys(instance: LocaleInstance): LocaleInstance {
  return {
    ...instance,
    t: (key, ...params) => instance.t(toAppMessageKey(key), ...params),
    provide: (props) => withAppMessageKeys(instance.provide(props)),
  };
}

/**
 * Vuetify follows vue-i18n (D4, D18): its language is `i18n.global.locale`, so the language toggle
 * switches the pickers', the calendar's and the data controls' words and date formats with the
 * rest of the app. Vuetify ships no Hindi, so its messages come from the app's own locale files.
 */
export const vuetifyLocaleAdapter = withAppMessageKeys(createVueI18nAdapter({ i18n, useI18n }));

export const vuetify = createVuetify({
  locale: { adapter: vuetifyLocaleAdapter },
  theme: {
    defaultTheme: storedTheme(),
    themes: {
      light: { colors: { primary: THEME_COLOR, background: BACKGROUND_COLOR } },
      dark: { colors: { primary: THEME_COLOR } },
    },
  },
});
