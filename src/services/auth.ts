/**
 * Sign-in, sign-up and the signed-in user. Email and password, and Google: the only providers
 * (§11.1). Google always leaves by redirect, never a popup (G1). Errors reach the caller as
 * Firebase errors, whose `code` the screens translate.
 */
import {
  GoogleAuthProvider,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signOut,
  updateProfile,
  verifyPasswordResetCode,
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

export async function signUpEmail(email: string, password: string): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
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
 * Sends Firebase's reset email to the trimmed address. Resolves alike whether or not it has an
 * account, so the screen can't be used to learn who has one (decisions/password-reset): an
 * unknown address is swallowed without a log, since a log line would tell the two apart. Any
 * other failure, such as `auth/too-many-requests` or `auth/network-request-failed`, rejects.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
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

/** Saves the signed-in user's display name, trimmed. */
export async function updateDisplayName(name: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('auth/no-current-user');
  await updateProfile(user, { displayName: name.trim() });
}
