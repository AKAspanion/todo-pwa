/*
 * Kill switch for the old Vue 2 app's Firebase Cloud Messaging worker (security review C1, I2).
 *
 * The old app's Firebase 3.9 SDK registered /firebase-messaging-sw.js at its own scope,
 * /firebase-cloud-messaging-push-scope, and bound each browser's legacy FCM token to that
 * registration. When the browser checks that registration for an update it gets this file
 * (served no-cache by firebase.json), which unregisters it. That drops its push subscription, so
 * the legacy tokens stop working. The new app gets its push token through its own worker, /sw.js,
 * and never registers this file; the new worker's precache leaves it out (vite.config.ts).
 *
 * It deletes no caches: the old messaging worker cached nothing.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.registration.unregister());
});
