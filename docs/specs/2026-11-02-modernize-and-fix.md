# Spec: Modernise Task Manager PWA and fix every known defect

_2026-11-02 · status: approved 2026-11-02 · source: code review of `master` @ `7b076c9` (two independent reviews plus verification), `docs/FIXES_REPORT.md`_

## §1 Goal

Rebuild Task Manager on currently supported libraries, keeping every feature users have today, and fix every defect listed in §4–§6, so that each fix is covered by an automated test.

## §2 Target stack

Exact majors (latest stable on 2026-11-02, checked for peer compatibility):

| Area | Today | Target |
|---|---|---|
| Runtime / tooling | Node 24, Vue CLI 5 (webpack) | Node 24 LTS (`.nvmrc`), **Vite 8**, `@vitejs/plugin-vue` 6 |
| Framework | Vue 2.6 (EOL) | **Vue 3.5**, `<script setup lang="ts">` |
| UI kit | Vuetify 2 (EOL) | **Vuetify 4** + `vite-plugin-vuetify` 2, `@mdi/font` 7 |
| Routing | vue-router 3 | **vue-router 5** |
| State | Vuex 3 | **Pinia 4** |
| i18n | vue-i18n 8 | **vue-i18n 11** (Composition API, `fallbackLocale: 'en'`) |
| Backend SDK | Firebase 10 compat | **Firebase 13 modular** (`firebase/app`, `/auth`, `/firestore`, `/messaging`) |
| PWA | `@vue/cli-plugin-pwa` (Workbox 6) | **vite-plugin-pwa 2** (Workbox 7), `injectManifest` strategy |
| Dates | moment | **dayjs** with `en` and `hi` locales |
| Markdown | vue-markdown (Vue 2 only, raw HTML) | **markdown-it 15** (`html: false`) + **DOMPurify 3** |
| Drag and drop | vuedraggable 2 | **vue-draggable-plus** |
| Types | TypeScript 4.9, 128 `@ts-ignore` | **TypeScript 6.0** + **vue-tsc 3** (TS 7's native compiler is not yet supported by vue-tsc); zero `@ts-ignore` |
| Lint / format | none working | **ESLint 10** flat config, `eslint-plugin-vue` 10, `@vue/eslint-config-typescript` 14, **Prettier 3** |
| Tests | none | **Vitest 5** + `@vue/test-utils` 2 (unit), **Playwright 1.64** (e2e) against the **Firebase Emulator Suite** |
| Cloud Functions | Node 8 runtime, firebase-functions 3, firebase-admin 8 | **Node 22**, **firebase-functions 7** (v2 API), **firebase-admin 14** |
| CI | none | GitHub Actions on PRs: typecheck, lint, format-check, unit, e2e |

Removed: `vue-class-component`, `vue-property-decorator`, `vue2-waterfall` (unused), `register-service-worker`, `babel-runtime`, `core-js`, `moment`, `vue-markdown`, `vuedraggable`, `tslint.json`.

## §3 Behaviour to keep (parity)

1. Sign in and sign up with email and password, and Google. Facebook sign-in is removed (decision §11.1). Signed-out users are redirected to `/signin?redirect=<path>` and land back on that path after signing in.
2. Create a task with a title, a Markdown description, a date and time (or "indefinite"), and any number of labels.
3. Task list grouped into Todo and Done. Drag a task between the two lists to change its status, or use the check button. Edit and delete in place.
4. Search by text (title and description), filter by labels (match any), and pick a date in the date bar (indefinite tasks always show).
5. Calendar with day, week and month views showing dated tasks.
6. Profile: edit display name, create labels (name plus colour).
7. Notifications page lists received reminders; each can be deleted.
8. Push reminder 1 hour before a dated, not-done task.
9. English and Hindi; light and dark theme; both remembered per device.
10. Installable PWA that works offline for the app shell, plus the Play Store TWA (`app.web.spanion_todo.twa`).

## §4 Functional defects to fix

- **D1** Date-only strings (`YYYY-MM-DD`) are parsed as UTC midnight, so users west of UTC see every task a day early and the header says "yesterday" for today. Dates must be parsed and shown in the device's local time zone.
- **D2** The home header label is built by slicing a fixed number of characters off `calendar()` output, which garbles Hindi (shows "आ"). Use explicit relative-day formats: "today", "tomorrow", "yesterday", otherwise the weekday and date.
- **D3** "Today" is computed once at load, so a PWA left open past midnight shows the wrong day. Recompute "today" when the date changes and when the app becomes visible.
- **D4** The calendar adds English ordinal suffixes in Hindi. Use locale-aware formatting.
- **D5** Notification timestamps are stored as `toLocaleString()` text in IST and sorted with `new Date(text)`. Store a Firestore `Timestamp`, sort newest first, and show it in the user's time zone.
- **D6** Task labels load after the list has rendered (race), cost one read per label, and break in three ways: a task without `type` breaks loading for every task, a deleted label renders a blank chip, and editing before labels load saves `type: []`. Load labels once and join by id. A missing label is dropped from the chip list without changing stored data.
- **D7** Editing writes the client-only `id` into the document. The edit form also closes before the save finishes, so a failed save loses the user's input. Write only editable fields, keep the form open until the save succeeds, and show the error on failure.
- **D8** Search throws on a task with no description. The label filter matches substrings of concatenated ids. Treat missing text as empty and compare ids exactly.
- **D9** An empty Todo or Done column can't receive a dropped task. Dragging within a list snaps back. Empty columns must accept drops; ordering within a list is by date then time (no manual reorder).
- **D10** While loading, skeleton cards are rendered alongside real cards. Show either skeletons or cards, never both.
- **D11** Check, edit and delete buttons on task cards, and the name-edit button on Profile, only appear on mouse hover. They must always be reachable by touch and keyboard.
- **D12** On a load failure, Profile and Notification store the error string as tasks, labels and notifications. A failed load must leave the existing data and show "Couldn't load your data. Try again." with a Retry action.
- **D13** Signing out doesn't clear labels, notifications or the snackbar, so the next account briefly sees the previous user's data. Sign-out clears all per-user state.
- **D14** Sign-up rejects valid emails (TLDs longer than 3 letters, such as `.info`) and strong passwords containing `- _ ^`. Accept any address Firebase accepts. Require at least 8 characters with a letter and a digit.
- **D15** A label with an empty or whitespace-only name can be created. Require 1–30 characters after trimming.
- **D16** The calendar's event click does nothing. Clicking an event opens that task's details.
- **D17** The bottom nav has no active tab on `/` and `/index`, and three routes render the task list. `/` and `/index` redirect to `/home`.
- **D18** Hindi is missing `toast.error.name.edit`, there is no `fallbackLocale`, and about 20 UI strings are hard-coded in English (TaskAdd, TaskCard, Calendar, Notification, Profile, TaskCardGrid, ContainerMenu). Every visible string comes from the locale files, with keys present in both `en` and `hi`.
- **D19** The snackbar and notification-permission toggle bind `v-model` to store getters, so the toggle does nothing. The toggle requests permission when switched on and removes this device's token when switched off.
- **D20** After a deploy, the service worker reloads open tabs, which can discard a half-written task. Show a "New version available" snackbar with a Reload action instead.

## §5 Push notifications and backend defects

- **P1** Notification permission is requested from a watcher, not a user gesture, so Safari and Firefox block it. There is no `isSupported()` guard: `Notification` is undefined on iOS Safari, and `firebase.messaging()` throws without service-worker support. Request permission only from the toggle (D19), only where `isSupported()` is true. Elsewhere, show the toggle disabled with "Notifications aren't supported on this browser."
- **P2** Every sign-in adds another foreground `onMessage` handler. Register exactly one handler per app session.
- **P3** One `fcm/{uid}` token per user: a device that declines permission writes `null` and disables every other device, and tokens survive sign-out, so the next user on that browser gets the previous user's reminders. Store one document per device (`users/{uid}/devices/{token}`), delete it on sign-out and when permission is revoked, and delete it server-side when FCM reports it invalid.
- **P4** The background service worker loads Firebase 3.9.0. It must use the same SDK major as the app, inside the single vite-plugin-pwa service worker.
- **P5** The reminder function is broken:
  - it uses the legacy FCM API (shut down in 2024);
  - its date comparison never matches;
  - it computes time differences on `HH.MM` decimals;
  - it skips tasks due within the current minute;
  - it has no "already notified" flag;
  - one null token or malformed task aborts the whole run;
  - its send loop is fire-and-forget after the response;
  - it hard-codes IST;
  - it reads every task of every user each hour;
  - it runs on Node 8.

  Replace it with a v2 `onSchedule('every 5 minutes')` function that queries tasks with `remindAt <= now + 60 min`, `remindAt > now` and `reminded == false`. It sends over the HTTP v1 API to each of the owner's devices, writes a notification document with a server `Timestamp`, and sets `reminded = true`. One failure must not stop the other sends.
- **P6** `remindAt` is a UTC `Timestamp`, computed on save from the task's local date and time plus the device's IANA time zone (stored as `timeZone`). It is cleared for indefinite and done tasks and recomputed on edit; editing date or time resets `reminded`.

## §6 Security

- **S1** The HTTP function `testFunction` is public and unauthenticated, and returns every user's FCM token and task titles. Delete it.
- **S2** There are no Firestore rules in the repo. Add `firestore.rules`, deployed from `firebase.json`. A user may read and write only documents whose `uid` equals their auth uid (`tasks`, `types`, `notifications`), and only their own `users/{uid}/devices/*`. Clients may not create or update `notifications` (functions write them) but may delete their own. `uid` cannot change on update. Field types and sizes are validated: title 1–200 characters, description up to 5,000, label name 1–30.
- **S3** Task descriptions render Markdown with raw HTML allowed (script injection). Render with markdown-it `html: false`, sanitise the output with DOMPurify, and open links with `rel="noopener noreferrer"`.
- **S4** The reminder function trusts client-written `uid`, `title` and tokens. Covered by S2 (ownership) plus P3 (tokens live under the owner's own path).
- **S5** Production source maps are deployed publicly. Don't publish them: build them for error tracking, but leave them out of `dist`.
- **S6** `window.open` without `noopener` in the menu: use `rel="noopener noreferrer"`.

## §7 PWA and platform

- **W1** `/.well-known/assetlinks.json` serves `[]`, so the Play Store TWA fails verification and shows a URL bar. Serve the real statement (Play signing and upload key fingerprints) at `/.well-known/assetlinks.json` with `Content-Type: application/json`, and exclude it from the `**/.*` ignore rule.
- **W2** There is no offline navigation fallback, and the 2.2 MB vendor chunk exceeds the precache limit. The app shell, including deep links such as `/home`, must load offline after one online visit, with every precached file under 2 MB.
- **W3** The manifest has three different theme colours, no `id`, `scope` or maskable icon, and a black splash next to a light loader. Use one theme colour (`#1976D2`), background `#FAFAFA`, `id: "/"`, `scope: "/"`, `start_url: "/home"`, and a maskable icon.
- **W4** Keep PR #61's caching: `no-cache` on the service worker, `index.html` and SPA routes; long-lived immutable caching on hashed assets.
- **W5** Every icon-only button has an `aria-label` from the locale files.

## §8 Repo hygiene

- **H1** Remove Android build outputs from git (`packages/android/source/.gradle/`, `app/build/` including `mapping.txt` and `.dex`, `*.idsig`) and ignore them. Keep the TWA source and its README.
- **H2** `.gitignore` covers `.env`, `.env.*.local`, `.firebase/`, `firebase-debug.log`, `dist/`, `coverage/`, `playwright-report/`, `test-results/`.
- **H3** README: Node version, `.env.local` from `.env.example` (including `VUE_APP_VAPID_KEY`, renamed to `VITE_*`), emulator workflow, test commands, deploy steps.
- **H4** `.browserslistrc` targets supported browsers only (`defaults and supports es6-module`).

## §9 Quality gates

`npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test` (Vitest) and `npm run e2e` (Playwright against emulators) pass locally and in CI. No `@ts-ignore`, no `any` in `src/` except at third-party boundaries, commented.

## §10 Non-goals

No new features, no backend other than Firebase, no redesign beyond what Vuetify 4's defaults change. Data written by the old app stays readable. A one-off migration fills in `remindAt`/`timeZone`/`reminded` on existing tasks (P6) and moves `fcm/{uid}` to `users/{uid}/devices` (P3).

## §11 Decisions (2026-11-02, developer)

1. Facebook sign-in is removed: no Facebook button, provider or code. The developer disables the Facebook provider in the Firebase console after deploy. Accounts that only ever signed in with Facebook can no longer sign in.
2. Push reminders are kept (needs the Blaze plan for scheduled functions).
3. The one-off migration assumes `Asia/Kolkata` for existing tasks.
