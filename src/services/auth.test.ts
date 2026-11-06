/**
 * Google sign-in with `firebase/auth` mocked: it always leaves by redirect (G1), and the redirect
 * that brought the page back is reported with the kind of operation it was (G2, D4).
 */
import {
  GoogleAuthProvider,
  confirmPasswordReset,
  getRedirectResult,
  sendPasswordResetEmail,
  signInWithRedirect,
  verifyPasswordResetCode,
  type User,
  type UserCredential,
} from 'firebase/auth';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@/lib/firebase';
import {
  checkResetCode,
  consumeRedirectResult,
  requestPasswordReset,
  resetPassword,
  signInWithGoogle,
} from './auth';

/** Spies standing in for Firebase's popup calls, which the app must never make (G1). */
const popups = vi.hoisted(() => ({ signIn: vi.fn(), reauthenticate: vi.fn() }));

vi.mock('@/lib/firebase', () => ({ auth: { name: 'mock-auth' } }));
vi.mock('firebase/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('firebase/auth')>()),
  getRedirectResult: vi.fn(),
  signInWithRedirect: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  verifyPasswordResetCode: vi.fn(),
  confirmPasswordReset: vi.fn(),
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
  vi.mocked(sendPasswordResetEmail).mockReset();
  vi.mocked(verifyPasswordResetCode).mockReset();
  vi.mocked(confirmPasswordReset).mockReset();
  popups.signIn.mockReset();
  popups.reauthenticate.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const firebaseError = (code: string) => Object.assign(new Error(`Firebase: (${code}).`), { code });

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

describe('requestPasswordReset (decisions/password-reset)', () => {
  it('sends the reset email once, to the trimmed address', async () => {
    vi.mocked(sendPasswordResetEmail).mockResolvedValue(undefined);

    await expect(requestPasswordReset('  ann@example.com ')).resolves.toBeUndefined();
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(auth, 'ann@example.com');
  });

  it.each([
    ['a known address', () => vi.mocked(sendPasswordResetEmail).mockResolvedValue(undefined)],
    [
      'an address with no account',
      () =>
        vi.mocked(sendPasswordResetEmail).mockRejectedValue(firebaseError('auth/user-not-found')),
    ],
  ])('resolves for %s alike, and logs nothing that could tell them apart', async (_, answer) => {
    const logs = (['log', 'warn', 'error'] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined),
    );
    answer();

    await expect(requestPasswordReset('ann@example.com')).resolves.toBeUndefined();
    for (const log of logs) expect(log).not.toHaveBeenCalled();
  });

  it.each(['auth/too-many-requests', 'auth/network-request-failed'])(
    'rejects with %s, so the screen can show it',
    async (code) => {
      const error = firebaseError(code);
      vi.mocked(sendPasswordResetEmail).mockRejectedValue(error);

      await expect(requestPasswordReset('ann@example.com')).rejects.toBe(error);
    },
  );
});

describe('checkResetCode', () => {
  it('resolves the email of the account the code belongs to', async () => {
    vi.mocked(verifyPasswordResetCode).mockResolvedValue('ann@example.com');

    await expect(checkResetCode('abc')).resolves.toBe('ann@example.com');
    expect(verifyPasswordResetCode).toHaveBeenCalledWith(auth, 'abc');
  });

  it('rejects with the same error when the code has expired', async () => {
    const error = firebaseError('auth/expired-action-code');
    vi.mocked(verifyPasswordResetCode).mockRejectedValue(error);

    await expect(checkResetCode('abc')).rejects.toBe(error);
  });
});

describe('resetPassword', () => {
  it('sets the new password for the code’s account', async () => {
    vi.mocked(confirmPasswordReset).mockResolvedValue(undefined);

    await expect(resetPassword('abc', 'newpass12')).resolves.toBeUndefined();
    expect(confirmPasswordReset).toHaveBeenCalledWith(auth, 'abc', 'newpass12');
  });

  it('passes the password through as typed, untrimmed', async () => {
    vi.mocked(confirmPasswordReset).mockResolvedValue(undefined);

    await resetPassword('abc', ' newpass12 ');
    expect(confirmPasswordReset).toHaveBeenCalledWith(auth, 'abc', ' newpass12 ');
  });

  it('rejects with the Firebase error', async () => {
    const error = firebaseError('auth/invalid-action-code');
    vi.mocked(confirmPasswordReset).mockRejectedValue(error);

    await expect(resetPassword('abc', 'newpass12')).rejects.toBe(error);
  });
});
