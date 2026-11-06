/**
 * Google sign-in with `firebase/auth` mocked: it always leaves by redirect (G1), and the redirect
 * that brought the page back is reported with the kind of operation it was (G2, D4).
 */
import {
  GoogleAuthProvider,
  applyActionCode,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  getRedirectResult,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithRedirect,
  updateProfile,
  verifyPasswordResetCode,
  type User,
  type UserCredential,
} from 'firebase/auth';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '@/lib/firebase';
import {
  applyVerificationCode,
  checkResetCode,
  consumeRedirectResult,
  reloadEmailVerified,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
  signInWithGoogle,
  signUpEmail,
  updatePhotoUrl,
} from './auth';

/** Spies standing in for Firebase's popup calls, which the app must never make (G1). */
const popups = vi.hoisted(() => ({ signIn: vi.fn(), reauthenticate: vi.fn() }));

vi.mock('@/lib/firebase', () => ({
  auth: { name: 'mock-auth', currentUser: null as User | null },
}));
vi.mock('firebase/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('firebase/auth')>()),
  getRedirectResult: vi.fn(),
  signInWithRedirect: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendEmailVerification: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  applyActionCode: vi.fn(),
  updateProfile: vi.fn(),
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
  vi.mocked(sendEmailVerification).mockReset();
  vi.mocked(createUserWithEmailAndPassword).mockReset();
  vi.mocked(applyActionCode).mockReset();
  (auth as { currentUser: User | null }).currentUser = null;
  vi.mocked(verifyPasswordResetCode).mockReset();
  vi.mocked(confirmPasswordReset).mockReset();
  popups.signIn.mockReset();
  popups.reauthenticate.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const firebaseError = (code: string) => Object.assign(new Error(`Firebase: (${code}).`), { code });

/** The continue link both auth emails carry: back to the app's home on this page's origin. */
const CONTINUE_HOME = { url: `${window.location.origin}/home` };

/** A signed-in user whose `reload` makes their email verified when `verifiedAfterReload` is set. */
function signedIn(verifiedAfterReload: boolean): User {
  const user = {
    uid: 'ann',
    emailVerified: false,
    reload: vi.fn(async () => {
      user.emailVerified = verifiedAfterReload;
    }),
    getIdToken: vi.fn(async () => 'token'),
  };
  (auth as { currentUser: User | null }).currentUser = user as unknown as User;
  return user as unknown as User;
}

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
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(auth, 'ann@example.com', CONTINUE_HOME);
  });

  it.each(['auth/unauthorized-continue-uri', 'auth/invalid-continue-uri'])(
    'sends again without the continue link when Firebase refuses it with %s',
    async (code) => {
      vi.mocked(sendPasswordResetEmail)
        .mockRejectedValueOnce(firebaseError(code))
        .mockResolvedValueOnce(undefined);

      await expect(requestPasswordReset('ann@example.com')).resolves.toBeUndefined();
      expect(sendPasswordResetEmail).toHaveBeenCalledTimes(2);
      expect(sendPasswordResetEmail).toHaveBeenLastCalledWith(auth, 'ann@example.com');
    },
  );

  it('still answers alike when the retry finds no account', async () => {
    vi.mocked(sendPasswordResetEmail)
      .mockRejectedValueOnce(firebaseError('auth/unauthorized-continue-uri'))
      .mockRejectedValueOnce(firebaseError('auth/user-not-found'));

    await expect(requestPasswordReset('ann@example.com')).resolves.toBeUndefined();
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

describe('signUpEmail (email verification)', () => {
  it('creates the account, then sends the verification email with a link back home', async () => {
    const user = signedIn(false);
    vi.mocked(createUserWithEmailAndPassword).mockResolvedValue({ user } as UserCredential);
    vi.mocked(sendEmailVerification).mockResolvedValue(undefined);

    await expect(signUpEmail(' ann@example.com ', 'secret123')).resolves.toBe(user);
    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      auth,
      'ann@example.com',
      'secret123',
    );
    expect(sendEmailVerification).toHaveBeenCalledWith(user, CONTINUE_HOME);
  });

  it('still signs the user up when the email fails to send, logging only its code', async () => {
    const user = signedIn(false);
    const error = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(createUserWithEmailAndPassword).mockResolvedValue({ user } as UserCredential);
    vi.mocked(sendEmailVerification).mockRejectedValue(firebaseError('auth/too-many-requests'));

    await expect(signUpEmail('ann@example.com', 'secret123')).resolves.toBe(user);
    expect(error).toHaveBeenCalledWith(expect.any(String), 'auth/too-many-requests');
    expect(JSON.stringify(error.mock.calls)).not.toContain('ann@example.com');
  });
});

describe('sendVerificationEmail', () => {
  it('sends the signed-in user a verification email with a link back home', async () => {
    const user = signedIn(false);
    vi.mocked(sendEmailVerification).mockResolvedValue(undefined);

    await sendVerificationEmail();
    expect(sendEmailVerification).toHaveBeenCalledWith(user, CONTINUE_HOME);
  });

  it('sends again without the link when Firebase refuses it', async () => {
    const user = signedIn(false);
    vi.mocked(sendEmailVerification)
      .mockRejectedValueOnce(firebaseError('auth/unauthorized-continue-uri'))
      .mockResolvedValueOnce(undefined);

    await sendVerificationEmail();
    expect(sendEmailVerification).toHaveBeenLastCalledWith(user);
  });

  it('rejects with any other error, such as too many requests', async () => {
    signedIn(false);
    const error = firebaseError('auth/too-many-requests');
    vi.mocked(sendEmailVerification).mockRejectedValue(error);

    await expect(sendVerificationEmail()).rejects.toBe(error);
    expect(sendEmailVerification).toHaveBeenCalledTimes(1);
  });

  it('rejects when nobody is signed in', async () => {
    await expect(sendVerificationEmail()).rejects.toThrow('auth/no-current-user');
  });
});

describe('reloadEmailVerified', () => {
  it.each([true, false])(
    'reloads the user and resolves whether verified (%s)',
    async (verified) => {
      const user = signedIn(verified);

      await expect(reloadEmailVerified()).resolves.toBe(verified);
      expect(user.reload).toHaveBeenCalledTimes(1);
    },
  );

  it('refreshes the ID token once verified, so it carries the verified claim', async () => {
    const user = signedIn(true);

    await reloadEmailVerified();
    expect(user.getIdToken).toHaveBeenCalledWith(true);
  });
});

describe('applyVerificationCode', () => {
  it('applies the link’s code', async () => {
    vi.mocked(applyActionCode).mockResolvedValue(undefined);

    await expect(applyVerificationCode('abc')).resolves.toBeUndefined();
    expect(applyActionCode).toHaveBeenCalledWith(auth, 'abc');
  });

  it('rejects with the Firebase error, such as a used code', async () => {
    const error = firebaseError('auth/invalid-action-code');
    vi.mocked(applyActionCode).mockRejectedValue(error);

    await expect(applyVerificationCode('abc')).rejects.toBe(error);
  });
});

describe('updatePhotoUrl', () => {
  it('saves the trimmed link as the signed-in user’s photo', async () => {
    const user = signedIn(true);
    vi.mocked(updateProfile).mockResolvedValue(undefined);

    await updatePhotoUrl('  https://example.com/me.png ');
    expect(updateProfile).toHaveBeenCalledWith(user, { photoURL: 'https://example.com/me.png' });
  });

  it('removes the photo when given null, sending an empty string as the API needs', async () => {
    const user = signedIn(true);
    vi.mocked(updateProfile).mockResolvedValue(undefined);

    await updatePhotoUrl(null);
    // The Auth API refuses a null photoUrl ("must be string"); an empty one clears it.
    expect(updateProfile).toHaveBeenCalledWith(user, { photoURL: '' });
  });

  it('rejects when nobody is signed in', async () => {
    await expect(updatePhotoUrl(null)).rejects.toThrow('auth/no-current-user');
  });
});
