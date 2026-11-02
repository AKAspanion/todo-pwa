/*
 * Kill switch for the old Vue 2 app's service worker (security review C1).
 *
 * The old app (@vue/cli-plugin-pwa 5, Workbox GenerateSW with its defaults) registered
 * /service-worker.js at scope "/" and precached index.html and every chunk, in the Workbox caches
 * "workbox-precache-v2-<scope>" (and "workbox-runtime-<scope>"). Its manifest and the Play Store
 * TWA launch ./index.html, which that precache answered, so installed users would keep the old app
 * for ever. When the browser checks the old registration for an update it fetches this file
 * (served no-cache by firebase.json), installs it and runs it:
 *
 * - install: take over at once, without waiting for the old app's tabs to close;
 * - activate: delete every Cache Storage entry (the old precache is all this origin had: the new
 *   app's worker, /sw.js, can't share this registration), unregister this registration, and
 *   reload every window it controls, so the page loads the new app from the network, and the new
 *   app registers its own worker, /sw.js.
 *
 * It has no fetch handler, so nothing is served from it in the meantime. The new app never
 * registers this file, and the new worker's precache leaves it out (vite.config.ts).
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
      await self.registration.unregister();
      const windows = await self.clients.matchAll({ type: 'window' });
      await Promise.all(
        windows.map((client) =>
          // The old start URL, /index.html, now serves the new app, which routes it to /home.
          client.navigate(client.url).catch(() => undefined),
        ),
      );
    })(),
  );
});
