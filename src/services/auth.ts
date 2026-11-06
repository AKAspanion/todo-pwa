/**
 * Sign-in, sign-up and the signed-in user. Email and password, and Google: the only providers
 * (§11.1). Google always leaves by redirect, never a popup (G1). Errors reach the caller as
 * Firebase errors, whose `code` the screens translate.
 */
import {
  GoogleAuthProvider,
  applyActionCode,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signOut,
  updateProfile,
  verifyPasswordResetCode,
  type ActionCodeSettings,
  type Unsubscribe,
  type User,
} from 'firebase/auth';
import { authErrorCode } from '@/lib/authForm';
import { auth } from '@/lib/firebase';

/** What a redirect back from Google did: signed in, re-confirmed the user (D4), or linked. */
export type RedirectOperation = 'signIn' | 'reauthenticate' | 'link';
export interface RedirectOutcome {
  user: User;
  operation: RedirectOperation;
}

/** The user restored from the last session, or null, once Firebase knows which. */
export async function waitForAuthReady(): Promise<User | null> {
  await auth.authStateReady();
  return auth.currentUser;
}

export function onUserChanged(cb: (u: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, cb);
}

export async function signInEmail(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

/**
 * Creates the account, then sends its verification email (decisions/email-verification-reminder).
 * A failed send is logged by its code and not thrown: the account exists and the user is signed in
 * either way, and the banner's Resend covers it.
 */
export async function signUpEmail(email: string, password: string): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  try {
    await sendVerification(credential.user);
  } catch (error) {
    console.warn('[auth] verification email not sent:', authErrorCode(error) || 'unknown');
  }
  return credential.user;
}

/** Where both auth emails continue to once their link is used: home, on this page's own origin. */
function continueHome(): ActionCodeSettings {
  return { url: `${window.location.origin}/home` };
}

/** What Firebase rejects a send with when the page's origin isn't authorised for continue links. */
const CONTINUE_URL_REFUSED: ReadonlySet<string> = new Set([
  'auth/unauthorized-continue-uri',
  'auth/invalid-continue-uri',
]);

/**
 * Runs an auth email send with the continue link home, so Firebase's page offers a way back to
 * the app. When Firebase refuses the link (an origin missing from the authorised domains, such as
 * a preview channel), the same send runs once more without it, so the email still goes out; that
 * retry's outcome is the send's. Any other error rejects as it is.
 */
async function withContinueHome(send: (settings?: ActionCodeSettings) => Promise<void>) {
  try {
    await send(continueHome());
  } catch (error) {
    if (!CONTINUE_URL_REFUSED.has(authErrorCode(error))) throw error;
    await send();
  }
}

function sendVerification(user: User): Promise<void> {
  return withContinueHome((settings) =>
    settings ? sendEmailVerification(user, settings) : sendEmailVerification(user),
  );
}

function requireUser(): User {
  const user = auth.currentUser;
  if (!user) throw new Error('auth/no-current-user');
  return user;
}

/** Sends the signed-in user another verification email. Rejects with the Firebase error. */
export async function sendVerificationEmail(): Promise<void> {
  await sendVerification(requireUser());
}

/**
 * Reloads the signed-in user from Firebase and resolves whether their email is now verified.
 * Once it is, the ID token is refreshed so it carries the verified claim now rather than within
 * the hour; a failed refresh is logged by code only, since Firebase already counts them verified.
 */
export async function reloadEmailVerified(): Promise<boolean> {
  const user = requireUser();
  await user.reload();
  if (!user.emailVerified) return false;
  try {
    await user.getIdToken(true);
  } catch (error) {
    console.warn(
      '[auth] token not refreshed after verification:',
      authErrorCode(error) || 'unknown',
    );
  }
  return true;
}

/**
 * Verifies an email with the code from its verification link. Rejects with the Firebase error,
 * e.g. `auth/invalid-action-code` for a used link. The code may be another account's than the one
 * signed in here, so the caller re-checks the signed-in user rather than assuming it.
 */
export function applyVerificationCode(code: string): Promise<void> {
  return applyActionCode(auth, code);
}

/**
 * Leaves for Google by redirect (G1): no popup, and no popup fallback, since a Trusted Web
 * Activity and some installed PWAs can't show one. The page keeps its URL, `redirect` query
 * included, so Google brings the user back to the same screen, where `consumeRedirectResult`
 * picks them up.
 */
export async function signInWithGoogle(): Promise<void> {
  await signInWithRedirect(auth, new GoogleAuthProvider());
}

/**
 * The redirect that brought this page load back from Google, and what it did (G2, D4), or null
 * when this load wasn't one. Rejects with the redirect's Firebase error, such as
 * `auth/user-mismatch` when Google re-confirmed a different account.
 */
export async function consumeRedirectResult(): Promise<RedirectOutcome | null> {
  const result = await getRedirectResult(auth);
  return result ? { user: result.user, operation: result.operationType } : null;
}

export function signOutUser(): Promise<void> {
  return signOut(auth);
}

/**
 * Sends Firebase's reset email to the trimmed address, with a continue link home (or without it
 * when Firebase refuses it, `withContinueHome`). Resolves alike whether or not it has an
 * account, so the screen can't be used to learn who has one (decisions/password-reset): an
 * unknown address is swallowed without a log, since a log line would tell the two apart. Any
 * other failure, such as `auth/too-many-requests` or `auth/network-request-failed`, rejects.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const address = email.trim();
  try {
    await withContinueHome((settings) =>
      settings
        ? sendPasswordResetEmail(auth, address, settings)
        : sendPasswordResetEmail(auth, address),
    );
  } catch (error) {
    if (authErrorCode(error) !== 'auth/user-not-found') throw error;
  }
}

/**
 * The email of the account the reset code belongs to. Rejects with the Firebase error, e.g.
 * `auth/expired-action-code`.
 */
export function checkResetCode(code: string): Promise<string> {
  return verifyPasswordResetCode(auth, code);
}

/** Sets the new password for the code's account, exactly as typed. Rejects with the Firebase error. */
export function resetPassword(code: string, newPassword: string): Promise<void> {
  return confirmPasswordReset(auth, code, newPassword);
}

/**
 * Saves the signed-in user's photo link, trimmed, or removes the photo for null. The caller checks
 * the link is https; the photo is shown only when it is, whoever set it (`httpsPhotoUrl`).
 */
export async function updatePhotoUrl(url: string | null): Promise<void> {
  // The Auth API refuses a null photoUrl ("must be string"); an empty one clears the photo.
  await updateProfile(requireUser(), { photoURL: url === null ? '' : url.trim() });
}

/** Saves the signed-in user's display name, trimmed. */
export async function updateDisplayName(name: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('auth/no-current-user');
  await updateProfile(user, { displayName: name.trim() });
}
