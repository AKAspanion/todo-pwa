import { afterEach, describe, expect, it, vi } from 'vitest';
import { DISMISS_DAYS, dismissedRecently, rememberDismissal } from './verifyReminder';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-11-06T10:00:00Z');

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('verifyReminder', () => {
  it('is not dismissed before anything is saved', () => {
    expect(dismissedRecently('ann', NOW)).toBe(false);
  });

  it(`stays dismissed for ${DISMISS_DAYS} days, then shows again`, () => {
    rememberDismissal('ann', NOW);

    expect(dismissedRecently('ann', NOW + (DISMISS_DAYS * DAY_MS - 1))).toBe(true);
    expect(dismissedRecently('ann', NOW + DISMISS_DAYS * DAY_MS)).toBe(false);
  });

  it('keeps each account apart on a shared device', () => {
    rememberDismissal('ann', NOW);

    expect(dismissedRecently('bob', NOW)).toBe(false);
  });

  it.each(['soon', '', '-5'])(
    'treats a saved value it can’t read (%j) as not dismissed',
    (value) => {
      localStorage.setItem('verifyBannerDismissedAt:ann', value);

      expect(dismissedRecently('ann', NOW)).toBe(false);
    },
  );

  it('treats a date in the future, a clock set back, as not dismissed', () => {
    rememberDismissal('ann', NOW + DAY_MS);

    expect(dismissedRecently('ann', NOW)).toBe(false);
  });

  it('shows the banner, and doesn’t throw, when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(() => rememberDismissal('ann', NOW)).not.toThrow();
    expect(dismissedRecently('ann', NOW)).toBe(false);
  });
});
