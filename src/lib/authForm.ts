/**
 * What the sign-in, sign-up and password-reset screens share: the password rule (D14) and the
 * locale key that explains a Firebase auth error. The screens show these keys, never Firebase's
 * own message, which can carry internals.
 */

/** The Firebase auth error codes the screens explain, each with the key that explains it. */
const ERROR_KEYS: ReadonlyMap<string, string> = new Map([
  ['auth/email-already-in-use', 'auth.errors.emailInUse'],
  ['auth/invalid-email', 'auth.errors.invalidEmail'],
  // A wrong password and an unknown email share one message, so sign-in can't be used to learn who
  // has an account, whether or not the project's email enumeration protection is on
  // (questions/sign-in-error-enumeration).
  ['auth/wrong-password', 'auth.errors.invalidCredential'],
  ['auth/invalid-credential', 'auth.errors.invalidCredential'],
  ['auth/invalid-login-credentials', 'auth.errors.invalidCredential'],
  ['auth/user-not-found', 'auth.errors.invalidCredential'],
  ['auth/user-disabled', 'auth.errors.userDisabled'],
  ['auth/weak-password', 'auth.errors.weakPassword'],
  ['auth/too-many-requests', 'auth.errors.tooManyRequests'],
  ['auth/account-exists-with-different-credential', 'auth.errors.accountExists'],
  ['auth/network-request-failed', 'auth.errors.network'],
  ['auth/expired-action-code', 'auth.errors.resetLinkExpired'],
  ['auth/invalid-action-code', 'auth.errors.resetLinkInvalid'],
]);

const UNKNOWN_KEY = 'auth.errors.unknown';

/** A Firebase error's `code`, or an empty string for anything else. */
export function authErrorCode(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('code' in error)) return '';
  return typeof error.code === 'string' ? error.code : '';
}

/**
 * The locale key that explains an auth error. Google is only ever reached by redirect (G1), so
 * there is no popup to close and no cancellation to keep quiet about.
 */
export function authErrorKey(error: unknown): string {
  return ERROR_KEYS.get(authErrorCode(error)) ?? UNKNOWN_KEY;
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

/**
 * An email shaped `name@site.tld`: no whitespace, one `@`, something before it, and a domain with a dot
 * that is neither its first nor last character. Stricter than Firebase on one point, a domain with no dot
 * (decisions/email-format-check); otherwise any characters and any top-level domain length (D14).
 */
export function isEmailAddress(email: string): boolean {
  return /^[^\s@]+@[^\s@.][^\s@]*\.[^\s@]*[^\s@.]$/u.test(email);
}
