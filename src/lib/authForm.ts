/**
 * What the sign-in and sign-up screens share: the password rule (D14) and the locale key that
 * explains a Firebase auth error. The screens show these keys, never Firebase's own message,
 * which can carry internals.
 */

/** The Firebase auth error codes the screens explain, each with the key that explains it. */
const ERROR_KEYS: ReadonlyMap<string, string> = new Map([
  ['auth/email-already-in-use', 'auth.errors.emailInUse'],
  ['auth/invalid-email', 'auth.errors.invalidEmail'],
  ['auth/wrong-password', 'auth.errors.wrongPassword'],
  ['auth/invalid-credential', 'auth.errors.invalidCredential'],
  ['auth/invalid-login-credentials', 'auth.errors.invalidCredential'],
  ['auth/user-not-found', 'auth.errors.userNotFound'],
  ['auth/user-disabled', 'auth.errors.userDisabled'],
  ['auth/weak-password', 'auth.errors.weakPassword'],
  ['auth/too-many-requests', 'auth.errors.tooManyRequests'],
  ['auth/account-exists-with-different-credential', 'auth.errors.accountExists'],
  ['auth/network-request-failed', 'auth.errors.network'],
]);

/** The user closed or replaced the Google window: nothing went wrong, so nothing is shown. */
const CANCELLED = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

const UNKNOWN_KEY = 'auth.errors.unknown';

/** A Firebase error's `code`, or an empty string for anything else. */
export function authErrorCode(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('code' in error)) return '';
  return typeof error.code === 'string' ? error.code : '';
}

/** The locale key that explains an auth error, or null when the user just cancelled. */
export function authErrorKey(error: unknown): string | null {
  const code = authErrorCode(error);
  if (CANCELLED.has(code)) return null;
  return ERROR_KEYS.get(code) ?? UNKNOWN_KEY;
}

export const PASSWORD_MIN_LENGTH = 8;

/** At least 8 characters with a letter and a digit, in any script; any other character is allowed (D14). */
export function isStrongPassword(password: string): boolean {
  return (
    [...password].length >= PASSWORD_MIN_LENGTH &&
    /\p{L}/u.test(password) &&
    /\p{Nd}/u.test(password)
  );
}
