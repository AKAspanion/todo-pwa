/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

// The build injects the list of files to precache here (vite-plugin-pwa, injectManifest).
// Task 9 adds the offline navigation fallback and Firebase background messages.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// A new version waits until the user accepts the "new version available" prompt (D20).
self.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | null)?.type === 'SKIP_WAITING') void self.skipWaiting();
});

clientsClaim();
