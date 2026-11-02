/**
 * The device service against the Firestore and Auth emulators (project demo-todo), signed in as a
 * fresh user per test, so the security rules check every write as they do in the app (P3).
 */
import { Timestamp, doc, getDoc } from 'firebase/firestore';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/lib/firebase';
import { signOutUser, signUpEmail } from './auth';
import { DEVICE_USER_AGENT_MAX, removeDevice, saveDevice } from './devices';

const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const PASSWORD = 'secret-pass-1';
/** FCM tokens look like this: letters, digits, '-', '_' and ':'. */
const TOKEN_A = 'fcm-token-A_1:APA91bHPRgkF';
const TOKEN_B = 'fcm-token-B_2:APA91bXYZabc';

if (!PROJECT_ID.startsWith('demo-')) throw new Error('these tests run only on a demo- project');

async function stored(uid: string, token: string): Promise<Record<string, unknown> | null> {
  const snapshot = await getDoc(doc(db, 'users', uid, 'devices', token));
  return snapshot.exists() ? snapshot.data() : null;
}

let uid = '';

beforeEach(async () => {
  await signOutUser();
  const email = `device-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  uid = (await signUpEmail(email, PASSWORD)).uid;
});

afterEach(async () => {
  await signOutUser();
});

describe('saveDevice', () => {
  it('stores exactly uid, token, userAgent and updatedAt at users/{uid}/devices/{token}', async () => {
    await saveDevice(uid, TOKEN_A);

    const device = await stored(uid, TOKEN_A);
    expect(Object.keys(device ?? {}).sort()).toEqual(['token', 'uid', 'updatedAt', 'userAgent']);
    expect(device).toMatchObject({ uid, token: TOKEN_A, userAgent: navigator.userAgent });
    expect(device?.updatedAt).toBeInstanceOf(Timestamp);
  });

  it('saving the same token again keeps one document for it', async () => {
    await saveDevice(uid, TOKEN_A);
    await saveDevice(uid, TOKEN_A);

    expect(await stored(uid, TOKEN_A)).toMatchObject({ token: TOKEN_A });
  });

  it('cuts a user agent longer than the rules allow to 1024 characters, and the rules accept it', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('U'.repeat(5000));

    await saveDevice(uid, TOKEN_A);

    expect(DEVICE_USER_AGENT_MAX).toBe(1024);
    expect((await stored(uid, TOKEN_A))?.userAgent).toBe('U'.repeat(1024));
  });

  it.each([
    ['empty', ''],
    ['a path separator', 'abc/def'],
    ['a dot segment', '..'],
    ['a space', 'abc def'],
    ['over 1500 characters', 'a'.repeat(1501)],
    ['__proto__-like', '__.*__'],
  ])(
    'rejects a token with %s as device/invalid-token, before anything is sent',
    async (_case, token) => {
      await expect(saveDevice(uid, token)).rejects.toThrow('device/invalid-token');
    },
  );

  it('rejects a uid that is not a single path segment as device/invalid-uid', async () => {
    await expect(saveDevice('a/b', TOKEN_A)).rejects.toThrow('device/invalid-uid');
    await expect(saveDevice('', TOKEN_A)).rejects.toThrow('device/invalid-uid');
  });

  it("is denied for another user's devices", async () => {
    await expect(saveDevice('someone-else', TOKEN_A)).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });
});

describe('removeDevice', () => {
  it("deletes that device's document and leaves a second device's document untouched", async () => {
    await saveDevice(uid, TOKEN_A);
    await saveDevice(uid, TOKEN_B);
    const second = await stored(uid, TOKEN_B);

    await removeDevice(uid, TOKEN_A);

    expect(await stored(uid, TOKEN_A)).toBeNull();
    expect(await stored(uid, TOKEN_B)).toEqual(second);
  });

  it('resolves when the document is already gone', async () => {
    await expect(removeDevice(uid, TOKEN_A)).resolves.toBeUndefined();
  });

  it('rejects an invalid token before anything is sent', async () => {
    await expect(removeDevice(uid, 'a/b')).rejects.toThrow('device/invalid-token');
  });
});
