/// <reference lib="webworker" />
/**
 * The app's one service worker (vite-plugin-pwa, injectManifest): the precached app shell with an
 * offline fallback for every in-app navigation (W2), the "new version" handshake (D20), and
 * Firebase Cloud Messaging on the app's own Firebase major (P4).
 */
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import { clientsClaim } from 'workbox-core';
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare let self: ServiceWorkerGlobalScope;

/** Where a clicked reminder takes the user. */
const NOTIFICATIONS_PATH = '/notification';
/** The message the page listens for to show the notifications (src/pwa/useMessaging.ts). */
const OPEN_NOTIFICATIONS = 'OPEN_NOTIFICATIONS';
const NOTIFICATION_ICON = '/img/icons/android-chrome-192x192.png';

// ---- app shell (W2) ---------------------------------------------------------------------------

// The build injects the list of files to precache here (vite-plugin-pwa, injectManifest).
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Any in-app navigation, such as a deep link to /home, gets the precached shell, online or not.
// Firebase's reserved /__/ paths and the asset-links statement are real files, never the app.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/__\//, /^\/\.well-known\//],
  }),
);

// ---- updates (D20) ----------------------------------------------------------------------------

// A new version waits until the user accepts the "new version available" prompt.
self.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | null)?.type === 'SKIP_WAITING') void self.skipWaiting();
});

clientsClaim();

// ---- push (P4) --------------------------------------------------------------------------------

/** Focuses an open window of the app and shows its notifications, or opens a new one there. */
async function openNotifications(): Promise<void> {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
  if (open) {
    const focused = await open.focus();
    // The page routes itself, so nothing typed in an open form is lost.
    focused.postMessage({ type: OPEN_NOTIFICATIONS });
    return;
  }
  await self.clients.openWindow(NOTIFICATIONS_PATH);
}

// Added before Firebase's own click listener (getMessaging adds it), so this one runs first and
// handles every reminder, including those Firebase showed itself, which carry no link.
self.addEventListener('notificationclick', (event) => {
  event.stopImmediatePropagation();
  event.notification.close();
  event.waitUntil(openNotifications());
});

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Push listeners must be added while the worker script first runs, so this is synchronous.
if (firebaseConfig.apiKey && firebaseConfig.messagingSenderId && firebaseConfig.appId) {
  try {
    const messaging = getMessaging(initializeApp(firebaseConfig));
    onBackgroundMessage(messaging, (payload) => {
      // A message with a `notification` part (the reminder function sends one) is shown by
      // Firebase itself; showing it here too would show it twice. Data-only messages are shown here.
      if (payload.notification) return;
      const title = payload.data?.title;
      if (!title) return;
      void self.registration.showNotification(title, {
        body: payload.data?.body ?? '',
        icon: NOTIFICATION_ICON,
        data: { taskId: payload.data?.taskId ?? null },
      });
    });
  } catch (error) {
    console.warn(
      '[sw] push messaging unavailable:',
      error instanceof Error ? error.name : 'unknown',
    );
  }
} else {
  console.warn('[sw] Firebase config missing: push messaging is off.');
}
