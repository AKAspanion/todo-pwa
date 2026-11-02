/**
 * Pure rules of the reminder run (spec P5): which `remindAt` values a run sends, and what a
 * reminder says. Kept free of Firebase so they are cheap to test.
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
