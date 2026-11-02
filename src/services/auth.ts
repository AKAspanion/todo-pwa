/**
 * Sign-in, sign-up and the signed-in user. Email and password, and Google. Facebook sign-in was
 * removed (§11.1). Errors reach the caller as Firebase errors, whose `code` the screens translate.
 */
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type Unsubscribe,
  type User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

/** Popup failures that mean "this browser can't do popups", so a redirect is tried instead. */
const POPUP_UNAVAILABLE = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
]);

function errorCode(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : 'unknown';
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
 * Signs in with a Google popup. Where popups are blocked or unsupported (some installed PWAs), it
 * starts a redirect instead and resolves null: the page then leaves, and `consumeRedirectResult`
 * picks the user up when it comes back.
 */
export async function signInWithGoogle(): Promise<User | null> {
  const provider = new GoogleAuthProvider();
  try {
    const credential = await signInWithPopup(auth, provider);
    return credential.user;
  } catch (error) {
    const code = errorCode(error);
    if (!POPUP_UNAVAILABLE.has(code)) throw error;
    console.warn('[auth] Google popup unavailable, redirecting:', code);
    await signInWithRedirect(auth, provider);
    return null;
  }
}

/** The user a Google redirect brought back, or null when this page load wasn't one. */
export async function consumeRedirectResult(): Promise<User | null> {
  const result = await getRedirectResult(auth);
  return result?.user ?? null;
}

export function signOutUser(): Promise<void> {
  return signOut(auth);
}

/** Saves the signed-in user's display name, trimmed. */
export async function updateDisplayName(name: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('auth/no-current-user');
  await updateProfile(user, { displayName: name.trim() });
}
