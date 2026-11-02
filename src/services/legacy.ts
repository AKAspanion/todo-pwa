/**
 * Firestore documents as the app's models. Every field is read defensively: documents written by
 * the old app stay readable (§10), and a malformed field never breaks the list it is in (D6).
 *
 * Old shapes accepted:
 * - tasks: `date`/`time` of 'NA', `type` as a list of `types/{id}` DocumentReferences, no
 *   `description`, `type`, `timeZone`, `remindAt` or `reminded`;
 * - notifications: `timestamp` as India-time `toLocaleString()` text instead of `createdAt`.
 */
import { Timestamp, type DocumentData } from 'firebase/firestore';
import { isValidTimeZone, parseHm, parseYmd, zonedTimeToUtc } from '@/lib/dates';
import type { AppNotification, Label, Task } from '@/types/models';

/** The zone the old app (and its reminder function) assumed for every task (§11.3). */
export const LEGACY_TIME_ZONE = 'Asia/Kolkata';

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function ymdOrNull(value: unknown): string | null {
  return parseYmd(value) ? (value as string) : null;
}

/** 'HH:mm', also from an old 'H:mm'; null for 'NA' and anything else. */
function hmOrNull(value: unknown): string | null {
  const time = parseHm(value);
  if (!time) return null;
  return `${String(time.h).padStart(2, '0')}:${String(time.min).padStart(2, '0')}`;
}

/** A Timestamp (or a Date) as a valid Date, else null. */
function dateOrNull(value: unknown): Date | null {
  let date: unknown = value;
  if (value instanceof Timestamp) {
    date = value.toDate();
  } else if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    // A Timestamp from another copy of the SDK, which `instanceof` doesn't recognise.
    date = (value.toDate as () => unknown)();
  }
  return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
}

/** The id at the end of a reference: a DocumentReference, or a 'types/{id}' path. */
function referencedId(value: unknown): string {
  if (typeof value === 'string') return value.split('/').pop() ?? '';
  if (typeof value === 'object' && value !== null && 'id' in value) return text(value.id);
  return '';
}

/** `labelIds`, or the ids of the old `type` references; distinct, non-empty, in order. */
function labelIdsOf(data: DocumentData): string[] {
  const labelIds: unknown = data.labelIds;
  const legacyType: unknown = data.type;
  let ids: string[] = [];
  if (Array.isArray(labelIds)) {
    ids = labelIds.map((id: unknown) => text(id));
  } else if (Array.isArray(legacyType)) {
    ids = legacyType.map((reference: unknown) => referencedId(reference));
  }
  return [...new Set(ids.filter((id) => id !== ''))];
}

export function taskFromDoc(id: string, data: DocumentData): Task {
  const date = ymdOrNull(data.date);
  // An old task without a real date ('NA') can only be shown as indefinite.
  const indefinite = data.indefinite === true || date === null;
  const timeZone: unknown = data.timeZone;
  return {
    id,
    uid: text(data.uid),
    title: text(data.title),
    description: text(data.description),
    status: data.status === 'done' ? 'done' : 'todo',
    indefinite,
    date: indefinite ? null : date,
    time: indefinite ? null : hmOrNull(data.time),
    timeZone: isValidTimeZone(timeZone) ? timeZone : LEGACY_TIME_ZONE,
    remindAt: dateOrNull(data.remindAt),
    reminded: data.reminded === true,
    labelIds: labelIdsOf(data),
  };
}

export function labelFromDoc(id: string, data: DocumentData): Label {
  return { id, uid: text(data.uid), label: text(data.label), color: text(data.color) };
}

/**
 * The old reminder function's `toLocaleString()` text, such as '11/2/2026, 3:30:00 PM', read as
 * India time. Other text is tried as a date string. Null when neither works.
 */
function parseLegacyTimestamp(value: string): Date | null {
  const match =
    /^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?$/i.exec(
      value.trim(),
    );
  if (match) {
    // An absent group (no seconds) counts as 0.
    const [month, day, year, hour, minute, s] = match
      .slice(1, 7)
      .map((part) => (part === undefined ? 0 : Number(part)));
    const meridiem = match[7]?.toUpperCase();
    let h = hour ?? 0;
    if (meridiem !== undefined && (h < 1 || h > 12)) return null;
    if (meridiem === 'PM' && h < 12) h += 12;
    if (meridiem === 'AM' && h === 12) h = 0;
    const ymd = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const date = parseYmd(ymd);
    const time = parseHm(`${h}:${String(minute).padStart(2, '0')}`);
    if (date && time && s !== undefined && s <= 59) {
      return zonedTimeToUtc(date, { ...time, s }, LEGACY_TIME_ZONE);
    }
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

export function notificationFromDoc(id: string, data: DocumentData): AppNotification {
  const timestamp: unknown = data.timestamp;
  let createdAt = dateOrNull(data.createdAt) ?? dateOrNull(timestamp);
  if (!createdAt && typeof timestamp === 'string') createdAt = parseLegacyTimestamp(timestamp);
  if (!createdAt) {
    console.warn('[notifications] unreadable timestamp on', id);
    createdAt = new Date(0);
  }
  const taskId = text(data.taskId);
  return {
    id,
    uid: text(data.uid),
    title: text(data.title),
    body: text(data.body),
    taskId: taskId === '' ? null : taskId,
    createdAt,
  };
}
