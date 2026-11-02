# Modernise stack and fix all known defects — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:implement-with-subagents by default, or ga:implement. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Task Manager on Vue 3.5 / Vite 8 / Vuetify 4 / Firebase 13 modular with the same features, fixing every defect in the spec under automated tests.

**Architecture:** A fresh Vite app replaces the Vue CLI one in place, on branch `feat/modernize-stack` (base `master`). Firebase access lives in small typed service modules (`src/services/*`) behind Pinia stores (`src/stores/*`). Views only talk to stores. Locale strings are split per feature so that screen tasks never share a file. Cloud Functions move to TypeScript on Node 22 (v2 API). Every test runs against the Firebase Emulator Suite, never the live project.

**Tech Stack:** Node 24, Vite 8, Vue 3.5, TypeScript 6.0 + vue-tsc 3, Vuetify 4 + vite-plugin-vuetify 2, vue-router 5, Pinia 4, vue-i18n 11, Firebase JS SDK 13 (modular), vite-plugin-pwa 2 (Workbox 7, injectManifest), dayjs, markdown-it 15 + DOMPurify 3, vue-draggable-plus, Vitest 5 + @vue/test-utils 2, Playwright 1.64, @firebase/rules-unit-testing, firebase-tools 15, ESLint 10 + Prettier 3, GitHub Actions. Functions: firebase-functions 7, firebase-admin 14, Node 22.

**Spec:** `docs/specs/2026-11-02-modernize-and-fix.md` (approved 2026-11-02, decisions in §11)

## Global Constraints

- Target majors are exactly those in spec §2: "**Vue 3.5**", "**Vite 8**", "**Vuetify 4**", "**vue-router 5**", "**Pinia 4**", "**vue-i18n 11**", "**Firebase 13 modular**", "**vite-plugin-pwa 2**", "**TypeScript 6.0**", "**Node 22**", "**firebase-functions 7**", "**firebase-admin 14**".
- "No `@ts-ignore`, no `any` in `src/` except at third-party boundaries, commented."
- Every visible string comes from `src/i18n/locales/{en,hi}/<feature>.json`; each key exists in both files. `fallbackLocale: 'en'`.
- Tests never touch the live `spanion-todo` project: unit and e2e tests use the emulators (`firebase emulators:exec`), with project id `demo-todo`.
- Env vars are `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_VAPID_KEY`, `VITE_USE_EMULATORS`. They are listed in `.env.example` (safe empty defaults; `VITE_USE_EMULATORS=true` for dev) and set in the CI job from `.env.ci` (demo values).
- Facebook sign-in is removed (spec §11.1); the migration time zone is `Asia/Kolkata` (spec §11.3).
- Old data stays readable (spec §10): readers accept legacy tasks (`type: DocumentReference[]`, `date`/`time` = `'NA'`, missing `description`/`type`).
- The checks run as these scripts, which Task 1 adds; the policy's `checks.commands` should be updated to them: typecheck `npm run typecheck`, lint `npm run lint`, format-check `npm run format:check`, test `npm run test`, e2e `npm run e2e`.

## Checkpoints

- After **Task 3** (security: Firestore rules).
- After **Task 4**: the first `screen` task, and also security (auth). The developer approves the Vuetify 4 look; its screenshots become the visual references for later screens.
- After **Task 9** (security: device tokens and push).
- After **Task 10** (security: Cloud Functions and data migration).
- Before any deploy: the plan never deploys. The developer runs the migration and the deploy.

## Review Focus

1. **Flaky network during a save** (offline PWA, slow 3G). The user expects the form to stay open with their input and an error, never a silent loss. Cases: Tasks 5, 6, 8.
2. **Legacy documents** (`'NA'` dates, `type` refs to deleted labels, missing fields) must render without breaking the list. Cases: Tasks 2, 5.
3. **Time zones and DST** around reminders: a task at 09:00 local must notify around 08:00 local in any zone, including on a DST-change day. Cases: Tasks 2, 10.
4. **Two accounts on one device, one after another:** no data, labels, notifications or push tokens from the first account may reach the second. Cases: Tasks 2, 4, 9.
5. **Hindi at phone width (390 px):** long Hindi strings must not overflow buttons or the nav. Cases: Tasks 4, 5 (visual at 390 and 1280).

---

### Task 1: Foundation — toolchain, app shell, harness, CI

