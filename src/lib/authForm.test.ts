import { describe, expect, it } from 'vitest';
import en from '@/i18n/locales/en/auth.json';
import { authErrorKey, isEmailAddress, isStrongPassword } from './authForm';

const firebaseError = (code: string) => Object.assign(new Error(`Firebase: (${code}).`), { code });

/** Reads a dotted key such as `auth.errors.network` out of the English auth strings. */
function english(key: string): unknown {
  return key
    .split('.')
    .slice(1)
    .reduce<unknown>(
      (node, part) =>
        node !== null && typeof node === 'object' && Object.hasOwn(node, part)
          ? (node as Record<string, unknown>)[part]
          : undefined,
      en,
    );
}

describe('authErrorKey', () => {
  it.each([
    ['auth/email-already-in-use', 'The email address is already in use by another account.'],
    [
      'auth/network-request-failed',
      "Couldn't reach the server. Check your connection and try again.",
    ],
    ['auth/wrong-password', 'The password is invalid or the user does not have a password.'],
    ['auth/invalid-credential', 'The email address or password is incorrect.'],
    ['auth/invalid-email', 'The email address is badly formatted.'],
  ])('explains %s with the locale text', (code, text) => {
    const key = authErrorKey(firebaseError(code));

    expect(key).not.toBeNull();
    expect(english(key ?? '')).toBe(text);
  });

  it('gives a key that exists for every code it knows', () => {
    for (const code of [
      'auth/user-not-found',
      'auth/user-disabled',
      'auth/weak-password',
      'auth/too-many-requests',
      'auth/account-exists-with-different-credential',
    ]) {
      expect(typeof english(authErrorKey(firebaseError(code)) ?? ''), code).toBe('string');
    }
  });

  it.each([
    firebaseError('constructor'),
    firebaseError('__proto__'),
    firebaseError('toString'),
    firebaseError('auth/internal-error'),
    new Error('Firebase: raw upstream message'),
    'a string',
    null,
    undefined,
    { code: 42 },
  ])('gives the generic message, never the raw one, for anything else (%j)', (error) => {
    expect(authErrorKey(error)).toBe('auth.errors.unknown');
  });
});

describe('isStrongPassword (D14)', () => {
  it.each(['abc-def_9', 'abc^def_9', 'Passw0rd', 'पासवर्ड1234', 'a1234567'])(
    'accepts %j: 8 or more characters with a letter and a digit',
    (password) => {
      expect(isStrongPassword(password)).toBe(true);
    },
  );

  it.each(['abcdefgh', '12345678', 'abc-de9', '', '        ', '-_^-_^-_^'])(
    'rejects %j',
    (password) => {
      expect(isStrongPassword(password)).toBe(false);
    },
  );
});

describe('isEmailAddress (name@site.tld)', () => {
  it.each(['a@b.co', 'name+tag@site.info', 'first.last@sub.example.org', 'ankit@gmail.com'])(
    'accepts %j',
    (email) => {
      expect(isEmailAddress(email)).toBe(true);
    },
  );

  it.each([
    '',
    'ankit@gmail',
    'ankit.gmail.com',
    'a@@b.co',
    'a@b@c.co',
    'a b@c.co',
    '@site.com',
    'name@.com',
    'name@site.',
  ])('rejects %j', (email) => {
    expect(isEmailAddress(email)).toBe(false);
  });
});
