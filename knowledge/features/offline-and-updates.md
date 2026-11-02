---
type: Feature
status: draft
title: Install, offline and updates
description: The app installs as a PWA, opens offline once loaded online, offers each new release instead of forcing it, and removes the old app's service workers.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
---

# Install, offline and updates

## What it does

- **Install:** the web manifest, built in `vite.config.ts` (`VitePWA` → `manifest`), makes the site installable
  with `start_url` `/home`, one theme colour and a maskable icon (spec W3).
- **Offline:** the service worker precaches the app shell, and every in-app navigation, such as a deep link to
  `/home`, gets the precached `index.html` online or not (spec W2). Firebase's reserved `/__/` paths and
  `/.well-known/` are left to the network. Data still needs the network.
- **Updates:** a new release waits. The snackbar says a new version is available with a Reload action, and the
  page reloads only when this tab's user clicks it, so a half-written task is never lost (spec D20).
- **Old workers:** at start-up the app unregisters the old Vue 2 app's `/service-worker.js` and
  `/firebase-messaging-sw.js` workers. Both files in `public/` are now kill switches, kept out of the precache
  and served `no-cache`; the app removes them itself as well, because a browser may never re-check the FCM
  worker's registration (`src/pwa/legacyWorkers.ts`).

## Screens and routes

No screen of its own: `src/pwa/index.ts` starts it from `src/App.vue`; the prompt shows in the app's snackbar.

## Rules

- Every precached file, and every chunk the build emits, stays under `MAX_PRECACHE_BYTES` in `vite.config.ts`;
  vendor code is split into Firebase, Vuetify, Vue and the rest to keep under it.
- `index.html`, the service workers and SPA routes are served `no-cache`, hashed `/assets/**` as immutable
  for a year (`firebase.json`, spec W4).
- The service worker accepts `SKIP_WAITING` only from its own origin (`src/sw.ts`).

## Sources

- `vite.config.ts`
- `src/sw.ts`
- `src/pwa/index.ts`
- `src/pwa/useUpdatePrompt.ts`
- `src/pwa/legacyWorkers.ts`
- `src/App.vue`
- `public/service-worker.js`
- `public/firebase-messaging-sw.js`
- `firebase.json`
