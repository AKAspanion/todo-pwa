/**
 * Google sign-in with `firebase/auth` mocked: it always leaves by redirect (G1), and the redirect
 * that brought the page back is reported with the kind of operation it was (G2, D4).
 */
import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithRedirect,
  type User,
  type UserCredential,
} from 'firebase/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@/lib/firebase';
import { consumeRedirectResult, signInWithGoogle } from './auth';

/** Spies standing in for Firebase's popup calls, which the app must never make (G1). */
const popups = vi.hoisted(() => ({ signIn: vi.fn(), reauthenticate: vi.fn() }));

vi.mock('@/lib/firebase', () => ({ auth: { name: 'mock-auth' } }));
vi.mock('firebase/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('firebase/auth')>()),
  getRedirectResult: vi.fn(),
  signInWithRedirect: vi.fn(),
  signInWithPopup: popups.signIn,
  reauthenticateWithPopup: popups.reauthenticate,
}));

const alice = { uid: 'alice' } as User;

function credential(operationType: UserCredential['operationType']): UserCredential {
  return { user: alice, operationType, providerId: 'google.com' };
}

beforeEach(() => {
  vi.mocked(getRedirectResult).mockReset();
  vi.mocked(signInWithRedirect).mockReset();
  popups.signIn.mockReset();
  popups.reauthenticate.mockReset();
});

describe('signInWithGoogle', () => {
  it('leaves for Google by redirect with a GoogleAuthProvider, and never opens a popup (G1)', async () => {
    vi.mocked(signInWithRedirect).mockResolvedValue(undefined as never);

    await signInWithGoogle();

    expect(signInWithRedirect).toHaveBeenCalledTimes(1);
    const [usedAuth, provider] = vi.mocked(signInWithRedirect).mock.calls[0] ?? [];
    expect(usedAuth).toBe(auth);
    expect(provider).toBeInstanceOf(GoogleAuthProvider);
    expect(popups.signIn).not.toHaveBeenCalled();
    expect(popups.reauthenticate).not.toHaveBeenCalled();
  });

  it('rejects with the redirect’s own error, and still opens no popup', async () => {
    vi.mocked(signInWithRedirect).mockRejectedValue(
      Object.assign(new Error('blocked'), {
        code: 'auth/operation-not-supported-in-this-environment',
      }),
    );

    await expect(signInWithGoogle()).rejects.toMatchObject({
      code: 'auth/operation-not-supported-in-this-environment',
    });
    expect(popups.signIn).not.toHaveBeenCalled();
  });
});

describe('consumeRedirectResult', () => {
  it.each([['signIn'], ['reauthenticate'], ['link']] as const)(
    'reports a %s redirect with its user',
    async (operation) => {
      vi.mocked(getRedirectResult).mockResolvedValue(credential(operation));

      await expect(consumeRedirectResult()).resolves.toEqual({ user: alice, operation });
      expect(getRedirectResult).toHaveBeenCalledWith(auth);
    },
  );

  it('is null when this page load was not a redirect', async () => {
    vi.mocked(getRedirectResult).mockResolvedValue(null);

    await expect(consumeRedirectResult()).resolves.toBeNull();
  });

  it('rejects with the redirect’s error code, such as auth/user-mismatch', async () => {
    vi.mocked(getRedirectResult).mockRejectedValue(
      Object.assign(new Error('mismatch'), { code: 'auth/user-mismatch' }),
    );

    await expect(consumeRedirectResult()).rejects.toMatchObject({ code: 'auth/user-mismatch' });
  });
});
