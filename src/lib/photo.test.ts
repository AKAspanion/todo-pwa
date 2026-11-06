import { describe, expect, it, vi } from 'vitest';
import { httpsPhotoUrl, isHttpsUrl } from './photo';

describe('isHttpsUrl', () => {
  it.each([
    ['https://example.com/me.png', true],
    ['  https://example.com/me.png  ', true],
    ['http://example.com/me.png', false],
    ['javascript:alert(1)', false],
    ['example.com/me.png', false],
    ['', false],
  ])('%j is %s', (value, expected) => {
    expect(isHttpsUrl(value)).toBe(expected);
  });

  it('logs nothing, so a field can check as the user types', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    isHttpsUrl('not a url');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('httpsPhotoUrl', () => {
  it('keeps an https URL and drops anything else', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(httpsPhotoUrl('https://example.com/me.png')).toBe('https://example.com/me.png');
    expect(httpsPhotoUrl('http://example.com/me.png')).toBeNull();
    expect(httpsPhotoUrl(null)).toBeNull();
  });
});
