/**
 * Pure rules of the reminder run (spec P5): which `remindAt` values a run sends, what a reminder
 * says, and how much one run does (review I7). Kept free of Firebase so they are cheap to test.
 */

/** How far past `now` a run looks for reminders. */
export const REMINDER_WINDOW_MS = 60 * 60 * 1000;

/** The title of every reminder push and of the notification document it leaves. */
export const REMINDER_TITLE = 'Task reminder';

/** The longest task title a reminder repeats: the Firestore rules' limit for titles. */
export const MAX_TITLE_LENGTH = 200;

/**
 * The window `(now, now + 60 min]` of `remindAt` values a run sends. The lower bound is open, so
 * a reminder whose moment has already passed is never sent late; seconds are kept, so a task due
 * later in the current minute is inside it.
 */
export function dueWindow(now: Date): { from: Date; to: Date } {
  const from = now.getTime();
  return { from: new Date(from), to: new Date(from + REMINDER_WINDOW_MS) };
}

/** The body of a reminder: `Upcoming task "<title>" at <time>`. */
export function reminderBody(title: string, time: string): string {
  return `Upcoming task "${title}" at ${time}`;
}

/** `title` cut to {@link MAX_TITLE_LENGTH} characters (code points), ending in `…` when cut. */
export function clipTitle(title: string): string {
  const chars = Array.from(title);
  if (chars.length <= MAX_TITLE_LENGTH) return title;
  return `${chars.slice(0, MAX_TITLE_LENGTH - 1).join('')}…`;
}

/**
 * The most due tasks one run reads, earliest `remindAt` first (review I7): one account flooding
 * `remindAt` can't make a run read everything.
 */
export const MAX_REMINDERS_PER_RUN = 500;

/** The most reminders one owner gets in one run; the rest wait for the next run, 5 minutes later. */
export const MAX_REMINDERS_PER_OWNER = 20;

/** How many tasks a run handles at once. */
export const REMINDER_CONCURRENCY = 10;

/**
 * `items` without those past each owner's first `cap`, in their order. Owners are compared as
 * values, so a malformed owner (a number, a missing uid) is an owner of its own.
 */
export function capPerOwner<T>(
  items: readonly T[],
  ownerOf: (item: T) => unknown,
  cap: number,
): T[] {
  const counts = new Map<unknown, number>();
  return items.filter((item) => {
    const owner = ownerOf(item);
    const count = counts.get(owner) ?? 0;
    if (count >= cap) return false;
    counts.set(owner, count + 1);
    return true;
  });
}

/**
 * Runs `work` on every item, at most `limit` at a time (at least one), and settles each result in
 * input order, like `Promise.allSettled`. A rejection, or a synchronous throw, settles that item
 * only; the next item starts as soon as any running one settles.
 */
export async function settleWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  work: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array<PromiseSettledResult<R>>(items.length);
  // One iterator shared by every worker: each takes the next item no other worker has taken.
  const queue = items.entries();
  async function worker(): Promise<void> {
    for (const [index, item] of queue) {
      try {
        results[index] = { status: 'fulfilled', value: await work(item) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }
  const workers = Math.min(Math.max(1, Math.floor(limit) || 1), items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}
