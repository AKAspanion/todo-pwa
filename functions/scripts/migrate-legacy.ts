/**
 * One-off migration of the old app's data (spec §10, §11.3, P3, P6). The developer runs it once,
 * with admin credentials for the live project (GOOGLE_APPLICATION_CREDENTIALS, or gcloud's
 * application-default login with GOOGLE_CLOUD_PROJECT set):
 *
 *   npm --prefix functions run migrate -- --tz Asia/Kolkata [--dry-run]
 *
 * - Tasks lacking `timeZone`, `remindAt` or `reminded` get the missing ones: `timeZone` is `--tz`,
 *   `remindAt` is the task's due instant, its date and time in its zone as UTC (null for done,
 *   indefinite or undated tasks), `reminded` is false. Fields a task already has are left alone.
 * - Each `fcm/{uid}` token is copied to `users/{uid}/devices/{token}`; null or malformed tokens are
 *   skipped. The `fcm` documents themselves stay.
 * - Notifications without `createdAt` get one from their legacy `timestamp` text, read as wall time
 *   in `--tz`; unreadable ones get epoch 0, so lists ordered by `createdAt` still show them.
 *
 * `--dry-run` reads and counts, and writes nothing. Running it again changes nothing, and a run
 * that stops halfway can simply be run again.
 */
import { basename } from 'node:path';
import { initializeApp } from 'firebase-admin/app';
import {
  FieldPath,
  FieldValue,
  Timestamp,
  getFirestore,
  type DocumentData,
  type Firestore,
  type QueryDocumentSnapshot,
  type WriteBatch,
} from 'firebase-admin/firestore';

export interface MigrationOptions {
  /** IANA zone for tasks and notification timestamps that don't name one. */
  timeZone: string;
  dryRun: boolean;
}

export interface MigrationReport {
  dryRun: boolean;
  tasks: { updated: number; unchanged: number };
  devices: { created: number; existing: number; skipped: number };
  notifications: { updated: number; unchanged: number; unparseable: number };
}

const USAGE = 'Usage: npm --prefix functions run migrate -- --tz <IANA time zone> [--dry-run]';

/** Documents read per query page. */
const PAGE_SIZE = 300;
/** Writes per batch, under Firestore's limit of 500. */
const BATCH_SIZE = 400;
/** The `userAgent` of a device copied from `fcm/{uid}`, which never recorded one. */
const LEGACY_USER_AGENT = 'unknown (migrated from fcm)';
/** FCM registration tokens use only these characters, which also keeps them valid document ids. */
const FCM_TOKEN = /^[\w:-]{1,1024}$/;
/** The longest legacy timestamp text read; `11/22/2026, 11:30:00 PM` is 23 characters. */
const MAX_TIMESTAMP_LENGTH = 64;
/** `toLocaleString('en-US')` as the old function wrote it, e.g. `11/2/2026, 3:30:00 PM`. */
const LEGACY_TIMESTAMP =
  /^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([AaPp][Mm]))?$/;

interface WallTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Reads `--tz <zone>` (required, a valid IANA zone) and `--dry-run`; anything else is refused. */
export function parseArgs(argv: readonly string[]): MigrationOptions {
  let timeZone: string | undefined;
  let dryRun = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--tz') {
      timeZone = argv[i + 1];
      i += 1;
    } else {
      throw new Error(`Unknown argument "${String(arg)}". ${USAGE}`);
    }
  }
  if (timeZone === undefined || !isTimeZone(timeZone)) {
    throw new Error(`--tz needs an IANA time zone such as Asia/Kolkata. ${USAGE}`);
  }
  return { timeZone, dryRun };
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
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
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** How far `timeZone`'s wall clock is ahead of UTC at `instant` (whole seconds), in ms. */
function zoneOffsetMs(instant: number, timeZone: string): number {
  const parts = formatterFor(timeZone).formatToParts(instant);
  const field = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const wallAsUtc = Date.UTC(
    field('year'),
    field('month') - 1,
    field('day'),
    field('hour'),
    field('minute'),
    field('second'),
  );
  return wallAsUtc - instant;
}

/** The UTC instant of a wall-clock time in `timeZone`, or null when the date or time is invalid. */
function wallTimeToUtc(wall: WallTime, timeZone: string): Date | null {
  const { year, month, day, hour, minute, second } = wall;
  if (hour > 23 || minute > 59 || second > 59) return null;
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const check = new Date(wallAsUtc);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  // Take the zone's offset at the wall time read as UTC, then correct once in case that guess
  // landed on the other side of a daylight-saving change.
  const guess = zoneOffsetMs(wallAsUtc, timeZone);
  const corrected = zoneOffsetMs(wallAsUtc - guess, timeZone);
  return new Date(wallAsUtc - corrected);
}

/**
 * A legacy task's `remindAt`, as the client's computeRemindAt: the instant its `date`
 * ('YYYY-MM-DD') and `time` ('HH:mm') in `timeZone` are due. Null for done or indefinite tasks
 * and for any other date or time (`'NA'`, null).
 */
export function legacyRemindAt(fields: Record<string, unknown>, timeZone: string): Date | null {
  if (fields.indefinite === true || fields.status === 'done') return null;
  const { date, time } = fields;
  if (typeof date !== 'string' || typeof time !== 'string') return null;
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!d || !t) return null;
  return wallTimeToUtc(
    {
      year: Number(d[1]),
      month: Number(d[2]),
      day: Number(d[3]),
      hour: Number(t[1]),
      minute: Number(t[2]),
      second: 0,
    },
    timeZone,
  );
}

