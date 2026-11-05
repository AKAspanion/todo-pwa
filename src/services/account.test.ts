/**
 * The account service against the Auth emulator (project demo-todo): the providers it reports,
 * re-confirming with a password (D3) and deleting the user (D5).
 */
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  signInWithCredential,
} from 'firebase/auth';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { auth } from '@/lib/firebase';
import {
  accountProviders,
  confirmWithGoogle,
  confirmWithPassword,
  deleteCurrentUser,
} from './account';
import { signInEmail, signOutUser, signUpEmail } from './auth';

const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const EMAIL = 'del@example.com';
const PASSWORD = 'Passw0rd!';

if (!PROJECT_ID.startsWith('demo-')) throw new Error('these tests run only on a demo- project');

function codeOf(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
}

/** Signs in as del@example.com, creating it when an earlier test deleted it (or it never was). */
async function signInAsDel(): Promise<void> {
  try {
    await signUpEmail(EMAIL, PASSWORD);
  } catch (error) {
    if (codeOf(error) !== 'auth/email-already-in-use') throw error;
    await signInEmail(EMAIL, PASSWORD);
  }
}

beforeEach(async () => {
  await signOutUser();
});

afterEach(async () => {
  await signOutUser();
});

describe('with del@example.com signed in', () => {
  beforeEach(signInAsDel);

  it('reports the password provider only', () => {
    expect(accountProviders()).toEqual(['password']);
  });

  it('rejects a wrong password with Firebase’s error (D3)', async () => {
    let caught: unknown;
    try {
      await confirmWithPassword('wrong-1');
    } catch (error) {
      caught = error;
    }

    expect(['auth/wrong-password', 'auth/invalid-credential']).toContain(codeOf(caught));
    expect(auth.currentUser?.email).toBe(EMAIL);
  });

  it('accepts the right password (D3)', async () => {
    await expect(confirmWithPassword(PASSWORD)).resolves.toBeUndefined();
  });

  it('deletes the user, so signing in again fails (D5)', async () => {
    await confirmWithPassword(PASSWORD);

    await expect(deleteCurrentUser()).resolves.toBeUndefined();

    expect(auth.currentUser).toBeNull();
    let caught: unknown;
    try {
      await signInEmail(EMAIL, PASSWORD);
    } catch (error) {
      caught = error;
    }
    expect(['auth/user-not-found', 'auth/invalid-credential']).toContain(codeOf(caught));
  });
});

it('lists password before google.com for an account with both', async () => {
  const sub = `g-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const email = `${sub}@example.com`;
  // The Auth emulator accepts an unsigned ID token for Google.
  const idToken = JSON.stringify({ sub, email, email_verified: true });
  const { user } = await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
  expect(accountProviders()).toEqual(['google.com']);

  await linkWithCredential(user, EmailAuthProvider.credential(`pw-${email}`, PASSWORD));

  expect(accountProviders()).toEqual(['password', 'google.com']);
  await deleteCurrentUser();
});

describe('with nobody signed in', () => {
  it.each([
    ['confirmWithPassword', () => confirmWithPassword(PASSWORD)],
    ['confirmWithGoogle', () => confirmWithGoogle()],
    ['deleteCurrentUser', () => deleteCurrentUser()],
  ])('%s rejects with auth/not-signed-in', async (_name, call) => {
    await expect(call()).rejects.toMatchObject({
      code: 'auth/not-signed-in',
      message: 'auth/not-signed-in',
    });
  });

  it('accountProviders throws auth/not-signed-in', () => {
    expect(() => accountProviders()).toThrow('auth/not-signed-in');
  });
});
