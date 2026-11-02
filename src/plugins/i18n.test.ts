import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppI18n } from './i18n';

/** Imports the plugin afresh, as the app does on load, so it reads localStorage again. */
async function loadAppI18n() {
  vi.resetModules();
  const { i18n } = await import('./i18n');
  return i18n;
}

/** Every key path in a messages object, such as `nav.home`. */
function keyPaths(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('i18n plugin', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads the locale saved in localStorage "lang"', async () => {
    localStorage.setItem('lang', 'hi');

    const i18n = await loadAppI18n();

    expect(i18n.global.locale.value).toBe('hi');
  });

  it('starts in English when no locale is saved', async () => {
    const i18n = await loadAppI18n();

    expect(i18n.global.locale.value).toBe('en');
  });

  it.each(['fr', '', '__proto__', 'constructor', 'HI'])(
    'ignores a saved locale it does not support (%j) and starts in English',
    async (saved) => {
      localStorage.setItem('lang', saved);

      const i18n = await loadAppI18n();

      expect(i18n.global.locale.value).toBe('en');
    },
  );

  it('falls back to English', async () => {
    const i18n = await loadAppI18n();

    expect(i18n.global.fallbackLocale.value).toBe('en');
  });

  it('renders the English text, not the key, for a key that exists only in English', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const i18n = createAppI18n({ en: { common: { close: 'Close' } }, hi: { common: {} } }, 'hi');

    expect(i18n.global.t('common.close')).toBe('Close');
    // vue-i18n reports the fallback in development, which is how a missing Hindi key gets noticed.
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("Fall back to translate 'common.close'"),
    );
  });

  it('merges each locales/<lang>/<feature>.json under its feature name', async () => {
    const i18n = await loadAppI18n();

    expect(i18n.global.t('common.close')).toBe('Close');
    i18n.global.locale.value = 'hi';
    expect(i18n.global.t('common.close')).toBe('क्लोज');
  });

  it('has every key in both English and Hindi, file by file', () => {
    const files = import.meta.glob<unknown>('../i18n/locales/*/*.json', {
      eager: true,
      import: 'default',
    });
    const features = (lang: string) =>
      Object.keys(files)
        .filter((path) => path.includes(`/locales/${lang}/`))
        .map((path) => path.slice(path.lastIndexOf('/') + 1))
        .sort();
    expect(features('en').length).toBeGreaterThan(0);
    expect(features('hi')).toEqual(features('en'));
    for (const feature of features('en')) {
      const keys = (lang: string) => keyPaths(files[`../i18n/locales/${lang}/${feature}`]).sort();
      expect(keys('hi'), `hi/${feature}`).toEqual(keys('en'));
    }
  });
});
