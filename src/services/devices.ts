/**
 * Push devices: one document per FCM token, under its owner's own path, `users/{uid}/devices/{token}`
 * (P3). The reminder function sends to every device a user has, and deletes a device FCM reports
 * invalid. The security rules accept exactly `{ uid, token, userAgent ≤ 1024, updatedAt }`.
 */
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/** The security rules' limit on a stored user agent. */
export const DEVICE_USER_AGENT_MAX = 1024;
/** Firestore's limit on a document id is 1500 bytes; a token is ASCII, so 1500 characters. */
const TOKEN_MAX = 1500;
/** An FCM registration token: letters, digits, '-', '_' and ':'. Anything else is not one. */
const TOKEN_PATTERN = /^[A-Za-z0-9_:-]+$/;
/** A Firebase Auth uid is one path segment of letters and digits (up to 128 characters). */
const UID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/** The token, checked, since it becomes a document id: a '/' or '..' would name another path. */
function checkedToken(token: string): string {
  if (typeof token !== 'string' || token.length > TOKEN_MAX || !TOKEN_PATTERN.test(token)) {
    throw new Error('device/invalid-token');
  }
  return token;
}

function checkedUid(uid: string): string {
  if (typeof uid !== 'string' || !UID_PATTERN.test(uid)) throw new Error('device/invalid-uid');
  return uid;
}

/** This browser's user agent, cut to the rules' limit (counted in characters, as the rules count). */
function userAgent(): string {
  const agent = typeof navigator === 'undefined' ? '' : String(navigator.userAgent ?? '');
  const chars = [...agent];
  return chars.length > DEVICE_USER_AGENT_MAX
    ? chars.slice(0, DEVICE_USER_AGENT_MAX).join('')
    : agent;
}

function deviceRef(uid: string, token: string) {
  return doc(db, 'users', checkedUid(uid), 'devices', checkedToken(token));
}

/**
 * Saves this browser as one of the user's push devices. Saving the same token again replaces its
 * document. Rejects with Error('device/invalid-uid' | 'device/invalid-token') before anything is sent.
 */
export async function saveDevice(uid: string, token: string): Promise<void> {
  const ref = deviceRef(uid, token);
  await setDoc(ref, { uid, token, userAgent: userAgent(), updatedAt: serverTimestamp() });
}

/** Deletes one of the user's push devices; a device already gone is not an error. */
export async function removeDevice(uid: string, token: string): Promise<void> {
  await deleteDoc(deviceRef(uid, token));
}
