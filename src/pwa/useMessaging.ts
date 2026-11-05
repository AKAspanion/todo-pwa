/**
 * Push notifications on this device (D19, P1–P3).
 *
 * - Permission is asked for only by `enable()`, which only the notifications toggle calls, from a
 *   click, and only where Firebase's `isSupported()` is true and the browser has `Notification`
 *   and service workers (iOS Safari has no `Notification`): elsewhere `supported` stays false.
 * - The app registers exactly one foreground `onMessage` handler per page session (P2), however
 *   often `useMessaging()` is called or users sign in and out.
 * - Each device is one document, `users/{uid}/devices/{token}` (P3). It is deleted when the toggle
 *   is switched off, before sign-out and after an account deletion (a session sign-out hook), and
 *   when the browser's permission is found revoked. When another account's token is still on this
 *   browser (it never signed out here), the token is revoked, so FCM reports it invalid and the
 *   server deletes that device.
 */
import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
  type Messaging as FirebaseMessaging,
} from 'firebase/messaging';
import { computed, effectScope, ref, watch, type Ref } from 'vue';
import { firebaseApp } from '@/lib/firebase';
import { i18n } from '@/plugins/i18n';
import { router } from '@/router';
import { removeDevice, saveDevice } from '@/services/devices';
import { useNotificationsStore } from '@/stores/notifications';
import { currentUid, errorCode, useSessionStore } from '@/stores/session';
import { useUiStore } from '@/stores/ui';

export type EnableResult = 'granted' | 'denied' | 'unsupported' | 'error';

export interface Messaging {
  /** `isSupported()`, and the browser has `Notification` and service workers. */
  supported: Ref<boolean>;
  /** The browser's notification permission for this site, or 'unsupported'. */
  permission: Ref<NotificationPermission | 'unsupported'>;
  /** This device is saved as a push device of the signed-in user (the toggle's state). */
  enabled: Readonly<Ref<boolean>>;
  /** Asks for permission and saves this device. Only ever called from a click on the toggle. */
  enable(): Promise<EnableResult>;
  /** Deletes this device's document, then its token. Rejects, changing nothing, when the delete fails. */
  disable(): Promise<void>;
}

/** Where this browser remembers which user its token was saved for, across reloads. */
export const DEVICE_STORAGE_KEY = 'pushDevice';
/** The message the service worker posts when a notification is clicked (src/sw.ts sends the same). */
const OPEN_NOTIFICATIONS = 'OPEN_NOTIFICATIONS';
const NOTIFICATIONS_PATH = '/notification';
/** A foreground message is shown in the snackbar, cut to this many characters per part. */
const MESSAGE_PART_MAX = 200;

interface DeviceRecord {
  uid: string;
  token: string;
}

function isDeviceRecord(value: unknown): value is DeviceRecord {
  if (typeof value !== 'object' || value === null) return false;
  const { uid, token } = value as Record<string, unknown>;
  return typeof uid === 'string' && uid !== '' && typeof token === 'string' && token !== '';
}

/** The saved record, or null when there is none, it can't be read, or it isn't one of ours. */
function readDevice(): DeviceRecord | null {
  try {
    const saved = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (!saved) return null;
    const parsed: unknown = JSON.parse(saved);
    return isDeviceRecord(parsed) ? { uid: parsed.uid, token: parsed.token } : null;
  } catch (error) {
    console.warn('[messaging] could not read the saved device:', errorCode(error));
    return null;
  }
}

const supported = ref(false);
const permission = ref<NotificationPermission | 'unsupported'>('unsupported');
const device = ref<DeviceRecord | null>(readDevice());
let messaging: FirebaseMessaging | null = null;
/** getToken has given Firebase the app's own service worker (deleteToken needs it). */
let registrationBound = false;
let ready: Promise<boolean> | null = null;
let api: Messaging | null = null;

function setDevice(record: DeviceRecord | null): void {
  device.value = record;
  try {
    if (record) localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(record));
    else localStorage.removeItem(DEVICE_STORAGE_KEY);
  } catch (error) {
    // Storage can be blocked: the record still holds until the page reloads.
    console.warn('[messaging] could not save the device:', errorCode(error));
  }
}

function browserCanNotify(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator
  );
}

async function detectSupport(): Promise<boolean> {
  // Checked first: without them isSupported() isn't needed, and Notification must never be touched.
  if (!browserCanNotify()) return false;
  try {
    return await isSupported();
  } catch (error) {
    console.warn('[messaging] support check failed:', errorCode(error));
    return false;
  }
}

function clip(value: unknown): string {
  return typeof value === 'string' ? [...value].slice(0, MESSAGE_PART_MAX).join('').trim() : '';
}

function openNotifications(): void {
  router.push(NOTIFICATIONS_PATH).catch((error: unknown) => {
    console.warn('[messaging] could not open notifications:', errorCode(error));
  });
}

/** The one foreground handler (P2): the reminder shows in the snackbar, and the list refreshes. */
function showForegroundMessage(payload: MessagePayload): void {
  const { t } = i18n.global;
  const title = clip(payload.notification?.title ?? payload.data?.title);
  const body = clip(payload.notification?.body ?? payload.data?.body);
  const text = [title, body].filter((part) => part !== '').join(': ') || t('pwa.message.fallback');
  useUiStore().showSnack(text, { actionLabel: t('pwa.message.view'), action: openNotifications });
  if (currentUid()) void useNotificationsStore().load();
}

