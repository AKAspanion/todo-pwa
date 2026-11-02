# Task Manager PWA: Fix Report

_Updated 2026-11-02 at the end of the modernisation run · branch `feat/modernize-stack` · spec
`docs/specs/2026-11-02-modernize-and-fix.md` · plan `docs/plans/2026-11-02-modernize-and-fix.md`_

> **Read this first: nothing has been run yet.** By the developer's policy for this run, no tests,
> typecheck, lint, format check, build, rules tests, functions tests or visual comparisons were run
> for any of the 11 tasks. Every item below is **implemented, with tests written, but unverified**.
> Run the gates (see [What is left for you](#what-is-left-for-you)) before you merge or deploy.

The app moved from Vue 2 + Vuetify 2 + Firebase 10 compat (Vue CLI) to Vue 3.5, Vite 8, Vuetify 4,
vue-router 5, Pinia, vue-i18n 11 and Firebase 13 modular. Cloud Functions moved to Node 22 with
firebase-functions 7 (v2 API). Tests use Vitest and Playwright against the Firebase Emulator Suite
(project `demo-todo`, never the live project).

The earlier review this report replaces (the auth fix on `master` and the prioritised list of
problems) is in git history at `7365ed5:docs/FIXES_REPORT.md`. Every problem it listed is one of
the spec items below.

## The tasks

| Task | What it did | Commit |
|---|---|---|
| 1 | Foundation: Vite 8 / Vue 3.5 / Vuetify 4 shell, i18n, router, emulator harness, CI | `b8af93e`, `6b9bea5` |
| 2 | Data layer: typed Firebase services, local-time dates, sanitised Markdown, Pinia stores | `e19c78c` |
| 3 | Firestore security rules and the reminders index | `fd224f2` |
| 4 | Sign-in, sign-up, route guard, app menu (no Facebook) | `4e2a916` |
| 5 | Home: task board, task card, date bar, search, label filter | `ef35f7a` |
| 6 | Add-task screen | `90b5774` |
| 7 | Calendar screen; Vuetify wired to vue-i18n with Hindi messages | `5d67f0b` |
| 8 | Profile and labels | `df89707` |
| 9 | PWA service worker, push on the client, notifications screen | `3a04dee` |
| 10 | Cloud Functions: reminders on Node 22, legacy data migration | `cb249c3`, `7b515e8` |
| 11 | Repo hygiene, README, this report, end-to-end smoke test | this commit |

## Every spec item, and the task that fixed it

Status for every row: **fixed in code, tests written, not yet run.**

### Functional defects (§4)

| Item | Problem | Fixed by | How |
|---|---|---|---|
| D1 | Date-only strings parsed as UTC midnight: tasks a day early west of UTC | Tasks 2, 6 (shown by 5, 7) | Dates are parsed and shown in the device's local zone (`src/lib/dates.ts`); the add form starts on today's local date |
| D2 | Home header garbled in Hindi (sliced `calendar()` text) | Task 5 (helper from Task 2) | Explicit "today / tomorrow / yesterday", otherwise weekday and date |
| D3 | "Today" fixed at load | Tasks 2, 5 | "Today" recomputed at midnight and when the app becomes visible |
| D4 | English ordinals in Hindi on the calendar | Task 7 | Locale-aware formatting |
| D5 | Notification time stored as IST text | Tasks 2, 9, 10 | A Firestore `Timestamp` (`createdAt`), newest first, shown in the user's zone; the migration converts old ones |
| D6 | Label loading race, N+1 reads, blank chips, `type: []` saved | Tasks 2, 5 | Labels load once and are joined by id; a missing label is dropped from the chips without changing stored data |
| D7 | Edit wrote `id` into the document and closed before the save finished | Tasks 2, 5 | Only editable fields are written; the form stays open until the save succeeds and shows the error on failure |
| D8 | Search threw on a missing description; label filter matched substrings | Task 2 (used by 5) | Missing text treated as empty; label ids compared exactly |
| D9 | Empty column couldn't take a drop; drag within a list snapped back | Task 5 | Empty columns accept drops; order within a list is date then time |
| D10 | Skeletons shown next to real cards | Task 5 | Skeletons or cards, never both |
| D11 | Card and Profile buttons appeared only on hover | Tasks 5, 8 | Always visible and keyboard-reachable |
| D12 | A failed load stored the error string as data | Tasks 2, 5 (also 7, 8, 9) | Existing data kept; "Couldn't load your data. Try again." with Retry |
| D13 | Sign-out left the previous user's labels, notifications, snackbar | Tasks 2, 4; UI check in Task 11's smoke test | Sign-out clears all per-user state |
| D14 | Sign-up rejected `.info` emails and passwords with `- _ ^` | Task 4 | Any email Firebase accepts; password at least 8 characters with a letter and a digit |
| D15 | Empty or whitespace label names accepted | Tasks 2, 8 | 1–30 characters after trimming (also enforced by the rules, Task 3) |
| D16 | Calendar event click did nothing | Task 7 | Opens the task's details |
| D17 | No active tab on `/` and `/index`; three routes rendered the list | Task 1 | `/` and `/index` redirect to `/home` |
| D18 | Missing Hindi keys, no `fallbackLocale`, ~20 hard-coded English strings | Tasks 1, 6, 8 (and every screen task; Task 7 for Vuetify's own strings) | Every visible string comes from `src/i18n/locales/{en,hi}`; `fallbackLocale: 'en'` |
| D19 | Notification toggle bound to a getter, did nothing | Task 9 | Switching on asks for permission; switching off removes this device's token |
| D20 | A deploy reloaded open tabs | Task 9 | "New version available" snackbar with Reload; no forced reload |

### Push notifications and backend (§5)

| Item | Problem | Fixed by | How |
|---|---|---|---|
| P1 | Permission asked from a watcher; no `isSupported()` guard | Task 9 | Asked only from the toggle (a user gesture), only where supported; otherwise the toggle is disabled with an explanation |
| P2 | A new foreground handler per sign-in | Task 9 | One `onMessage` handler per app session |
| P3 | One `fcm/{uid}` token per user, kept after sign-out | Tasks 3, 9, 10 | One document per device at `users/{uid}/devices/{token}`; deleted on sign-out (and `deleteToken` is called) and when permission is turned off; deleted server-side when FCM reports it invalid; the migration copies old tokens |
| P4 | Background service worker on Firebase 3.9.0 | Task 9 | Same SDK major as the app, inside the one vite-plugin-pwa service worker |
| P5 | Reminder function broken in ten ways, on Node 8 | Task 10 | v2 `onSchedule('every 5 minutes')` on Node 22: queries `remindAt` in (now, now + 60 min] with `reminded == false`, sends over FCM HTTP v1 to each device, writes a notification with a server `Timestamp`, sets `reminded`; one failure doesn't stop the others |
| P6 | No UTC reminder instant | Tasks 2, 6, 10 | `remindAt` (UTC `Timestamp`) and `timeZone` (IANA) saved with each task; cleared for indefinite and done tasks; recomputed on edit, which resets `reminded` |

### Security (§6)

| Item | Problem | Fixed by | How |
|---|---|---|---|
| S1 | Public `testFunction` returned every user's tokens and task titles | Task 10 | Deleted (deploying the functions removes it; see below) |
| S2 | No Firestore rules in the repo | Task 3 | `firestore.rules`: owner-only access, `uid` immutable, clients can't create or update notifications, field types and sizes validated |
| S3 | Markdown rendered raw HTML | Tasks 2, 5 | markdown-it with `html: false`, DOMPurify, links get `rel="noopener noreferrer"` |
| S4 | Function trusted client-written data | Task 3 (with P3) | Ownership enforced by the rules; tokens live under the owner's own path |
| S5 | Production source maps deployed publicly | Task 1 | Built to `sourcemaps/`, kept out of `dist/` |
| S6 | `window.open` without `noopener` | Task 4 | `rel="noopener noreferrer"` |

### PWA and platform (§7)

| Item | Problem | Fixed by | How |
|---|---|---|---|
| W1 | `assetlinks.json` served `[]` | Task 9 | Real Play signing and upload key fingerprints, served as `application/json` |
| W2 | No offline navigation fallback; vendor chunk over the precache limit | Task 9 | App shell, including deep links, loads offline after one online visit; every precached file under 2 MB |
| W3 | Three theme colours, no `id`/`scope`/maskable icon | Task 1 | `#1976D2`, background `#FAFAFA`, `id` and `scope` `/`, `start_url` `/home`, maskable icon |
| W4 | Caching headers from PR #61 | Task 1 | `no-cache` on the service worker, `index.html` and routes; immutable on hashed assets |
| W5 | Icon-only buttons without labels | Task 4 (and every screen task) | Every icon-only button has an `aria-label` from the locale files |

### Repo hygiene (§8) and quality gates (§9)

| Item | Problem | Fixed by | How |
|---|---|---|---|
| H1 | Android build outputs in git | Task 11 | `packages/android/source/.gradle/`, `app/build/` and `app-release-signed.apk.idsig` removed from the index and ignored; the TWA source and `Readme.html` stay |
| H2 | `.gitignore` gaps | Task 11 | Covers `.env`, `.env.*.local`, `.firebase/`, `firebase-debug.log`, `dist/`, `coverage/`, `playwright-report/`, `test-results/`; the `.firebase/*.cache` files are untracked |
| H3 | README out of date (`npm run buid`, `VUE_APP_*`) | Task 11 | Node version, `.env.local` from `.env.example` with the `VITE_*` names (`VUE_APP_VAPID_KEY` is now `VITE_FIREBASE_VAPID_KEY`), emulator workflow, test commands, deploy steps |
| H4 | `.browserslistrc` targeted old browsers | Task 1 | `defaults and supports es6-module` |
| §9 | 128 `@ts-ignore`, `any` everywhere | Tasks 1–10 | `grep -rn ts-ignore src functions/src` prints nothing; no code in `src/` or `functions/src/` is typed `any`; the one third-party `any` (Vuetify's calendar slot scope) is narrowed with a commented cast in `CalendarView.vue` |

## Decisions made during the run that change behaviour

These were ruled during the run; each differs from, or adds to, what the plan or the old app did.

- **`remindAt` is the task's due instant**, not "due minus 60 minutes". The function's window
  (now, now + 60 min] then sends the reminder within the hour before the task. Example: 09:00 on
  2026-11-02 in Asia/Kolkata is stored as `2026-11-02T03:30:00Z`. (The plan's "minus 60 minutes"
  would have reminded about two hours early and missed tasks created less than an hour before
  they were due.)
- **Facebook sign-in is removed**: no button, provider or code. Accounts that only ever used
  Facebook can no longer sign in.
- **Emulator ports are auth 9199, firestore 8180, functions 5101** (`firebase.json`), not the
  defaults, because another local project uses the defaults.
- **A save never times out or retries.** A timeout could duplicate a write. The form stays open
  with its input and a saving state; after 15 seconds it says "Still saving. Check your
  connection." A rejected save shows "Couldn't save. Try again."
- **"Couldn't save" and "Couldn't load" are tested with deny-all emulator rules**, because
  Firestore queues writes and serves cached reads when the network drops. Network-level failures
  are covered only by the still-saving notice.
- **Each device's push token is deleted on sign-out** (its `users/{uid}/devices/{token}` document,
  and `deleteToken` on the browser), so the next person on that browser never gets the previous
  user's reminders.
- **After signing in, `/signin?redirect=<path>` goes to that path only if it is an in-app path**
  (`safeRedirect`); anything else goes to `/home`.
- A task whose devices partly succeed and partly fail with a retryable error is marked reminded
  (no duplicates). A task with no live devices writes no notification.
- Vuetify's own strings (date and time pickers, calendar) follow the app language, with Hindi
  messages in `src/i18n/locales/hi/vuetify.json`.
- New labels default to the colour `#8E00FF`; an empty display name saves and shows "NA", as
  before.

## What is left for you

1. **Run every gate. None has been run for any task.** Start the run with the emulator ports
   free (9199, 8180, 5101; the e2e Vite server uses 5179):

   ```bash
   npm run typecheck && npm run lint && npm run format:check
   npm run test && npm run test:rules && npm run e2e
   npm --prefix functions run build && npm --prefix functions run lint && npm --prefix functions run test
   npm run build
   ```

   Expect first-run failures. The task reports in `.ga/runs/2026-11-02-modernize-and-fix/` list
   the likely spots. Among them: SortableJS drags driven by Playwright in WebKit, Vuetify picker
   DOM details, Firestore Write-channel interception, and Vitest's `define` globals.
2. **Approve the first visual references.** The first e2e run captures each screen
   (`design/modernize/<screen>/`); none have been approved yet. Check them against
   `design/modernize/reference.html`, then the comparisons in each `compare.json` must pass.
3. **Have a native speaker review the Hindi Vuetify strings** in
   `src/i18n/locales/hi/vuetify.json` (and the Hindi "yesterday", `बीता कल`).
4. **Set `VITE_FIREBASE_VAPID_KEY`** in `.env.local` before building for production (Firebase
   console > Cloud Messaging > Web Push certificates). Without it, push notifications don't work.
5. **Deploy hosting, rules and functions** (see the README's Deployment section). Scheduled
   functions need the **Blaze** plan. When the functions deploy asks to delete `testFunction` and
   `testSchedule`, answer yes.
6. **Run the data migration once**, after the deploy, first as a dry run:

   ```bash
   npm --prefix functions run migrate -- --tz Asia/Kolkata --dry-run
   npm --prefix functions run migrate -- --tz Asia/Kolkata
   ```

7. **Check the GCP API key restrictions** for the browser key in `spanion-todo` (Google Cloud
   console > APIs & Services > Credentials): HTTP referrers limited to the app's domains, and only
   the APIs the app uses.
8. **Disable the Facebook provider** in the Firebase console (Authentication > Sign-in method).
9. Confirm in the Firebase console that the **Email/Password** and **Google** providers are on and
   that the app's domains are authorised.

Smaller follow-ups the tasks reported:

- ~~CI lacked `test:rules` and the functions' build, lint and tests.~~ Done: `ci.yml` now runs
  them (the `checks` and `functions` jobs), plus `npm audit --omit=dev`; see
  [SECURITY.md](SECURITY.md).
- `e2e/support/visual.ts` calls the visual-compare script by an absolute path on the developer's
  machine, so the visual step runs only there.
- `@firebase/rules-unit-testing` declares Node 24.12 or later, while the functions target Node 22.
- `.prettierignore` still lists the deleted `functions/index.js` and `functions/.eslintrc.json`.
- `npm audit` now reports 7 in the root (0 high, 3 moderate, 4 low; all in dev-only tooling,
  mostly under `firebase-tools`) and 0 in `functions/`, down from 47 (5 high). What was fixed and
  what is left: [SECURITY.md](SECURITY.md).
- The week and day calendar views open at 00:00 rather than scrolling to working hours.
- Profile's load-failure alert (D12) has no e2e test: aborted requests fall back to the cache
  instead of failing.