/** A legacy notification `timestamp` (`11/2/2026, 3:30:00 PM`) read as wall time in `timeZone`. */
export function parseLegacyTimestamp(value: unknown, timeZone: string): Date | null {
  if (typeof value !== 'string' || value.length > MAX_TIMESTAMP_LENGTH) return null;
  const match = LEGACY_TIMESTAMP.exec(value.trim());
  if (!match) return null;
  const [, month, day, year, hourText, minute, secondText, meridiem] = match;
  let hour = Number(hourText);
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    hour = (hour % 12) + (meridiem.toLowerCase() === 'pm' ? 12 : 0);
  }
  return wallTimeToUtc(
    {
      year: Number(year),
      month: Number(month),
      day: Number(day),
      hour,
      minute: Number(minute),
      second: Number(secondText ?? 0),
    },
    timeZone,
  );
}

function isFcmToken(value: unknown): value is string {
  return typeof value === 'string' && FCM_TOKEN.test(value) && !/^__.*__$/.test(value);
}

/** The fields a task is missing, or null when it has them all. */
function taskPatch(data: DocumentData, fallbackZone: string): DocumentData | null {
  const patch: DocumentData = {};
  const ownZone: unknown = data.timeZone;
  const zone = typeof ownZone === 'string' && isTimeZone(ownZone) ? ownZone : fallbackZone;
  if (!Object.hasOwn(data, 'timeZone')) patch.timeZone = fallbackZone;
  if (!Object.hasOwn(data, 'remindAt')) {
    const at = legacyRemindAt(data, zone);
    patch.remindAt = at ? Timestamp.fromDate(at) : null;
  }
  if (!Object.hasOwn(data, 'reminded')) patch.reminded = false;
  return Object.keys(patch).length > 0 ? patch : null;
}

/** Every document of `collection`, a page at a time, in document id order. */
async function* allDocs(db: Firestore, collection: string): AsyncGenerator<QueryDocumentSnapshot> {
  const firstPage = db.collection(collection).orderBy(FieldPath.documentId()).limit(PAGE_SIZE);
  let query = firstPage;
  for (;;) {
    const page = await query.get();
    yield* page.docs;
    const last = page.docs[page.docs.length - 1];
    if (page.size < PAGE_SIZE || !last) return;
    query = firstPage.startAfter(last);
  }
}

type Write = (batch: WriteBatch) => void;

/** Commits `writes` in batches of {@link BATCH_SIZE}, one batch after another. */
async function commitAll(db: Firestore, writes: readonly Write[]): Promise<void> {
  for (let start = 0; start < writes.length; start += BATCH_SIZE) {
    const batch = db.batch();
    for (const write of writes.slice(start, start + BATCH_SIZE)) write(batch);
    await batch.commit();
  }
}

/** Migrates the legacy data in `db`; with `dryRun`, only counts what it would change. */
export async function migrateLegacy(
  db: Firestore,
  options: MigrationOptions,
): Promise<MigrationReport> {
  const report: MigrationReport = {
    dryRun: options.dryRun,
    tasks: { updated: 0, unchanged: 0 },
    devices: { created: 0, existing: 0, skipped: 0 },
    notifications: { updated: 0, unchanged: 0, unparseable: 0 },
  };
  const writes: Write[] = [];

  for await (const task of allDocs(db, 'tasks')) {
    const patch = taskPatch(task.data(), options.timeZone);
    if (patch) {
      writes.push((batch) => batch.update(task.ref, patch));
      report.tasks.updated += 1;
    } else {
      report.tasks.unchanged += 1;
    }
  }

  for await (const fcm of allDocs(db, 'fcm')) {
    const token: unknown = fcm.get('token');
    if (!isFcmToken(token)) {
      report.devices.skipped += 1;
      continue;
    }
    const uid = fcm.id;
    const device = db.collection('users').doc(uid).collection('devices').doc(token);
    if ((await device.get()).exists) {
      report.devices.existing += 1;
      continue;
    }
    // The device shape the Firestore rules require: { uid, token, userAgent, updatedAt }.
    writes.push((batch) =>
      batch.create(device, {
        uid,
        token,
        userAgent: LEGACY_USER_AGENT,
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );
    report.devices.created += 1;
  }

  for await (const notification of allDocs(db, 'notifications')) {
    if (notification.get('createdAt') !== undefined) {
      report.notifications.unchanged += 1;
      continue;
    }
    const at = parseLegacyTimestamp(notification.get('timestamp'), options.timeZone);
    if (!at) report.notifications.unparseable += 1;
    const createdAt = at ? Timestamp.fromDate(at) : Timestamp.fromMillis(0);
    writes.push((batch) => batch.update(notification.ref, { createdAt }));
    report.notifications.updated += 1;
  }

  if (!options.dryRun) await commitAll(db, writes);
  return report;
}

async function main(argv: readonly string[]): Promise<void> {
  const options = parseArgs(argv);
  const app = initializeApp();
  const project = app.options.projectId ?? process.env.GOOGLE_CLOUD_PROJECT ?? '(from credentials)';
  console.log(`Migrating project ${project} with time zone ${options.timeZone}.`);
  const report = await migrateLegacy(getFirestore(app), options);
  console.log(JSON.stringify(report, null, 2));
  if (options.dryRun) console.log('Dry run: nothing was written.');
}

// Runs only as the `migrate` script, not when a test imports this file.
if (/^migrate-legacy\.[cm]?[jt]s$/.test(basename(process.argv[1] ?? ''))) {
  main(process.argv.slice(2)).catch((err: unknown) => {
    console.error(`Migration failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  });
}
