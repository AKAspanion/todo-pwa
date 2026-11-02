/**
 * Calendar dates and times as the user sees them. A task's `date` ('YYYY-MM-DD') and `time`
 * ('HH:mm') are wall-clock values in the device's local time zone (D1): they are never parsed as
 * UTC. Only `computeRemindAt` turns them into an instant, through the task's IANA `timeZone` (P6).
 */
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/hi';
import enDates from '@/i18n/locales/en/dates.json';
import hiDates from '@/i18n/locales/hi/dates.json';
import type { Task } from '@/types/models';

export type DateLocale = 'en' | 'hi';

const RELATIVE_DAY_NAMES: Record<DateLocale, typeof enDates> = { en: enDates, hi: hiDates };
/** Intl locale tags for times, which dayjs's Hindi locale has no AM/PM words for. */
const TIME_LOCALE_TAGS: Record<DateLocale, string> = { en: 'en-US', hi: 'hi-IN' };

/** A reminder is due this long before the task (P5, P6). */
export const REMINDER_LEAD_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
/** The midnight timer fires this long after midnight, so a slightly early timer still sees the new day. */
const MIDNIGHT_SLACK_MS = 1000;

interface Ymd {
  y: number;
  m: number;
  d: number;
}
interface Hm {
  h: number;
  min: number;
}

/** The parts of a real calendar date written as 'YYYY-MM-DD', or null. */
export function parseYmd(ymd: unknown): Ymd | null {
  if (typeof ymd !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (y < 1000) return null;
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return { y, m, d };
}

/** The parts of a 24-hour time written as 'HH:mm' (or 'H:mm'), or null. */
export function parseHm(hhmm: unknown): Hm | null {
  if (typeof hhmm !== 'string') return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!match) return null;
  const [h, min] = [Number(match[1]), Number(match[2])];
  return h <= 23 && min <= 59 ? { h, min } : null;
}

/** The day at local midnight, never at UTC midnight. Invalid for anything but a real date. */
export function parseLocalDate(ymd: string): Dayjs {
  const parts = parseYmd(ymd);
  if (!parts) return dayjs(new Date(Number.NaN));
  const date = new Date(2000, 0, 1);
  date.setFullYear(parts.y, parts.m - 1, parts.d);
  date.setHours(0, 0, 0, 0);
  return dayjs(date);
}

export function todayYmd(now: Date = new Date()): string {
  return dayjs(now).format('YYYY-MM-DD');
}

/** Whole calendar days from `from` to `to`, whatever DST does to the hours between them. */
function daysBetween(from: Ymd, to: Ymd): number {
  return Math.round(
    (Date.UTC(to.y, to.m - 1, to.d) - Date.UTC(from.y, from.m - 1, from.d)) / DAY_MS,
  );
}

/** 'today', 'tomorrow' or 'yesterday' (D2), else the weekday and date, such as 'Thursday, 5 Nov'. */
export function relativeDayLabel(ymd: string, locale: DateLocale, now: Date = new Date()): string {
  const day = parseYmd(ymd);
  const today = parseYmd(todayYmd(now));
  if (!day || !today) return '';
  const names = RELATIVE_DAY_NAMES[locale];
  switch (daysBetween(today, day)) {
    case 0:
      return names.today;
    case 1:
      return names.tomorrow;
    case -1:
      return names.yesterday;
    default:
      return parseLocalDate(ymd).locale(locale).format('dddd, D MMM');
  }
}

/** '21:05' as '9:05 PM' (English) or '9:05 pm' (Hindi); '' for anything but a valid time. */
export function formatTime12(hhmm: string, locale: DateLocale): string {
  const time = parseHm(hhmm);
  if (!time) return '';
  const text = new Intl.DateTimeFormat(TIME_LOCALE_TAGS[locale], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2000, 0, 1, time.h, time.min)));
  // ICU puts a narrow no-break space before AM/PM; a plain space wraps and matches the old app.
  return text.replace(/[  ]/g, ' ');
}

/** 'Thursday, 5 November 2026', in the locale's own words and without ordinals (D4). */
export function formatLongDate(ymd: string, locale: DateLocale): string {
  const day = parseLocalDate(ymd);
  return day.isValid() ? day.locale(locale).format('dddd, D MMMM YYYY') : '';
}

/** The device's IANA time zone, such as 'Asia/Kolkata'. */
export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

const zoneFormatters = new Map<string, Intl.DateTimeFormat>();

function zoneFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = zoneFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    zoneFormatters.set(timeZone, formatter);
  }
  return formatter;
}

/** Whether `timeZone` is an IANA zone this browser knows. */
export function isValidTimeZone(timeZone: unknown): timeZone is string {
  if (typeof timeZone !== 'string' || timeZone === '') return false;
  try {
    zoneFormatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

/** How far `timeZone`'s wall clock is ahead of UTC at the instant `utcMs`. */
function zoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts: Record<string, number> = {};
  for (const part of zoneFormatter(timeZone).formatToParts(new Date(utcMs))) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
  }
  const wall = Date.UTC(
    parts.year ?? 0,
    (parts.month ?? 1) - 1,
    parts.day ?? 1,
    parts.hour ?? 0,
    parts.minute ?? 0,
    parts.second ?? 0,
  );
  return wall - Math.floor(utcMs / 1000) * 1000;
}

/**
 * The instant at which `timeZone`'s wall clock shows the given date and time. A time skipped by a
 * DST change resolves to the instant just after the gap. Throws a RangeError for an unknown zone.
 */
export function zonedTimeToUtc(day: Ymd, time: Hm & { s?: number }, timeZone: string): Date {
  const wall = Date.UTC(day.y, day.m - 1, day.d, time.h, time.min, time.s ?? 0);
  let utc = wall - zoneOffsetMs(wall, timeZone);
  const offsetThen = zoneOffsetMs(utc, timeZone);
  if (wall - utc !== offsetThen) utc = wall - offsetThen;
  return new Date(utc);
}

/**
 * When a task's reminder is due: its local date and time in `t.timeZone`, less one hour, as a UTC
 * instant (P6). Null for indefinite and done tasks, and for a task without a usable date, time or
 * zone.
 */
export function computeRemindAt(
  t: Pick<Task, 'date' | 'time' | 'indefinite' | 'status' | 'timeZone'>,
): Date | null {
  if (t.indefinite || t.status === 'done') return null;
  const day = parseYmd(t.date);
  const time = parseHm(t.time);
  if (!day || !time || !isValidTimeZone(t.timeZone)) return null;
  return new Date(zonedTimeToUtc(day, time, t.timeZone).getTime() - REMINDER_LEAD_MS);
}

function msUntilNextLocalMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}

/**
 * Calls `cb` when the local day changes: at local midnight, and when the app becomes visible
 * after the day changed while it was hidden (D3). Returns a function that stops it.
 */
export function onDayChange(cb: () => void): () => void {
  let lastDay = todayYmd();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const check = (): void => {
    const day = todayYmd();
    if (day === lastDay) return;
    lastDay = day;
    cb();
  };
  const arm = (): void => {
    clearTimeout(timer);
    timer = setTimeout(
      () => {
        check();
        arm();
      },
      msUntilNextLocalMidnight(new Date()) + MIDNIGHT_SLACK_MS,
    );
  };
  const onVisibilityChange = (): void => {
    if (document.visibilityState !== 'visible') return;
    check();
    // A timer set before the device slept may be far off; set it again from now.
    arm();
  };

  document.addEventListener('visibilitychange', onVisibilityChange);
  arm();
  return () => {
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
