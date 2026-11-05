/**
 * The signed-in account: which of the app's two providers it has, re-confirming it before it is
 * deleted (D3, D4), and deleting its Firebase Auth user (D5). Each function acts on the signed-in
 * user only, and with nobody signed in rejects with `auth/not-signed-in`. Firebase's own errors
 * reach the caller as they are, whose `code` the screens translate.
 */
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  reauthenticateWithRedirect,
  type User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

export type AccountProvider = 'password' | 'google.com';

/** The providers the app offers, in the order they are listed. */
const OFFERED_PROVIDERS: readonly AccountProvider[] = ['password', 'google.com'];

/** The signed-in user; throws `auth/not-signed-in`, as a message and a code, when nobody is. */
function signedInUser(): User {
  const user = auth.currentUser;
  if (!user) throw Object.assign(new Error('auth/not-signed-in'), { code: 'auth/not-signed-in' });
  return user;
}

/** The signed-in user's providers among the two the app offers, in that order. */
export function accountProviders(): AccountProvider[] {
  const linked = new Set(signedInUser().providerData.map((info) => info.providerId));
  return OFFERED_PROVIDERS.filter((provider) => linked.has(provider));
}

/** D3: re-authenticates the signed-in user with their password; rejects with Firebase's error. */
export async function confirmWithPassword(password: string): Promise<void> {
  const user = signedInUser();
  await reauthenticateWithCredential(
    user,
    EmailAuthProvider.credential(user.email ?? '', password),
  );
}

/**
 * D4: leaves for Google to re-authenticate the signed-in user. The page comes back to the same
 * URL, where `consumeRedirectResult` reports a `reauthenticate` outcome.
 */
export async function confirmWithGoogle(): Promise<void> {
  await reauthenticateWithRedirect(signedInUser(), new GoogleAuthProvider());
}

/**
 * D5 step 2: deletes the signed-in Firebase Auth user; rejects with Firebase's error, such as
 * `auth/requires-recent-login` when the user hasn't re-confirmed lately.
 */
export async function deleteCurrentUser(): Promise<void> {
  await deleteUser(signedInUser());
}
