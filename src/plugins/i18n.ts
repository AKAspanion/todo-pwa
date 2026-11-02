import { createI18n } from 'vue-i18n';
import type { Locale } from '@/stores/ui';

/** Strings, nested by key, as in `src/i18n/locales/<lang>/<feature>.json`. */
export interface LocaleMessages {
  [key: string]: string | LocaleMessages;
}

export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'hi'];
export const DEFAULT_LOCALE: Locale = 'en';
/** The key the old app used too, so a returning user keeps their language. */
export const LOCALE_STORAGE_KEY = 'lang';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** The locale this device saved, or English when it saved none, or something unsupported. */
export function storedLocale(): Locale {
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(saved) ? saved : DEFAULT_LOCALE;
  } catch (error) {
    // Storage can be blocked (private mode, disabled site data): start in English.
    console.warn('[i18n] could not read the saved locale:', (error as Error).name);
    return DEFAULT_LOCALE;
  }
}

/**
 * Every locale file, merged per language. Each `<feature>.json` becomes the `<feature>`
 * namespace, so `locales/en/common.json` with `{ "close": "Close" }` gives `common.close`, and
 * screen tasks never share a file.
 */
export function mergeLocaleFiles(
  files: Record<string, { default: LocaleMessages }>,
): Record<Locale, LocaleMessages> {
  const messages: Record<Locale, LocaleMessages> = { en: {}, hi: {} };
  for (const [path, file] of Object.entries(files)) {
    const match = /\/locales\/([^/]+)\/([^/]+)\.json$/.exec(path);
    if (!match) continue;
    const [, lang, feature] = match;
    if (isLocale(lang) && feature) messages[lang][feature] = file.default;
  }
  return messages;
}

export function createAppI18n(messages: Record<Locale, LocaleMessages>, locale: Locale) {
  const options = {
    legacy: false as const,
    locale: locale as string,
    fallbackLocale: DEFAULT_LOCALE as string,
    messages: messages as Record<string, LocaleMessages>,
  };
  // Composition API mode (`legacy: false`): `i18n.global.locale` is a ref.
  return createI18n(options);
}

export const i18n = createAppI18n(
  mergeLocaleFiles(
    import.meta.glob<{ default: LocaleMessages }>('../i18n/locales/*/*.json', { eager: true }),
  ),
  storedLocale(),
);
