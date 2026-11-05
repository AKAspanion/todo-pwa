---
type: Application
title: Web app
description: The Vue 3 single-page app at the repository root, built by Vite and served by Firebase Hosting as an installable PWA.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
verified: human:panditankit1995@gmail.com
---

# Web app

## Role

The product itself: every screen a user sees, in the browser, as an installed PWA, and inside the Android and
iOS wrappers. It reads and writes the user's own Firestore documents directly
([project/architecture](../project/architecture.md)).

## Stack

Vue 3 with Vuetify, vue-router, Pinia and vue-i18n, Firebase's modular SDK, dayjs, markdown-it with DOMPurify,
and vite-plugin-pwa (Workbox). Versions are in `package.json`; the Node version is in `.nvmrc`, and
`.browserslistrc` sets the browsers.

## Look

The screens are drawn like the old Vue 2 app, on Vuetify's md2 blueprint
([decisions/restore-original-design](../decisions/restore-original-design.md), [design-system/tokens](../design-system/tokens.md)).
The exception is the logo: the browser-tab favicon and the loading screen in `index.html` show the blue double tick
([decisions/app-logo](../decisions/app-logo.md)).

## Entry points

- `index.html` loads `src/main.ts`, which installs Pinia, the router, i18n and Vuetify and mounts `src/App.vue`.
- `src/App.vue` lays out the menu, the routed view, the bottom navigation and the snackbar, and calls
  `setupPwa()` (`src/pwa/index.ts`) once on mount.
- `src/sw.ts` is the service worker; `vite.config.ts` builds it and the web manifest.
- The dev server's port is Vite's default (`pnpm run dev`); the e2e server's is `E2E_PORT` in `playwright.config.ts`.

## Screens and routes

The routes are declared in `src/router/index.ts`: `/home`, `/calendar`, `/add`, `/notification` and `/profile`
need a signed-in user (`meta.requireAuth`, enforced by `authGuard` in `src/router/guard.ts`); `/signin` and
`/signup` don't, and neither do the public `/privacy` and `/delete-account` pages, which also show no menu or
bottom bar ([features/legal-pages](../features/legal-pages.md)). `/`, `/index` and any unknown path redirect to `/home`. Each route's `meta.nav` names the
bottom-navigation tab it marks. The screens are described per feature in [features](../features/index.md).

## Depends on

- [integrations/firebase](../integrations/firebase.md): Auth, Firestore and Hosting.
- [integrations/fcm](../integrations/fcm.md): push.
- The configuration in [operations/environment](../operations/environment.md).

## History

- 2026-11-05: the tab icon was an up arrow and the loading screen a plain spinner; now both show the blue double tick, because the developer chose it as the logo everywhere. See [decisions/app-logo](../decisions/app-logo.md).

## Sources

- `package.json`
- `.nvmrc`
- `.browserslistrc`
- `index.html`
- `public/favicon.ico`
- `src/main.ts`
- `src/App.vue`
- `src/pwa/index.ts`
- `src/router/index.ts`
- `src/router/guard.ts`
- `src/sw.ts`
- `vite.config.ts`
- `playwright.config.ts`