**Files:**
- Delete: `vue.config.js` (if present after PR #61), `babel.config.js`, `postcss.config.js`, `tslint.json`, `src/main.ts`, `src/App.vue`, `src/shims-tsx.d.ts`, `src/shims-vue.d.ts`, `src/registerServiceWorker.ts`, `src/vuetify/vuetify.ts`, `src/i18n/i18n.ts`, `src/i18n/en/lang.json`, `src/i18n/hi/lang.json`, `src/store/store.ts`, `src/router/router.ts`, `src/util/commonHelper.js`, `src/util/firebaseHelper.js`, `src/util/momentHelper.js`, `src/util/index.js`, `src/firebase/index.ts`, every file in `src/views/` and `src/components/`, `public/index.html`, `public/firebase-messaging-sw.js`, `public/manifest.json`, `.env.example`
- Create: `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `env.d.ts`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.nvmrc`, `.env.example`, `.env.ci`, `playwright.config.ts`, `.github/workflows/ci.yml`, `src/main.ts`, `src/App.vue`, `src/plugins/vuetify.ts`, `src/plugins/i18n.ts`, `src/router/index.ts`, `src/i18n/locales/en/common.json`, `src/i18n/locales/hi/common.json`, `src/components/layout/AppNav.vue`, `src/components/layout/AppSnackbar.vue`, `src/stores/ui.ts`, `src/sw.ts`, `src/types/models.ts`, stubs `src/router/guard.ts` (allows every route), `src/components/layout/AppMenu.vue` (empty menu), `src/pwa/index.ts` (no-op `setupPwa`), stub views `src/views/{SignInView,SignUpView,HomeView,TaskAddView,CalendarView,ProfileView,NotificationsView}.vue`, `e2e/support/emulator.ts`, `e2e/support/visual.ts`, `e2e/shell.spec.ts`, `src/plugins/i18n.test.ts`, `src/stores/ui.test.ts`
- Modify: `package.json`, `package-lock.json`, `firebase.json`, `.browserslistrc`, `.gitignore`, `functions/package.json`, `functions/package-lock.json`

**Interfaces:**
- Produces:

```ts
// src/router/index.ts — the route table, final for the whole plan
// /           redirect /home        /index  redirect /home
// /home       HomeView        meta { requireAuth: true, nav: 'home' }
// /calendar   CalendarView    meta { requireAuth: true, nav: 'calendar' }
// /add        TaskAddView     meta { requireAuth: true, nav: 'add' }
// /notification NotificationsView meta { requireAuth: true, nav: 'notification' }
// /profile    ProfileView     meta { requireAuth: true, nav: 'profile' }
// /signin     SignInView      /signup SignUpView
// /:pathMatch(.*)*  redirect /home
export const router: Router;

// src/stores/ui.ts
export type Locale = 'en' | 'hi';
export type Theme = 'light' | 'dark';
export interface Snack { text: string; actionLabel?: string; action?: () => void; timeoutMs: number }
export interface UiStore {
  locale: Locale; theme: Theme; snack: Snack | null;
  setLocale(l: Locale): void;           // persists to localStorage 'lang'
  setTheme(t: Theme): void;             // persists to localStorage 'dark' ('true'|'false', legacy-compatible)
  showSnack(text: string, opts?: { actionLabel?: string; action?: () => void; timeoutMs?: number }): void;
  dismissSnack(): void;
  $reset(): void;
}
export declare function useUiStore(): UiStore;

// src/types/models.ts
export type TaskStatus = 'todo' | 'done';
export interface Label { id: string; uid: string; label: string; color: string }
export interface Task {
  id: string; uid: string; title: string; description: string; status: TaskStatus;
  indefinite: boolean; date: string | null; time: string | null; // 'YYYY-MM-DD' / 'HH:mm', device-local
  timeZone: string; remindAt: Date | null; reminded: boolean; labelIds: string[];
}
export type TaskInput = Pick<Task, 'title' | 'description' | 'indefinite' | 'date' | 'time' | 'labelIds'>;
export interface AppNotification { id: string; uid: string; title: string; body: string; taskId: string | null; createdAt: Date }
export interface SessionUser { uid: string; email: string | null; displayName: string | null; photoURL: string | null }

// src/router/guard.ts — stub here; Task 4 implements it. router/index.ts installs it with beforeEach.
export function authGuard(to: RouteLocationNormalized): Promise<true | RouteLocationRaw>;
// src/pwa/index.ts — stub here; Task 9 implements it. App.vue calls it once on mount.
export function setupPwa(): void;

// src/plugins/i18n.ts — merges every src/i18n/locales/<lang>/*.json via import.meta.glob
export const i18n: I18n; // legacy: false, locale from localStorage 'lang' or 'en', fallbackLocale 'en'
```

| npm script | Command |
|---|---|
| `dev` | `vite` |
| `build` | `vue-tsc -b && vite build` |
| `typecheck` | `vue-tsc -b --noEmit` |
| `lint` | `eslint .` |
| `format:check` | `prettier --check .` |
| `test` | `firebase emulators:exec --project demo-todo --only auth,firestore "vitest run"` |
| `test:rules` | `firebase emulators:exec --project demo-todo --only firestore "vitest run tests/rules"` |
| `e2e` | `firebase emulators:exec --project demo-todo --only auth,firestore "playwright test"` |

`firebase.json`: `hosting.public` = `dist`; `ignore` = `["firebase.json", "**/node_modules/**"]` (so `.well-known` deploys); rewrites `**` → `/index.html`; headers: `no-cache` on `/sw.js`, `/index.html`, `/` and SPA routes, `public, max-age=31536000, immutable` on `/assets/**`, and `Content-Type: application/json` on `/.well-known/assetlinks.json`. `firestore.rules` = `firestore.rules`, `firestore.indexes` = `firestore.indexes.json`. Functions: `source: functions`, `runtime: nodejs22`, predeploy `npm --prefix "$RESOURCE_DIR" run build`. Emulators: auth 9099, firestore 8080, functions 5001, ui disabled, `singleProjectMode: true`.

`vite.config.ts`: Vue, Vuetify (auto-import) and VitePWA plugins. VitePWA uses `strategies: 'injectManifest'`, `srcDir: 'src'`, `filename: 'sw.ts'`, `registerType: 'prompt'`. Manifest per spec W3. `build.sourcemap: 'hidden'`, and the `.map` files are removed from `dist` after the build (S5). Vendor code is split into chunks: `firebase`, `vuetify`, `vue` and the rest, each under 2 MB.

The visual harness (`e2e/support/visual.ts`) sets the clock to `2026-11-02T09:00:00` local and disables animations. It writes each screen's pairs to `design/modernize/<screen>/compare.json` (one file per screen, so screen tasks don't share it) and runs `node "/Users/ankitkumarpandit/Documents/work/geekyants/claude-plugin/geekyants-claude-plugin/plugins/ga/skills/verify-work/scripts/visual-compare.mjs" design/modernize/<screen>/compare.json` at widths 390 and 1280. `functions/package.json` (all function deps land here, so Task 10 doesn't touch the lockfile): engines node 22; deps `firebase-functions@^7`, `firebase-admin@^14`; dev deps `typescript@~6.0`, `vitest@^5`, `eslint@^10`, `tsx`; scripts `build` (`tsc`), `lint` (`eslint .`), `test` (`firebase emulators:exec --project demo-todo --only firestore "vitest run"`), `migrate` (`tsx scripts/migrate-legacy.ts`).

`e2e/support/emulator.ts` exports `resetEmulators()`, `createUser(email, password, displayName?)`, `signInAs(page, email, password)` and `seedDoc(path, data)`, all against project `demo-todo`.

**Spec:**
- §2: "Removed: `vue-class-component`, `vue-property-decorator`, `vue2-waterfall` (unused), `register-service-worker`, `babel-runtime`, `core-js`, `moment`, `vue-markdown`, `vuedraggable`, `tslint.json`."
- §3.9: "English and Hindi; light and dark theme; both remembered per device."
- D17: "`/` and `/index` redirect to `/home`."
- D18: "there is no `fallbackLocale`"
- W3: "Use one theme colour (`#1976D2`), background `#FAFAFA`"
- W4: "Keep PR #61's caching: `no-cache` on the service worker, `index.html` and SPA routes; long-lived immutable caching on hashed assets."
- S5: "Don't publish them: build them for error tracking, but leave them out of `dist`."
- H4: "`.browserslistrc` targets supported browsers only (`defaults and supports es6-module`)."
- §9: "`npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test` (Vitest) and `npm run e2e` (Playwright against emulators) pass locally and in CI."

**Tags:** harness, security

**Knowledge:** none — the project has no knowledge base (`knowledge/` is absent).

**Acceptance:**
- Given `localStorage.lang = 'hi'`, when the app loads, then the i18n locale is `hi`. Given the key `common.close` exists only in `en`, then `hi` renders the English text, not the key.
- Given `setTheme('dark')`, then `localStorage.dark` is `'true'` and the Vuetify theme is dark. Given `localStorage.dark = 'false'` from the old app, then the theme loads as light.
- Given `showSnack('Saved')` with no timeout, then `snack.timeoutMs` is 5000. After `dismissSnack()`, `snack` is `null`.
- Given a signed-out visit to `/` (e2e, guard not yet built), then the URL becomes `/home`. Given `/index` or `/nope`, then also `/home`.
- Given the bottom nav on `/home`, then the Home tab is active (D17).
- Given `npm run build`, then `dist/` holds no `.map` files, every precached file is under 2 MB, and `dist/manifest.webmanifest` has `theme_color` `#1976D2`, `background_color` `#FAFAFA`, `id` `/`, `scope` `/`, `start_url` `/home` and an icon with `purpose` `maskable`.
- Given `npm run typecheck`, `npm run lint` and `npm run format:check` on the new tree, then each exits 0.
- Given a PR to `master`, then `.github/workflows/ci.yml` runs typecheck, lint, format:check, test and e2e on Node 24 with Java 21 (for the emulators) and the env from `.env.ci`.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `src/plugins/i18n.test.ts`, `src/stores/ui.test.ts` and `e2e/shell.spec.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm run test -- src/plugins src/stores/ui.test.ts`
Expected: FAIL on the assertions (create `i18n` and `useUiStore` with their real signatures first, so failures are behavioural)

- [ ] **Step 3: Write the minimal implementation**: remove the legacy files, then add the toolchain, config, shell, stores and stub views to the Interfaces

- [ ] **Step 4: Run them to verify they pass**

Run: `npm run test -- src/plugins src/stores/ui.test.ts && npm run e2e -- e2e/shell.spec.ts && npm run build && npm run typecheck && npm run lint && npm run format:check`
Expected: PASS, and every command exits 0

- [ ] **Step 5: Commit**

```bash
git rm vue.config.js babel.config.js postcss.config.js tslint.json src/main.ts src/App.vue src/shims-tsx.d.ts src/shims-vue.d.ts src/registerServiceWorker.ts src/vuetify/vuetify.ts src/i18n/i18n.ts src/i18n/en/lang.json src/i18n/hi/lang.json src/store/store.ts src/router/router.ts src/util/commonHelper.js src/util/firebaseHelper.js src/util/momentHelper.js src/util/index.js src/firebase/index.ts public/index.html public/firebase-messaging-sw.js public/manifest.json
git rm src/views/TaskList.vue src/views/Calendar.vue src/views/Signup.vue src/views/Profile.vue src/views/TaskAdd.vue src/views/Notification.vue src/views/NotFound.vue src/views/Signin.vue
git rm src/components/TaskCard.vue src/components/TaskCardGrid.vue src/components/ContainerMenu.vue src/components/BarDate.vue src/components/ContainerApp.vue src/components/BarTop.vue src/components/ContainerMain.vue src/components/BarNav.vue
git add index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json env.d.ts eslint.config.js .prettierrc.json .prettierignore .nvmrc .env.example .env.ci playwright.config.ts .github/workflows/ci.yml
git add src/types/models.ts src/router/guard.ts src/components/layout/AppMenu.vue src/pwa/index.ts functions/package.json functions/package-lock.json
git add src/main.ts src/App.vue src/plugins/vuetify.ts src/plugins/i18n.ts src/plugins/i18n.test.ts src/router/index.ts src/i18n/locales/en/common.json src/i18n/locales/hi/common.json src/components/layout/AppNav.vue src/components/layout/AppSnackbar.vue src/stores/ui.ts src/stores/ui.test.ts src/sw.ts
git add src/views/SignInView.vue src/views/SignUpView.vue src/views/HomeView.vue src/views/TaskAddView.vue src/views/CalendarView.vue src/views/ProfileView.vue src/views/NotificationsView.vue
git add e2e/support/emulator.ts e2e/support/visual.ts e2e/shell.spec.ts package.json package-lock.json firebase.json .browserslistrc .gitignore
git commit -m "build: move to Vite 8, Vue 3.5, Vuetify 4 with test harness and CI"
```

---

### Task 2: Data layer — models, Firebase services, dates, markdown, stores

**Files:**
- Create: `src/lib/firebase.ts`, `src/lib/dates.ts`, `src/lib/markdown.ts`, `src/services/auth.ts`, `src/services/tasks.ts`, `src/services/labels.ts`, `src/services/notifications.ts`, `src/services/legacy.ts`, `src/stores/session.ts`, `src/stores/tasks.ts`, `src/stores/labels.ts`, `src/stores/notifications.ts`
- Test: `src/lib/dates.test.ts`, `src/lib/markdown.test.ts`, `src/services/legacy.test.ts`, `src/services/tasks.test.ts`, `src/stores/session.test.ts`, `src/stores/tasks.test.ts`

**Interfaces:**
- Consumes: `useUiStore().$reset()` and the model types in `src/types/models.ts` (Task 1)
- Produces:

```ts
// src/lib/firebase.ts — initialises once; connects to emulators when VITE_USE_EMULATORS === 'true'
export const firebaseApp: FirebaseApp; export const auth: Auth; export const db: Firestore;

// src/lib/dates.ts
export function parseLocalDate(ymd: string): Dayjs;               // local midnight, never UTC
export function todayYmd(now?: Date): string;
export function relativeDayLabel(ymd: string, locale: 'en' | 'hi', now?: Date): string; // today/tomorrow/yesterday else weekday + date
export function formatTime12(hhmm: string, locale: 'en' | 'hi'): string;
export function formatLongDate(ymd: string, locale: 'en' | 'hi'): string;
export function computeRemindAt(t: Pick<Task, 'date' | 'time' | 'indefinite' | 'status' | 'timeZone'>): Date | null; // local date+time in t.timeZone minus 60 min, as UTC instant
export function deviceTimeZone(): string;                          // IANA, e.g. 'Asia/Kolkata'
export function onDayChange(cb: () => void): () => void;           // fires at local midnight and on visibilitychange if the day changed

// src/lib/markdown.ts
export function renderMarkdown(src: string): string; // markdown-it html:false, DOMPurify-sanitised, links rel="noopener noreferrer" target="_blank"

// src/services/legacy.ts
export function taskFromDoc(id: string, data: DocumentData): Task;           // accepts legacy shapes
export function notificationFromDoc(id: string, data: DocumentData): AppNotification; // legacy string timestamps parsed best-effort, else epoch 0

// src/services/auth.ts
export function waitForAuthReady(): Promise<User | null>;
export function onUserChanged(cb: (u: User | null) => void): Unsubscribe;
export function signInEmail(email: string, password: string): Promise<User>;
export function signUpEmail(email: string, password: string): Promise<User>;
export function signInWithGoogle(): Promise<User | null>; // popup; redirect fallback returns null
export function consumeRedirectResult(): Promise<User | null>;
export function signOutUser(): Promise<void>;
export function updateDisplayName(name: string): Promise<void>;

// src/services/tasks.ts — collection 'tasks'
export function listTasks(uid: string): Promise<Task[]>;
export function createTask(uid: string, input: TaskInput): Promise<Task>;   // sets status 'todo', timeZone, remindAt, reminded false
export function updateTask(task: Task, patch: Partial<TaskInput> & { status?: TaskStatus }): Promise<Task>; // writes only editable fields + derived reminder fields; deletes legacy 'type'
export function deleteTask(id: string): Promise<void>;
// src/services/labels.ts — collection 'types'
export function listLabels(uid: string): Promise<Label[]>;
export function createLabel(uid: string, name: string, color: string): Promise<Label>; // rejects trimmed name outside 1..30 with Error('label/invalid-name')
// src/services/notifications.ts — collection 'notifications'
export function listNotifications(uid: string): Promise<AppNotification[]>; // newest first
export function deleteNotification(id: string): Promise<void>;

// src/stores/session.ts
export interface SessionStore {
  user: SessionUser | null; ready: boolean;
  start(): void;                                  // subscribes once to onUserChanged
  signOut(): Promise<void>;                       // runs sign-out hooks, signOutUser(), then $reset() on tasks, labels, notifications, ui snack
  onSignOut(hook: () => Promise<void> | void): void; // used by Task 9 to delete the device token
}
export declare function useSessionStore(): SessionStore;
// src/stores/tasks.ts
export interface TasksStore {
  tasks: Task[]; loading: boolean; error: string | null;
  load(): Promise<void>;                          // on failure keeps tasks, sets error 'load-failed'
  add(input: TaskInput): Promise<Task>;
  update(task: Task, patch: Partial<TaskInput> & { status?: TaskStatus }): Promise<Task>; // store changes only after success
  remove(id: string): Promise<void>;
  byStatus: { todo: Task[]; done: Task[] };       // each sorted by date, then time, indefinite last
  filter(q: { text: string; labelIds: string[]; date: string | null }): { todo: Task[]; done: Task[] };
  $reset(): void;
}
export declare function useTasksStore(): TasksStore;
// src/stores/labels.ts
export interface LabelsStore { labels: Label[]; byId: Record<string, Label>; loading: boolean; error: string | null; load(): Promise<void>; add(name: string, color: string): Promise<Label>; $reset(): void }
export declare function useLabelsStore(): LabelsStore;
// src/stores/notifications.ts
export interface NotificationsStore { items: AppNotification[]; loading: boolean; error: string | null; load(): Promise<void>; remove(id: string): Promise<void>; $reset(): void }
export declare function useNotificationsStore(): NotificationsStore;
```

**Spec:**
- D1: "Dates must be parsed and shown in the device's local time zone."
- D3: "when the date changes and when the app becomes visible."
- D5: "Store a Firestore `Timestamp`, sort newest first, and show it in the user's time zone."
- D6: "Load labels once and join by id. A missing label is dropped from the chip list without changing stored data."
- D7: "Write only editable fields, keep the form open until the save succeeds, and show the error on failure."
- D8: "Treat missing text as empty and compare ids exactly."
- D12: "A failed load must leave the existing data"
- D13: "Sign-out clears all per-user state."
- D15: "Require 1–30 characters after trimming."
- P6: "`remindAt` is a UTC `Timestamp`, computed on save from the task's local date and time plus the device's IANA time zone (stored as `timeZone`). It is cleared for indefinite and done tasks and recomputed on edit; editing date or time resets `reminded`."
- S3: "Render with markdown-it `html: false`, sanitise the output with DOMPurify"
- §10: "Data written by the old app stays readable."

**Tags:** failure-paths, security

**Knowledge:** none — the project has no knowledge base.

**Acceptance:**
- With TZ `America/New_York` (Vitest env `TZ`), `parseLocalDate('2026-11-02')` is Nov 2, and `relativeDayLabel('2026-11-02', 'en', <2026-11-02 09:00 local>)` is `today`. With TZ `Pacific/Kiritimati` (UTC+14) it is also `today`.
- `relativeDayLabel` for tomorrow in `hi` is `कल`; for 2026-11-05 in `en` it is `Thursday, 5 Nov`. No output is cut mid-word (D2 input).
- `computeRemindAt` for `2026-11-02` `09:00` in `Asia/Kolkata` is `2026-11-02T02:30:00Z`. In `America/New_York`, `2026-03-08` `09:00` (DST start) is `2026-03-08T12:00:00Z`. Indefinite, done, or missing date or time gives `null`.
- `onDayChange` fires once when fake timers cross local midnight, and once on `visibilitychange` after the day changed, but not when the day is unchanged.
- `renderMarkdown('<img src=x onerror=alert(1)>**b**')` contains no `<img` and no `onerror`, and contains `<strong>b</strong>`. `renderMarkdown('[x](javascript:alert(1))')` has no `javascript:` href. Links get `rel="noopener noreferrer"`.
- `taskFromDoc` maps `{date:'NA', time:'NA', type:[ref('types/a')]}` to `date null, time null, labelIds ['a']`. A doc with no `type` and no `description` gives `labelIds []` and `description ''`.
- `notificationFromDoc` with `timestamp: '11/2/2026, 3:30:00 PM'` and no `createdAt` gives a valid `Date`; with garbage it gives epoch 0, without throwing.
- Against the emulator: `updateTask(task, {title:'x'})` leaves no `id` or `type` field in the stored doc and recomputes `remindAt`. Changing `time` sets `reminded` to `false`.
- `useTasksStore.filter` with text `foo` matches a task whose description is missing only if its title contains `foo`. With `labelIds ['ab']`, a task labelled `['a','b']` does not match.
- When `listTasks` rejects, `load()` keeps the existing `tasks`, sets `error` to `load-failed` and `loading` to `false`.
- When `update()` rejects, the store's task is unchanged and the rejection reaches the caller.
- `byStatus.todo` orders `2026-11-03 08:00`, `2026-11-03 10:00`, `2026-11-04 07:00`, then indefinite.
- After `session.signOut()`, the tasks, labels and notifications stores are empty, the ui store has no snack, and every `onSignOut` hook ran before `signOutUser`.
- `createLabel(uid, '   ', '#fff')` rejects with `label/invalid-name`, as does a 31-character name.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in the six test files listed

- [ ] **Step 2: Run them to verify they fail**

Run: `npm run test -- src/lib src/services src/stores/session.test.ts src/stores/tasks.test.ts`
Expected: FAIL on the assertions (create each module with its real exported signatures first)

- [ ] **Step 3: Write the minimal implementation** to the Interfaces

- [ ] **Step 4: Run them to verify they pass**

Run: `npm run test -- src/lib src/services src/stores/session.test.ts src/stores/tasks.test.ts && npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/firebase.ts src/lib/dates.ts src/lib/dates.test.ts src/lib/markdown.ts src/lib/markdown.test.ts
git add src/services/auth.ts src/services/tasks.ts src/services/tasks.test.ts src/services/labels.ts src/services/notifications.ts src/services/legacy.ts src/services/legacy.test.ts
git add src/stores/session.ts src/stores/session.test.ts src/stores/tasks.ts src/stores/tasks.test.ts src/stores/labels.ts src/stores/notifications.ts
git commit -m "feat(data): typed Firebase 13 services, local-time dates, sanitised markdown, Pinia stores"
```

---

### Task 3: Firestore security rules

**Files:**
- Create: `firestore.rules`, `firestore.indexes.json`
- Test: `tests/rules/firestore.rules.test.ts`

**Interfaces:**
- Consumes: document shapes `Task`, `Label`, `AppNotification` from `src/types/models.ts` and the `firebase.json` rules path (Task 1)
- Produces: rules for `tasks/{id}`, `types/{id}`, `notifications/{id}`, `users/{uid}/devices/{token}`. A device document is `{ uid: string; token: string; userAgent: string; updatedAt: Timestamp }`. Composite index: `tasks` on `reminded ASC, remindAt ASC` (for Task 10).

**Spec:**
- S2: "A user may read and write only documents whose `uid` equals their auth uid (`tasks`, `types`, `notifications`), and only their own `users/{uid}/devices/*`. Clients may not create or update `notifications` (functions write them) but may delete their own. `uid` cannot change on update. Field types and sizes are validated: title 1–200 characters, description up to 5,000, label name 1–30."
- S4: "Covered by S2 (ownership) plus P3 (tokens live under the owner's own path)."

**Tags:** security

**Knowledge:** none — the project has no knowledge base.

**Acceptance:**
- Signed out, then every read and write on all four paths is denied.
- Alice can create, read, update and delete `tasks/t1` with `uid: alice`. Bob cannot read `tasks/t1`, and cannot list `tasks` where `uid == 'alice'`.
- Alice cannot create a task with `uid: bob`, and cannot update `tasks/t1` to `uid: bob`.
- A task title of 0 or 201 characters is denied; 200 is allowed. A description of 5,001 characters is denied. `status` other than `todo`/`done` is denied.
- A label name of 31 characters is denied; 30 is allowed.
- Alice cannot create or update `notifications/n1`, but can read and delete her own; Bob cannot delete hers.
- Alice can write `users/alice/devices/tok` with `uid: alice`; she cannot write `users/bob/devices/tok`.
- A legacy task (`date: 'NA'`, `type: [ref]`) owned by Alice is readable by Alice, and deletable.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `tests/rules/firestore.rules.test.ts` with `@firebase/rules-unit-testing`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm run test:rules`
Expected: FAIL (an `allow read, write: if false` placeholder denies the allowed cases)

- [ ] **Step 3: Write the rules and index** to the Interfaces

- [ ] **Step 4: Run them to verify they pass**

Run: `npm run test:rules`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add firestore.rules firestore.indexes.json tests/rules/firestore.rules.test.ts
git commit -m "feat(security): owner-only Firestore rules with field validation"
```

---

### Task 4: Sign-in, sign-up, route guard and app menu

**Files:**
- Modify: `src/views/SignInView.vue`, `src/views/SignUpView.vue`, `src/router/guard.ts`, `src/components/layout/AppMenu.vue`
- Create: `src/i18n/locales/en/auth.json`, `src/i18n/locales/hi/auth.json`, `design/modernize/auth/compare.json`, `design/modernize/auth/compare/` (the reference images the harness writes)
- Test: `src/router/guard.test.ts`, `e2e/auth.spec.ts`

**Interfaces:**
- Consumes: `useSessionStore` and `signInEmail`, `signUpEmail`, `signInWithGoogle`, `consumeRedirectResult` (Task 2); `useUiStore`, the `authGuard` stub and the `AppMenu.vue` stub, the harness (Task 1)
- Produces:

```ts
// src/router/guard.ts — implements the Task 1 signature
export function authGuard(to: RouteLocationNormalized): Promise<true | RouteLocationRaw>;
// requireAuth and signed out: { path: '/signin', query: { redirect: to.fullPath } }
// public route and signed in: '/home'
```

**Spec:**
- §3.1: "Signed-out users are redirected to `/signin?redirect=<path>` and land back on that path after signing in."
- §11.1: "Facebook sign-in is removed: no Facebook button, provider or code."
- D13: "Sign-out clears all per-user state."
- D14: "Accept any address Firebase accepts. Require at least 8 characters with a letter and a digit."
- S6: "`window.open` without `noopener` in the menu"
- W5: "Every icon-only button has an `aria-label` from the locale files."

**Tags:** screen, security, failure-paths

**Knowledge:** none — the project has no knowledge base.

**Acceptance:**
- Neither sign-in nor sign-up shows a Facebook option, and `grep -ri facebook src` prints nothing.
- `authGuard` signed out to `/calendar` gives `/signin?redirect=%2Fcalendar`. Signed in to `/signin` gives `/home`. Signed in to `/profile` gives `true`.
- e2e: sign up `new@user.info` with password `abc-def_9` and land on `/home` (D14 inputs). Password `abcdefgh` shows "Use at least 8 characters with a letter and a number."
- e2e: sign up an existing email and see the Firebase message "The email address is already in use by another account." The form keeps the typed email.
- e2e: from `/calendar` signed out, sign in and land on `/calendar`.
- e2e: wrong password shows the Firebase error, the button stops loading, and the password field is still focusable.
- e2e: with the auth emulator unreachable (stop it, or route-abort `**/identitytoolkit**`), submit shows "Couldn't reach the server. Check your connection and try again."
- e2e: user A signs out from the menu and lands on `/signin`; user B signs in on the same page and sees none of A's tasks (Review Focus 4).
- e2e: the language toggle switches to `hi` and persists across reload. The theme toggle persists. The menu's author link has `rel="noopener noreferrer"`.
- Visual: the states `signin`, `signin-email-open`, `signin-error` and `signup`, each in `en` and `hi`, at 390 and 1280 match the references the developer approves at this task's checkpoint. Hindi buttons don't overflow at 390.
- Every icon-only button on these screens has an `aria-label` (axe check in e2e).

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `src/router/guard.test.ts` and `e2e/auth.spec.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm run test -- src/router/guard.test.ts && npm run e2e -- e2e/auth.spec.ts`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation**: guard, views, menu and locale keys

- [ ] **Step 4: Run them to verify they pass**

Run: `npm run test -- src/router/guard.test.ts && npm run e2e -- e2e/auth.spec.ts && node "/Users/ankitkumarpandit/Documents/work/geekyants/claude-plugin/geekyants-claude-plugin/plugins/ga/skills/verify-work/scripts/visual-compare.mjs" design/modernize/auth/compare.json`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/views/SignInView.vue src/views/SignUpView.vue src/router/guard.ts src/router/guard.test.ts src/components/layout/AppMenu.vue
git add src/i18n/locales/en/auth.json src/i18n/locales/hi/auth.json e2e/auth.spec.ts design/modernize/auth/compare.json design/modernize/auth/compare
git commit -m "feat(auth): sign-in, sign-up, guard and menu on Vue 3"
```

---

### Task 5: Home — task board, task card, date bar, search and label filter

**Files:**
- Modify: `src/views/HomeView.vue`
- Create: `src/components/tasks/TaskBoard.vue`, `src/components/tasks/TaskColumn.vue`, `src/components/tasks/TaskCard.vue`, `src/components/tasks/TaskEditForm.vue`, `src/components/tasks/LabelChips.vue`, `src/components/DateBar.vue`, `src/components/MarkdownView.vue`, `src/i18n/locales/en/tasks.json`, `src/i18n/locales/hi/tasks.json`, `e2e/fixtures/home.ts`, `design/modernize/home/compare.json`, `design/modernize/home/compare/`
- Test: `src/components/tasks/TaskCard.test.ts`, `src/components/tasks/TaskBoard.test.ts`, `e2e/home.spec.ts`

**Interfaces:**
- Consumes: `useTasksStore`, `useLabelsStore`, `relativeDayLabel`, `todayYmd`, `onDayChange`, `formatTime12`, `renderMarkdown` (Task 2); `useUiStore`, the harness (Task 1)
- Produces:

```ts
// TaskCard.vue props/emits
defineProps<{ task: Task; labels: Label[] }>();
defineEmits<{ toggle: [task: Task]; save: [task: Task, patch: Partial<TaskInput>]; remove: [task: Task] }>();
// TaskEditForm.vue
defineProps<{ task: Task; labels: Label[]; saving: boolean; error: string | null }>();
defineEmits<{ submit: [patch: Partial<TaskInput>]; cancel: [] }>();
```

**Spec:**
- §3.3: "Task list grouped into Todo and Done. Drag a task between the two lists to change its status, or use the check button. Edit and delete in place."
- §3.4: "Search by text (title and description), filter by labels (match any), and pick a date in the date bar (indefinite tasks always show)."
- D2: "Use explicit relative-day formats"
- D3: "when the date changes and when the app becomes visible."
- D6: "A missing label is dropped from the chip list without changing stored data."
- D7: "Write only editable fields, keep the form open until the save succeeds, and show the error on failure."
- D9: "Empty columns must accept drops; ordering within a list is by date then time (no manual reorder)."
- D10: "Show either skeletons or cards, never both."
- D11: "They must always be reachable by touch and keyboard."
- D12: "Couldn't load your data. Try again."
- S3: "sanitise the output with DOMPurify"

**Tags:** screen, failure-paths

**Knowledge:** none — the project has no knowledge base.

**Acceptance:**
- TaskCard: check, edit and delete are visible and keyboard-focusable without hover. Each has an `aria-label`.
- TaskCard: a `labelIds` entry with no matching label renders no chip and emits nothing (D6).
- TaskEditForm: while `saving`, the inputs keep their values. With `error` set, the form stays open and shows the error text.
- TaskBoard: while loading with no tasks, it shows 4 skeletons and no cards. With tasks, it shows cards and no skeletons.
- e2e (seeded): drag a task into an empty Done column; it moves, and after reload it is still done.
- e2e: drag within Todo; the order stays date-then-time.
- e2e: edit a title while Firestore writes are route-aborted. The form stays open with "Couldn't save. Try again." and the typed title; nothing changes after reload.
- e2e: with the tasks query failing, the page shows "Couldn't load your data. Try again." with Retry; Retry loads the tasks.
- e2e: search `milk` finds a task whose title contains Milk, and doesn't fail on a seeded legacy task with no description.
- e2e: filtering by label `a` doesn't match a task with label `ab`.
- e2e: a seeded legacy task (`date: 'NA'`, a `type` ref to a deleted label) shows in Todo as indefinite with no blank chip (Review Focus 2).
- e2e: the clock at 23:59:50 local advances past midnight; the header changes from "today" to the next day without a reload (D3).
- e2e: a description containing `<img src=x onerror=...>` renders no image and runs no script.
- Visual: `home-empty`, `home-loading`, `home-tasks`, `home-editing`, `home-load-error` and `home-hi` at 390 and 1280 match the references.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `src/components/tasks/TaskCard.test.ts`, `src/components/tasks/TaskBoard.test.ts` and `e2e/home.spec.ts` (seed data in `e2e/fixtures/home.ts`)

- [ ] **Step 2: Run them to verify they fail**

Run: `npm run test -- src/components/tasks && npm run e2e -- e2e/home.spec.ts`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation** of the components, the view and the locale keys

- [ ] **Step 4: Run them to verify they pass**

Run: `npm run test -- src/components/tasks && npm run e2e -- e2e/home.spec.ts && node "/Users/ankitkumarpandit/Documents/work/geekyants/claude-plugin/geekyants-claude-plugin/plugins/ga/skills/verify-work/scripts/visual-compare.mjs" design/modernize/home/compare.json`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/views/HomeView.vue src/components/tasks/TaskBoard.vue src/components/tasks/TaskBoard.test.ts src/components/tasks/TaskColumn.vue src/components/tasks/TaskCard.vue src/components/tasks/TaskCard.test.ts src/components/tasks/TaskEditForm.vue src/components/tasks/LabelChips.vue
git add src/components/DateBar.vue src/components/MarkdownView.vue src/i18n/locales/en/tasks.json src/i18n/locales/hi/tasks.json e2e/home.spec.ts e2e/fixtures/home.ts design/modernize/home/compare.json design/modernize/home/compare
git commit -m "feat(home): task board with drag between lists, accessible actions, safe markdown"
```

---

### Task 6: Add task screen

**Files:**
- Modify: `src/views/TaskAddView.vue`
- Create: `src/i18n/locales/en/add.json`, `src/i18n/locales/hi/add.json`, `design/modernize/add/compare.json`, `design/modernize/add/compare/`
- Test: `e2e/add.spec.ts`

**Interfaces:**
- Consumes: `useTasksStore().add`, `useLabelsStore`, `todayYmd`, `formatLongDate` (Task 2); the `TaskInput` type (Task 2); the harness (Task 1)

**Spec:**
- §3.2: "Create a task with a title, a Markdown description, a date and time"
- D1: "Dates must be parsed and shown in the device's local time zone."
- D18: "Every visible string comes from the locale files, with keys present in both `en` and `hi`."

**Tags:** screen, failure-paths

**Knowledge:** none — the project has no knowledge base.

**Acceptance:**
- e2e with TZ `America/New_York`: the default date field shows today's local weekday and date, not yesterday's.
- e2e: create a task "Buy milk" for tomorrow at 09:00 with label `a`. It lands on `/home` with the snackbar "Task added". The stored doc has `timeZone` `America/New_York` and `remindAt` 08:00 local as UTC.
- e2e: an indefinite task stores `date null`, `time null` and `remindAt null`.
- e2e: an empty title blocks submit with "Title is required"; a 201-character title shows "Keep the title under 200 characters".
- e2e: with the Firestore write aborted, the form stays filled and shows "Couldn't save. Try again."
- e2e: every label (Select date, Select time, Indefinite task?) appears in Hindi when `hi` is on.
- Visual: `add-empty`, `add-filled`, `add-error` and `add-hi` at 390 and 1280.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `e2e/add.spec.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm run e2e -- e2e/add.spec.ts`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation** of the view and its locale keys

- [ ] **Step 4: Run them to verify they pass**

Run: `npm run e2e -- e2e/add.spec.ts && node "/Users/ankitkumarpandit/Documents/work/geekyants/claude-plugin/geekyants-claude-plugin/plugins/ga/skills/verify-work/scripts/visual-compare.mjs" design/modernize/add/compare.json`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/views/TaskAddView.vue src/i18n/locales/en/add.json src/i18n/locales/hi/add.json e2e/add.spec.ts design/modernize/add/compare.json design/modernize/add/compare
git commit -m "feat(add): add-task screen with local dates and reminder fields"
```

---

### Task 7: Calendar screen

**Files:**
- Modify: `src/views/CalendarView.vue`
- Create: `src/components/calendar/TaskDetailsDialog.vue`, `src/i18n/locales/en/calendar.json`, `src/i18n/locales/hi/calendar.json`, `design/modernize/calendar/compare.json`, `design/modernize/calendar/compare/`
- Test: `e2e/calendar.spec.ts`

**Interfaces:**
- Consumes: `useTasksStore`, `useLabelsStore`, `parseLocalDate`, `formatLongDate`, `onDayChange` (Task 2); `MarkdownView.vue` (Task 5); the harness (Task 1)
- Produces: `TaskDetailsDialog.vue` with `defineProps<{ task: Task | null }>()` and `defineEmits<{ close: [] }>()`

**Spec:**
- §3.5: "Calendar with day, week and month views showing dated tasks."
- D4: "Use locale-aware formatting."
- D16: "Clicking an event opens that task's details."

**Tags:** screen, failure-paths

**Knowledge:** none — the project has no knowledge base.

**Acceptance:**
- e2e: month view of Nov 2026 shows seeded dated tasks on their local dates in `America/New_York` and in `Asia/Kolkata`. Indefinite tasks are not shown.
- e2e: switching to day and week keeps the selected date; Today returns to the current date.
- e2e: clicking an event opens the details dialog with the title and rendered description; Escape closes it.
- e2e: with the tasks query failing, the calendar shows "Couldn't load your data. Try again." with Retry and no events; Retry loads them.
- e2e: in `hi`, headings use Hindi month names and have no English ordinal suffixes ("st", "nd", "rd", "th").
- Visual: `calendar-month`, `calendar-week`, `calendar-day`, `calendar-details` and `calendar-hi` at 390 and 1280.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `e2e/calendar.spec.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm run e2e -- e2e/calendar.spec.ts`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation** of the view, the dialog and the locale keys

- [ ] **Step 4: Run them to verify they pass**

Run: `npm run e2e -- e2e/calendar.spec.ts && node "/Users/ankitkumarpandit/Documents/work/geekyants/claude-plugin/geekyants-claude-plugin/plugins/ga/skills/verify-work/scripts/visual-compare.mjs" design/modernize/calendar/compare.json`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/views/CalendarView.vue src/components/calendar/TaskDetailsDialog.vue src/i18n/locales/en/calendar.json src/i18n/locales/hi/calendar.json e2e/calendar.spec.ts design/modernize/calendar/compare.json design/modernize/calendar/compare
git commit -m "feat(calendar): Vuetify 4 calendar with working event details"
```

---

### Task 8: Profile and labels

**Files:**
- Modify: `src/views/ProfileView.vue`
- Create: `src/i18n/locales/en/profile.json`, `src/i18n/locales/hi/profile.json`, `design/modernize/profile/compare.json`, `design/modernize/profile/compare/`
- Test: `e2e/profile.spec.ts`

**Interfaces:**
- Consumes: `useSessionStore`, `updateDisplayName`, `useLabelsStore().add` (Task 2); the harness (Task 1)

**Spec:**
- §3.6: "Profile: edit display name, create labels (name plus colour)."
- D11: "They must always be reachable by touch and keyboard."
- D15: "Require 1–30 characters after trimming."
- D18: "Hindi is missing `toast.error.name.edit`"

**Tags:** screen, security, failure-paths

**Knowledge:** none — the project has no knowledge base.

**Acceptance:**
- e2e: the name-edit button is visible without hover, reachable by Tab, and has an `aria-label`.
- e2e: rename to "Ankit P"; the header shows it, and it persists after reload.
- e2e: rename with the auth update failing; the field keeps "Ankit P" and the Hindi UI shows the Hindi error (not a raw key).
- e2e: creating a label "   " is blocked with "Enter a label name"; 31 characters are blocked with "Keep it under 30 characters". "Work" with a colour appears immediately and after reload.
- e2e: the "LABELS" heading and "NA" placeholders come from the locale files in both languages.
- Visual: `profile`, `profile-editing`, `profile-label-error` and `profile-hi` at 390 and 1280.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `e2e/profile.spec.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm run e2e -- e2e/profile.spec.ts`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation** of the view and its locale keys

- [ ] **Step 4: Run them to verify they pass**

Run: `npm run e2e -- e2e/profile.spec.ts && node "/Users/ankitkumarpandit/Documents/work/geekyants/claude-plugin/geekyants-claude-plugin/plugins/ga/skills/verify-work/scripts/visual-compare.mjs" design/modernize/profile/compare.json`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/views/ProfileView.vue src/i18n/locales/en/profile.json src/i18n/locales/hi/profile.json e2e/profile.spec.ts design/modernize/profile/compare.json design/modernize/profile/compare
git commit -m "feat(profile): accessible name edit and validated labels"
```

---

### Task 9: PWA service worker, push on the client, notifications screen

**Files:**
- Modify: `src/sw.ts`, `src/views/NotificationsView.vue`, `src/pwa/index.ts`
- Create: `src/services/devices.ts`, `src/pwa/useUpdatePrompt.ts`, `src/pwa/useMessaging.ts`, `public/.well-known/assetlinks.json`, `src/i18n/locales/en/notifications.json`, `src/i18n/locales/hi/notifications.json`, `src/i18n/locales/en/pwa.json`, `src/i18n/locales/hi/pwa.json`, `design/modernize/notifications/compare.json`, `design/modernize/notifications/compare/`
- Test: `src/services/devices.test.ts`, `src/pwa/useMessaging.test.ts`, `e2e/notifications.spec.ts`, `e2e/pwa.spec.ts`

**Interfaces:**
- Consumes: `useSessionStore().onSignOut`, `useNotificationsStore`, `firebaseApp`, `db` (Task 2); the device doc shape and its rules (Task 3); `useUiStore().showSnack`, VitePWA `injectManifest` config, the `setupPwa` stub (Task 1)
- Produces:

```ts
// src/services/devices.ts — users/{uid}/devices/{token}
export function saveDevice(uid: string, token: string): Promise<void>;
export function removeDevice(uid: string, token: string): Promise<void>;

// src/pwa/useMessaging.ts
export interface Messaging {
  supported: Ref<boolean>;            // isSupported() && 'Notification' in window && serviceWorker
  permission: Ref<NotificationPermission | 'unsupported'>;
  enable(): Promise<'granted' | 'denied' | 'unsupported' | 'error'>; // only called from a click
  disable(): Promise<void>;           // deleteToken + removeDevice
}
export declare function useMessaging(): Messaging;
// registers exactly one onMessage handler per app session; registers removeDevice as a session onSignOut hook

// src/pwa/index.ts — setupPwa() calls useUpdatePrompt() and starts the single onMessage registration
// src/pwa/useUpdatePrompt.ts — wraps virtual:pwa-register; on need-refresh shows snack "A new version is available" with action "Reload"
export function useUpdatePrompt(): void;
```

`src/sw.ts`:
- precacheAndRoute(self.__WB_MANIFEST);
- NavigationRoute fallback to `/index.html` (denylist `/__/`);
- Firebase 13 `onBackgroundMessage` showing the notification and opening `/notification` on click;
- skipWaiting only on the `SKIP_WAITING` message from the prompt;
- clientsClaim.

**Spec:**
- D19: "The toggle requests permission when switched on and removes this device's token when switched off."
- D20: "snackbar with a Reload action instead."
- P1: "Request permission only from the toggle (D19), only where `isSupported()` is true."
- P2: "Register exactly one handler per app session."
- P3: "Store one document per device (`users/{uid}/devices/{token}`), delete it on sign-out and when permission is revoked, and delete it server-side when FCM reports it invalid."
- P4: "It must use the same SDK major as the app, inside the single vite-plugin-pwa service worker."
- W1: "Serve the real statement (Play signing and upload key fingerprints) at `/.well-known/assetlinks.json` with `Content-Type: application/json`, and exclude it from the `**/.*` ignore rule."
- W2: "The app shell, including deep links such as `/home`, must load offline after one online visit, with every precached file under 2 MB."

**Tags:** security, screen, failure-paths

**Knowledge:** none — the project has no knowledge base.

**Acceptance:**
- `useMessaging` with `isSupported()` false: `supported` is false, `enable()` resolves `unsupported` without calling `Notification.requestPermission`, and nothing throws when `window.Notification` is undefined (iOS Safari).
- `enable()` granted saves `users/{uid}/devices/{token}`. `disable()` deletes that doc and calls `deleteToken`. A second device's doc is untouched.
- Signing out runs `removeDevice` before the auth sign-out. After user B signs in, no device doc for A has this browser's token (Review Focus 4).
- Mounting the app, signing out and in three times leaves exactly one `onMessage` registration.
- `enable()` is never called from a watcher or on mount (unit test spies on mount).
- e2e: on the notifications screen the toggle is disabled with "Notifications aren't supported on this browser." where unsupported (Playwright WebKit).
- e2e: seeded notifications list newest first, with times in the browser's time zone. Deleting one removes it and it stays gone after reload; a failed delete keeps it and shows "Couldn't delete. Try again."
- e2e (`pwa.spec.ts`, production build via `vite preview`): after one online visit, offline reload of `/home` renders the app shell. `/.well-known/assetlinks.json` returns JSON containing `app.web.spanion_todo.twa`.
- e2e: when a new service worker is waiting, the snack "A new version is available" appears with "Reload", and the page doesn't reload until Reload is clicked; a half-filled add-task form keeps its text until then.
- Visual: `notifications-empty`, `notifications-list`, `notifications-unsupported` and `notifications-hi` at 390 and 1280.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `src/services/devices.test.ts`, `src/pwa/useMessaging.test.ts`, `e2e/notifications.spec.ts` and `e2e/pwa.spec.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm run test -- src/services/devices.test.ts src/pwa && npm run e2e -- e2e/notifications.spec.ts e2e/pwa.spec.ts`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation**: service worker, composables, devices service, view, assetlinks and locale keys

- [ ] **Step 4: Run them to verify they pass**

Run: `npm run test -- src/services/devices.test.ts src/pwa && npm run e2e -- e2e/notifications.spec.ts e2e/pwa.spec.ts && node "/Users/ankitkumarpandit/Documents/work/geekyants/claude-plugin/geekyants-claude-plugin/plugins/ga/skills/verify-work/scripts/visual-compare.mjs" design/modernize/notifications/compare.json`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/sw.ts src/views/NotificationsView.vue src/pwa/index.ts src/services/devices.ts src/services/devices.test.ts src/pwa/useUpdatePrompt.ts src/pwa/useMessaging.ts src/pwa/useMessaging.test.ts public/.well-known/assetlinks.json
git add src/i18n/locales/en/notifications.json src/i18n/locales/hi/notifications.json src/i18n/locales/en/pwa.json src/i18n/locales/hi/pwa.json e2e/notifications.spec.ts e2e/pwa.spec.ts design/modernize/notifications/compare.json design/modernize/notifications/compare
git commit -m "feat(pwa): per-device push tokens, update prompt, offline shell, TWA asset links"
```

---

### Task 10: Cloud Functions — reminders on Node 22 and legacy data migration

**Files:**
- Delete: `functions/index.js`, `functions/.eslintrc.json`
- Create: `functions/src/index.ts`, `functions/src/reminders.ts`, `functions/src/dueTasks.ts`, `functions/scripts/migrate-legacy.ts`, `functions/tsconfig.json`, `functions/eslint.config.js`, `functions/vitest.config.ts`
- Test: `functions/src/dueTasks.test.ts`, `functions/src/reminders.test.ts`, `functions/scripts/migrate-legacy.test.ts`

**Interfaces:**
- Consumes: task fields `remindAt`, `reminded`, `timeZone`, `uid`, `title`, `time` and the functions package setup (Task 1); device docs `users/{uid}/devices/{token}` and the `tasks(reminded, remindAt)` index (Task 3)
- Produces:

```ts
// functions/src/dueTasks.ts
export function dueWindow(now: Date): { from: Date; to: Date };     // (now, now + 60 min]
export function reminderBody(title: string, time: string): string; // 'Upcoming task "<title>" at <time>'
// functions/src/reminders.ts
export const sendReminders: ScheduleFunction; // onSchedule({ schedule: 'every 5 minutes', timeZone: 'UTC' })
export function runReminders(db: Firestore, messaging: Messaging, now: Date): Promise<{ sent: number; failed: number; removedTokens: number }>;
// functions/scripts/migrate-legacy.ts — run by the developer with admin credentials
// usage: npm --prefix functions run migrate -- --tz Asia/Kolkata [--dry-run]
// fills timeZone/remindAt/reminded on tasks lacking them; copies fcm/{uid}.token to users/{uid}/devices/{token}; converts notifications.timestamp strings to createdAt Timestamps
```

**Spec:**
- S1: "The HTTP function `testFunction` is public and unauthenticated, and returns every user's FCM token and task titles. Delete it."
- P3: "delete it server-side when FCM reports it invalid."
- P5: "Replace it with a v2 `onSchedule('every 5 minutes')` function that queries tasks with `remindAt <= now + 60 min`, `remindAt > now` and `reminded == false`. It sends over the HTTP v1 API to each of the owner's devices, writes a notification document with a server `Timestamp`, and sets `reminded = true`. One failure must not stop the other sends."
- §10: "A one-off migration fills in `remindAt`/`timeZone`/`reminded` on existing tasks (P6) and moves `fcm/{uid}` to `users/{uid}/devices` (P3)."

**Tags:** security, failure-paths

**Knowledge:** none — the project has no knowledge base.

**Acceptance:**
- `dueWindow(2026-11-02T03:00Z)` is `(03:00Z, 04:00Z]`. A task with `remindAt` 03:00Z exactly is not sent; 03:00:30Z is. Due tasks within the current minute are sent.
- `runReminders` sends one message per device of the owner (2 devices → 2 sends), writes one `notifications` doc with `createdAt` server timestamp, `taskId` and `uid`, and sets `reminded: true`. A second run sends nothing.
- When one token fails with `messaging/registration-token-not-registered`, that device doc is deleted, the other device still gets the message, and the task is still marked reminded.
- When `send` throws for task A, task B in the same run is still sent; the result counts `failed: 1`, and A stays `reminded: false` for the next run.
- A task with no devices is marked reminded without sending, and `sent` is 0 for it.
- Done or indefinite tasks (with `remindAt: null`) are never read by the query.
- `functions/src/index.ts` exports only `sendReminders`; there is no HTTP-triggered export.
- Migration `--dry-run` on seeded legacy data (`date '2026-11-03'`, `time '09:00'`, `fcm/alice {token:'t1'}`, `fcm/bob {token:null}`, `notifications.timestamp '11/2/2026, 3:30:00 PM'`) writes nothing and reports the counts. A real run gives Alice's task `timeZone 'Asia/Kolkata'` and `remindAt 2026-11-03T02:30Z`, `users/alice/devices/t1`, no device for Bob, and `createdAt` on the notification. Running it again changes nothing.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `functions/src/dueTasks.test.ts`, `functions/src/reminders.test.ts` and `functions/scripts/migrate-legacy.test.ts` (FCM `Messaging` faked; Firestore on the emulator)

- [ ] **Step 2: Run them to verify they fail**

Run: `npm --prefix functions run test`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation** to the Interfaces

- [ ] **Step 4: Run them to verify they pass**

Run: `npm --prefix functions run test && npm --prefix functions run build && npm --prefix functions run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git rm functions/index.js functions/.eslintrc.json
git add functions/src/index.ts functions/src/reminders.ts functions/src/reminders.test.ts functions/src/dueTasks.ts functions/src/dueTasks.test.ts functions/scripts/migrate-legacy.ts functions/scripts/migrate-legacy.test.ts
git add functions/tsconfig.json functions/eslint.config.js functions/vitest.config.ts
git commit -m "feat(functions): reminders on Node 22 with FCM HTTP v1; remove public test endpoint; legacy migration"
```

---

### Task 11: Repo hygiene, docs, final checks

**Files:**
- Delete from the index: `packages/android/source/.gradle/` (every tracked file under it), `packages/android/source/app/build/` (every tracked file under it), `packages/android/source/app-release-signed.apk.idsig`, `.firebase/hosting.ZGlzdA.cache`, `.firebase/hosting.cHVibGlj.cache`
- Modify: `.gitignore`, `README.md`, `docs/FIXES_REPORT.md`
- Test: `e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: every earlier task (final integration check): Tasks 1–10

**Spec:**
- H1: "Remove Android build outputs from git (`packages/android/source/.gradle/`, `app/build/` including `mapping.txt` and `.dex`, `*.idsig`) and ignore them. Keep the TWA source and its README."
- H2: "`.gitignore` covers `.env`, `.env.*.local`, `.firebase/`, `firebase-debug.log`, `dist/`, `coverage/`, `playwright-report/`, `test-results/`."
- H3: "README: Node version, `.env.local` from `.env.example` (including `VUE_APP_VAPID_KEY`, renamed to `VITE_*`), emulator workflow, test commands, deploy steps."
- §9: "No `@ts-ignore`, no `any` in `src/` except at third-party boundaries, commented."

**Tags:** security, failure-paths

**Knowledge:** none — the project has no knowledge base.

**Acceptance:**
- `git ls-files packages/android | grep -E '/build/|\.gradle/|\.idsig$'` prints nothing, and `packages/android/Readme.html` and `app/build.gradle` are still tracked.
- `git ls-files .firebase` prints nothing, and `git check-ignore .env firebase-debug.log dist coverage` lists all four.
- `grep -rn "ts-ignore" src functions/src` prints nothing.
- e2e smoke: sign up, add a task for tomorrow 09:00, see it on Home, mark it done by drag, see it on the Calendar, sign out. Run in both Chromium and WebKit.
- All gates pass: typecheck, lint, format-check, test, test:rules, e2e, functions test, and every `design/modernize/*/compare.json`.
- `docs/FIXES_REPORT.md` marks each item fixed with the task that fixed it, and lists what is left for the developer: deploy, run the migration with `--tz Asia/Kolkata`, set the VAPID key, check the GCP API key restrictions, disable the Facebook provider in the Firebase console.

- [ ] **Step 1: Write the failing smoke test** in `e2e/smoke.spec.ts`

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run e2e -- e2e/smoke.spec.ts`
Expected: FAIL only where integration is missing (if it passes straight away, check it exercises every listed step)

- [ ] **Step 3: Remove the tracked build outputs, update `.gitignore`, the README and the report**, and fix whatever the smoke run exposed

- [ ] **Step 4: Run all gates to verify they pass**

Run: `npm run typecheck && npm run lint && npm run format:check && npm run test && npm run test:rules && npm run e2e && npm --prefix functions run test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git rm -r --cached packages/android/source/.gradle packages/android/source/app/build
git rm --cached packages/android/source/app-release-signed.apk.idsig .firebase/hosting.ZGlzdA.cache .firebase/hosting.cHVibGlj.cache
git add .gitignore README.md docs/FIXES_REPORT.md e2e/smoke.spec.ts
git commit -m "chore: drop tracked build outputs, document setup, final smoke test"
```
