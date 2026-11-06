/**
 * When the verify-email banner may show on Home (decisions/email-verification-reminder): once
 * dismissed there, it stays away for `DISMISS_DAYS`, counted from the dismissal this device saved
 * for that account. Storage can be blocked, so a failure to read or write only means the banner
 * shows again.
 */

export const DISMISS_DAYS = 7;
const DISMISS_MS = DISMISS_DAYS * 24 * 60 * 60 * 1000;
const KEY_PREFIX = 'verifyBannerDismissedAt:';

/** Whether `uid` dismissed the banner on this device within the last `DISMISS_DAYS`. */
export function dismissedRecently(uid: string, now: number = Date.now()): boolean {
  let saved: string | null;
  try {
    saved = localStorage.getItem(KEY_PREFIX + uid);
  } catch (error) {
    console.warn('[verify] could not read the banner dismissal:', (error as Error).name);
    return false;
  }
  const at = Number(saved);
  // A missing, unreadable or future date (a clock set back) shows the banner.
  if (saved === null || saved === '' || !Number.isFinite(at) || at <= 0 || at > now) return false;
  return now - at < DISMISS_MS;
}

/** Saves that `uid` dismissed the banner now. */
export function rememberDismissal(uid: string, now: number = Date.now()): void {
  try {
    localStorage.setItem(KEY_PREFIX + uid, String(now));
  } catch (error) {
    console.warn('[verify] could not save the banner dismissal:', (error as Error).name);
  }
}
