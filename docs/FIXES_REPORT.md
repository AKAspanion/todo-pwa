# Task Manager PWA — Review & Fix Report

_Reviewed 2026-11-02 · Vue 2 + Vuetify 2 + Firebase · branch `master` @ `7a0eb91`_

## 1. Login / sign-up: what was broken and what changed

| # | Root cause | Effect | Fix applied |
|---|---|---|---|
| A | `firebase@6` pulls in `@firebase/firestore@1.5` → native `grpc@1.23`, which cannot compile on any current Node (fails on 22/24). | `npm install` fails, so the app cannot run or be built locally at all. | Upgraded to `firebase@^10.14.1` using the **compat** API (`firebase/compat/*`), so existing `firebase.auth()` / `firebase.firestore()` code is unchanged. |
| B | Dependabot bumped `@vue/cli-service` to v5 while `cli-plugin-babel/pwa/typescript` stayed on v3 (and `core-js@2`, TS 3.x). | Mismatched toolchain; build cannot run. | Aligned all CLI plugins to `^5.0.8`, `core-js@3`, `typescript@~4.9.5`, added `@types/webpack-env`, babel preset → `@vue/cli-plugin-babel/preset`, added `babel-runtime` (needed by `vue-markdown`'s dist). |
| C | Firebase config comes from `VUE_APP_*` env vars, but no `.env` exists and nothing documents the VAPID key. | `initializeApp` gets `undefined` keys → every auth call fails (`auth/invalid-api-key`). | Added `.env.example`; a clear console error is logged when config is missing. Local `.env.local` (gitignored) created from the live site's public config. |
| D | Router `beforeEach` registered a **new** `onAuthStateChanged` listener on every navigation and never unsubscribed. Stale listeners later called `next()` on finished navigations; redirect decisions also relied on a `localStorage.isLoggedIn` flag. | Races after login/logout (bounced back to `/signin`, double navigations), listener leak; stale flag could send a signed-out user to `/home`. | Guard now awaits the initial auth state once (`waitForAuthReady`) and decides from the real user; one app-wide listener syncs the store and redirects to `/signin` on sign-out. Redirect target preserved via `?redirect=`. |
| E | Google/Facebook used `signInWithRedirect` with `authDomain = spanion-todo.firebaseapp.com` while the app is served from `spanion-todo.web.app` / `localhost`. Modern browsers partition the storage this flow needs; `getRedirectResult` was never read. | Social sign-in silently returns to the sign-in page with no user. | Switched to `signInWithPopup` with redirect fallback only when the popup is blocked; success navigates, errors are shown; redirect errors surfaced on the sign-in page. |
| F | Sign-up swallowed Firebase errors (generic toast); sign-in had a dead second `.catch`. | Users never saw "email already in use", "weak password", etc. | Real Firebase error messages shown; spinner reset in `.finally`. |
| G | `index.html` loaded `/__/firebase/6.6.2/firebase-app.js` + `init.js` (Hosting-only URLs). | 404/MIME errors locally; a second, unused Firebase v6 copy in production. | Removed. |
| H | Nav bar (which triggers the push-permission prompt) was shown before the auth check finished. | `Uncaught (in promise) Error: User not defined` on every protected-route load while signed out. | Nav bar is shown only after a signed-in user is confirmed. |

Also removed `firebase-admin` / `firebase-functions` from the **web** app's dependencies (server-only; they live in `functions/`), and fixed `App.vue` calling `isAppInitialized` without `()`.

**Verified:** `npm install` and `npm run build` succeed on Node 24; dev server boots; protected routes redirect to `/signin?redirect=…`; sign-in/sign-up pages render; Google button reaches Google's account chooser (provider enabled, `localhost` is an authorized domain).
**Not verified:** a full email or Google sign-in with a real account (needs your credentials); Facebook login.

### Still to do for auth (console / config, no code)
- Run a real sign-in + sign-up in Chrome and Safari against `npm run serve`, then redeploy (`npm run build && firebase deploy --only hosting`).
- Firebase Console → Authentication → Sign-in method: confirm **Email/Password** is enabled.
- **Facebook**: the Meta app likely needs re-review / is in dev mode; confirm App ID/secret and OAuth redirect URI `https://spanion-todo.firebaseapp.com/__/auth/handler`. Consider dropping it if unused.
- Optional (better mobile UX than popups): set `VUE_APP_AUTH_DOMAIN=spanion-todo.web.app` and add `https://spanion-todo.web.app/__/auth/handler` to the Google OAuth client's redirect URIs. Then redirect sign-in works same-origin.

---

## 2. Other fixes needed (prioritised)

### P0 — Security / data exposure
1. **Public HTTP function leaks every user's FCM token and task titles.** `functions/index.js` `testFunction` is an unauthenticated `onRequest` that reads *all* `fcm` and `tasks` docs, sends pushes, and returns `[fcm, messages]` in the response. Delete it (or require auth + admin check).
2. **Firestore security rules are not in the repo.** The client only filters by `where('uid','==',…)`; if console rules are permissive, any signed-in (or anonymous) client can read/modify all tasks, types, notifications and FCM tokens. Add `firestore.rules` restricting each collection to `request.auth.uid == resource.data.uid` (and `fcm/{uid}` to its owner), wire it in `firebase.json`, and deploy.
3. **Stored HTML in task descriptions.** `TaskCard.vue` renders `task.description` with `vue-markdown`, which allows raw HTML by default → script injection (self-XSS today, real XSS if tasks are ever shared). Set `:html="false"` or replace with `markdown-it` + DOMPurify.

### P1 — Broken features
4. **Push reminders never fire.**
   - Uses legacy `admin.messaging().sendToDevice` — the legacy FCM API was shut down (June 2024). Move to `admin.messaging().send({ token, notification })` (HTTP v1).
   - Date comparison can never match: tasks store `YYYY-MM-DD`, function compares to `new Date().toLocaleString().substr(0,10)` (`11/2/2026,`). Time diff treats `HH.MM` as decimals (minutes wrong). Rewrite with real timestamps.
   - Runtime `node 8` is decommissioned (cannot deploy) and `functions.config()` is deprecated → upgrade to Node 20/22, `firebase-functions` v6, `firebase-admin` v12+, `initializeApp()` with no args.
   - Hourly job scans **all** tasks of all users — store a `remindAt` timestamp and query `where('remindAt', '<=', now+1h)`.
   - Timezone hard-coded to `Asia/Kolkata`; store per-user tz or UTC.
5. **Service worker for background push is on Firebase 3.9.0** (`public/firebase-messaging-sw.js`, `setBackgroundMessageHandler`). Update to the same SDK major (compat 10.x: `onBackgroundMessage`, full config incl. `apiKey`, `projectId`, `appId`). Also set `VUE_APP_VAPID_KEY`.
6. **Foreground push handler crashes:** `src/firebase/index.ts` imports `getAllNotificationsForUser` from `util/commonHelper` but it lives in `util/firebaseHelper` (build warns "export not found"). Fix the import (watch for the circular import with `firebaseHelper` → `firebase`).
7. **`sendFCMTokenToServer` throws synchronously** inside promise chains when no user → unhandled rejections. Return `Promise.reject` / guard earlier.
8. **Task labels load racily:** `parseAllTasks` resolves before each `type.get()` finishes (labels pop in later / may be missing on first render) and does N+1 reads. `await Promise.all` the refs, or fetch types once and join by id client-side.
9. **Error path corrupts store:** `Profile.vue` / `Notification.vue` use `.catch(e => e).then(response => response[0])` — on failure a string is dispatched as tasks/types. Remove the early `.catch`.
10. **Offline PWA incomplete:** `chunk-vendors.js` (2.2 MB) exceeds Workbox's precache limit, so the app shell doesn't work offline. Migrate to the modular Firebase API (tree-shakable) and/or set `pwa.workboxOptions.maximumFileSizeToCacheInBytes`.

### P2 — Maintainability / platform
11. **EOL stack:** Vue 2.6 (EOL Dec 2023), Vuetify 2 (EOL Jan 2025), vue-i18n 8, vue-router 3, `moment` (maintenance mode), `vue-markdown` (abandoned). Short term: bump to Vue 2.7.16 (also removes the 19 `export 'default' … style0` build warnings). Long term: Vue 3 + Vuetify 3 + Vite, Firebase modular API, `dayjs`/`date-fns`.
12. **`npm run lint` is broken** — `@vue/cli-plugin-eslint` not installed; `tslint.json` is for the deprecated TSLint. Add ESLint + `@typescript-eslint`, Prettier.
13. **Heavy `// @ts-ignore` / `any` usage** (≈100 across views) hides real bugs; `tsconfig` `include` lists non-existent `src/router/router.js`. Move components to typed `defineComponent` / proper typings.
14. **State mutated outside Vuex:** `Profile.vue` binds `this.user = this.currentUser` (same object) to `v-model`, mutating store state directly. Clone it.
15. **Router hygiene:** three routes (`/`, `/index`, `/home`) render `TaskList`; `ContainerMain` adds its own `router.beforeEach` in `created`. Consolidate with redirects; use `afterEach` for transitions.
16. **No tests / CI.** Add Vitest/Jest for helpers (`firebaseHelper`, date utils) and a Playwright smoke test for sign-in → add task → sign-out; GitHub Actions running lint + build.
17. **Repo hygiene:** `packages/android` commits Gradle caches and `app/build/` intermediates (~488 files, 7 MB) plus `app-release-signed.apk.idsig`; `.firebase/*.cache` committed. Add to `.gitignore` and remove from the index. Add `.nvmrc` (Node 22/24) and `engines`.
18. **Docs:** README says `npm run buid`; document `.env.local`, VAPID key, and function deployment.

---

## 3. Suggested order of work
1. Test & deploy the auth fix (section 1 checklist).
2. P0 items 1–3 (delete `testFunction`, ship Firestore rules, disable markdown HTML) — small, high impact.
3. Rewrite the reminder function + SW (items 4–7) if push notifications are still wanted; otherwise remove the feature.
4. Data-loading fixes (8–10).
5. Plan the Vue 3 / Vuetify 3 / Vite / modular-Firebase migration (11–16) as a separate project.
