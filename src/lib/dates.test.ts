import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  computeRemindAt,
  formatLongDate,
  formatTime12,
  onDayChange,
  parseLocalDate,
  relativeDayLabel,
  todayYmd,
} from './dates';

/** Runs the rest of the test as a device in `zone` (Node re-reads TZ when it changes). */
function useTimeZone(zone: string): void {
  vi.stubEnv('TZ', zone);
}

/** A local wall-clock instant in the current TZ. */
function local(y: number, m: number, d: number, h = 0, min = 0): Date {
  return new Date(y, m - 1, d, h, min);
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('parseLocalDate and relativeDayLabel (D1)', () => {
  it.each(['America/New_York', 'Pacific/Kiritimati'])(
    'reads 2026-11-02 as Nov 2 local, and as "today" at 09:00 local, in %s',
    (zone) => {
      useTimeZone(zone);

      const day = parseLocalDate('2026-11-02');

      expect([day.year(), day.month() + 1, day.date()]).toEqual([2026, 11, 2]);
      expect([day.hour(), day.minute()]).toEqual([0, 0]);
      expect(relativeDayLabel('2026-11-02', 'en', local(2026, 11, 2, 9))).toBe('today');
    },
  );

  it('gives an invalid day for text that is not a real YYYY-MM-DD date', () => {
    expect(parseLocalDate('NA').isValid()).toBe(false);
    expect(parseLocalDate('2026-02-30').isValid()).toBe(false);
  });

  it('todayYmd is the local calendar day', () => {
    useTimeZone('Pacific/Kiritimati');
    expect(todayYmd(local(2026, 11, 2, 23, 30))).toBe('2026-11-02');
  });
});

describe('relativeDayLabel (D2)', () => {
  const now = local(2026, 11, 2, 9);

  it('names today, tomorrow and yesterday in English', () => {
    expect(relativeDayLabel('2026-11-02', 'en', now)).toBe('today');
    expect(relativeDayLabel('2026-11-03', 'en', now)).toBe('tomorrow');
    expect(relativeDayLabel('2026-11-01', 'en', now)).toBe('yesterday');
  });

  it('names tomorrow "कल" in Hindi, and today as the whole word "आज"', () => {
    expect(relativeDayLabel('2026-11-03', 'hi', now)).toBe('कल');
    expect(relativeDayLabel('2026-11-02', 'hi', now)).toBe('आज');
  });

  it('gives the weekday and date for other days', () => {
    expect(relativeDayLabel('2026-11-05', 'en', now)).toBe('Thursday, 5 Nov');
  });

  it('never cuts a Hindi weekday mid-word', () => {
    // 2026-11-05 is a Thursday: the whole Hindi weekday and the day number are there.
    expect(relativeDayLabel('2026-11-05', 'hi', now)).toMatch(/^गुरूवार, 5 /);
  });

  it('counts whole calendar days across a DST change', () => {
    useTimeZone('America/New_York');
    // 2026-11-01 is the day DST ends in New York (a 25-hour day).
    expect(relativeDayLabel('2026-11-02', 'en', local(2026, 11, 1, 23, 30))).toBe('tomorrow');
  });
});

describe('formatTime12 and formatLongDate', () => {
  it('formats 24-hour time as 12-hour time', () => {
    expect(formatTime12('21:05', 'en')).toBe('9:05 PM');
    expect(formatTime12('nonsense', 'en')).toBe('');
  });

  it('formats a long date without English ordinals in Hindi (D4)', () => {
    expect(formatLongDate('2026-11-05', 'en')).toBe('Thursday, 5 November 2026');
    expect(formatLongDate('2026-11-05', 'hi')).toBe('गुरूवार, 5 नवम्बर 2026');
  });
});

describe('computeRemindAt (P6)', () => {
  const base = { indefinite: false, status: 'todo' as const };

  it('is 09:00 in Asia/Kolkata, the due instant, as UTC', () => {
    const at = computeRemindAt({
      ...base,
      date: '2026-11-02',
      time: '09:00',
      timeZone: 'Asia/Kolkata',
    });
    expect(at?.toISOString()).toBe('2026-11-02T03:30:00.000Z');
  });

  it('uses the offset in force on a DST-start day in America/New_York', () => {
    const at = computeRemindAt({
      ...base,
      date: '2026-03-08',
      time: '09:00',
      timeZone: 'America/New_York',
    });
    expect(at?.toISOString()).toBe('2026-03-08T13:00:00.000Z');
  });

  it('does not depend on the device time zone', () => {
    useTimeZone('Pacific/Kiritimati');
    const at = computeRemindAt({
      ...base,
      date: '2026-11-02',
      time: '09:00',
      timeZone: 'Asia/Kolkata',
    });
    expect(at?.toISOString()).toBe('2026-11-02T03:30:00.000Z');
  });

  it.each([
    ['indefinite', { indefinite: true }],
    ['done', { status: 'done' as const }],
    ['missing date', { date: null }],
    ['missing time', { time: null }],
    ['legacy NA date', { date: 'NA' }],
    ['an unknown time zone', { timeZone: 'Not/AZone' }],
  ])('is null for %s', (_name, change) => {
    const task = {
      ...base,
      date: '2026-11-02' as string | null,
      time: '09:00' as string | null,
      timeZone: 'Asia/Kolkata',
      ...change,
    };
    expect(computeRemindAt(task)).toBeNull();
  });
});

describe('onDayChange (D3)', () => {
  function setVisibility(state: DocumentVisibilityState): void {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
    document.dispatchEvent(new Event('visibilitychange'));
  }

  afterEach(() => {
    Reflect.deleteProperty(document, 'visibilityState');
  });

  it('fires once when the clock crosses local midnight', () => {
    vi.useFakeTimers();
    vi.setSystemTime(local(2026, 11, 2, 23, 59));
    const cb = vi.fn();
    const stop = onDayChange(cb);

    vi.advanceTimersByTime(2 * 60 * 1000);
    expect(cb).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(cb).toHaveBeenCalledTimes(1);
    stop();
  });

  it('fires on visibilitychange only when the day changed while hidden', () => {
    vi.useFakeTimers();
    vi.setSystemTime(local(2026, 11, 2, 10));
    const cb = vi.fn();
    const stop = onDayChange(cb);

    setVisibility('visible');
    expect(cb).not.toHaveBeenCalled();

    vi.setSystemTime(local(2026, 11, 3, 10));
    setVisibility('visible');
    expect(cb).toHaveBeenCalledTimes(1);

    setVisibility('visible');
    expect(cb).toHaveBeenCalledTimes(1);
    stop();
  });

  it('stops listening once unsubscribed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(local(2026, 11, 2, 23, 59));
    const cb = vi.fn();
    onDayChange(cb)();

    vi.advanceTimersByTime(2 * 60 * 1000);
    vi.setSystemTime(local(2026, 11, 4, 10));
    setVisibility('visible');
    expect(cb).not.toHaveBeenCalled();
  });
});