/** A notification clicked while the app is open: the worker asks the page to show the list. */
function onWorkerMessage(event: MessageEvent): void {
  const data: unknown = event.data;
  if (
    typeof data === 'object' &&
    data !== null &&
    (data as { type?: unknown }).type === OPEN_NOTIFICATIONS
  ) {
    openNotifications();
  }
}

/** Checks support once, and sets up the single onMessage registration where push works. */
function start(): Promise<boolean> {
  ready ??= (async () => {
    const ok = await detectSupport();
    if (!ok) {
      supported.value = false;
      permission.value = 'unsupported';
      return false;
    }
    try {
      messaging = getMessaging(firebaseApp);
      onMessage(messaging, showForegroundMessage);
    } catch (error) {
      console.warn('[messaging] could not start:', errorCode(error));
      messaging = null;
      supported.value = false;
      permission.value = 'unsupported';
      return false;
    }
    supported.value = true;
    permission.value = Notification.permission;
    navigator.serviceWorker.addEventListener('message', onWorkerMessage);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void syncWithPermission();
    });
    return true;
  })();
  return ready;
}

/** This device's FCM token, through the app's own service worker (never firebase-messaging-sw.js). */
async function tokenForThisDevice(): Promise<string> {
  if (!messaging) throw new Error('messaging/unsupported');
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) throw new Error('messaging/no-service-worker');
  const token = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  registrationBound = true;
  return token;
}

/**
 * Revokes this browser's token, so pushes to it stop and FCM reports it invalid. Only with
 * permission granted: getToken would otherwise ask for it. A failure is logged, never thrown.
 */
async function revokeToken(): Promise<void> {
  if (!messaging || Notification.permission !== 'granted') return;
  try {
    if (!registrationBound) await tokenForThisDevice();
    await deleteToken(messaging);
  } catch (error) {
    console.warn('[messaging] could not revoke the token:', errorCode(error));
  }
}

/**
 * Brings the saved device in line with the browser and the signed-in user: a revoked permission
 * deletes the device (P3), and another account's token left on this browser is revoked.
 */
async function syncWithPermission(): Promise<void> {
  if (!(await start())) return;
  permission.value = Notification.permission;
  const record = device.value;
  const uid = currentUid();
  if (!record || !uid) return;
  if (record.uid !== uid) {
    setDevice(null);
    await revokeToken();
    return;
  }
  if (permission.value !== 'granted') {
    // Cleared first, so a second check running meanwhile doesn't delete it twice.
    setDevice(null);
    try {
      await removeDevice(record.uid, record.token);
    } catch (error) {
      console.warn('[messaging] could not delete a revoked device:', errorCode(error));
      // Kept, so the next check tries again.
      if (device.value === null) setDevice(record);
    }
  }
}

async function enable(): Promise<EnableResult> {
  if (!(await start()) || !messaging) return 'unsupported';
  const uid = currentUid();
  if (!uid) {
    console.warn('[messaging] enable: nobody is signed in');
    return 'error';
  }
  try {
    const answer = await Notification.requestPermission();
    permission.value = answer;
    if (answer !== 'granted') return 'denied';
    const token = await tokenForThisDevice();
    if (currentUid() !== uid) {
      console.warn('[messaging] enable: the user changed while enabling');
      return 'error';
    }
    const previous = device.value;
    await saveDevice(uid, token);
    setDevice({ uid, token });
    if (previous && previous.uid === uid && previous.token !== token) {
      // The token changed: the old one is dead, so its document goes too.
      removeDevice(previous.uid, previous.token).catch((error: unknown) => {
        console.warn('[messaging] could not delete the old device:', errorCode(error));
      });
    }
    return 'granted';
  } catch (error) {
    console.warn('[messaging] enable failed:', errorCode(error));
    return 'error';
  }
}

async function disable(): Promise<void> {
  const record = device.value;
  if (record) await removeDevice(record.uid, record.token);
  setDevice(null);
  await revokeToken();
}

/**
 * The sign-out hook: on sign-out it runs while still signed in, before the auth sign-out; after
 * an account deletion it runs with the user already gone, when the rules refuse the delete
 * (`deleteUserData` erases the document instead). The token is revoked whatever the delete does,
 * even if it never settles (offline), so the next user of this browser never gets this user's
 * reminders. The delete's failure still reaches the caller once the token is revoked.
 */
async function forgetThisDevice(): Promise<void> {
  const record = device.value;
  if (!record) return;
  setDevice(null);
  const removal = removeDevice(record.uid, record.token).then(
    () => null,
    (error: unknown) => ({ error }),
  );
  await revokeToken();
  const failed = await removal;
  if (failed) throw failed.error;
}

/** The app's push state, shared by every caller. The first call starts it (setupPwa does that). */
export function useMessaging(): Messaging {
  if (api) return api;
  const session = useSessionStore();
  session.onSignOut(forgetThisDevice);
  const scope = effectScope(true);
  const enabled =
    scope.run(() => {
      watch(
        () => session.user?.uid ?? null,
        () => void syncWithPermission(),
      );
      return computed(() => device.value !== null && device.value.uid === session.user?.uid);
    }) ?? computed(() => false);
  void start().then((ok) => (ok ? syncWithPermission() : undefined));
  api = { supported, permission, enabled, enable, disable };
  return api;
}
