# Restore the original design, part 1 Implementation Plan

**Status:** complete

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:implement-with-subagents by default, or ga:implement. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Vue 3 app the old app's global look, capture every screen of the old app as the visual references, and restyle the shell and the home screen to match them.

**Architecture:** Vuetify is created with the `md2` blueprint and Vuetify 2's theme colours. The old app (`b8af93e^`) is built in a throwaway git worktree outside the repository, pointed at the e2e emulators, and a local-only Playwright spec captures each screen state from it into `design/modernize/<screen>/refs/`. The shell and home components then take the old components' markup structure and CSS, keeping their scripts, until the home comparison passes.

**Tech Stack:** Vue 3.5, Vuetify 4 (`vuetify/blueprints`), `@mdi/font` 7, Vite 8, Playwright 1.64 with the repo's visual harness (`e2e/support/visual.ts`), Firebase Auth and Firestore emulators (`firebase.json`), GitHub Actions CI (`.github/workflows/ci.yml`, visual tests skip on CI). The old app: Vue 2.6, Vuetify 2.6.10, Vue CLI 5, Firebase 10 compat SDK.

**Spec:** `docs/specs/2026-11-04-restore-original-design.md`

**Security sign-off:** Task 2 — human:ankitp@geekyants.com: it only signs a seeded emulator test user in to the old app on demo-todo and changes no sign-in code.

## Global Constraints

- §2: "What stays as it is in the new app: all behaviour: routes, stores, services, validation, i18n, the auth-domain fix, the Firestore rules"
- §3: "No change to behaviour, data, rules, routes or copy."
- §3: "No return to Vue 2, Vuetify 2 or the old code."
- §4.2: "The worktree and its changes are never committed."
- §7: "every icon-only button keeps its `aria-label` (modernize spec W5)."
- §7: "Selectors that rely on markup (not role or label) are updated with the markup, never weakened."
- Visual widths `390` and `1280` (`VISUAL_WIDTHS` in `e2e/support/visual.ts`); the visual clock `2026-11-02T09:00:00Z`.
- Visual tests run locally only; on CI they skip (`canCompareVisuals()` in `e2e/support/visual.ts`).

## Checkpoints

- After Task 2: the developer reviews the old app's references in `design/modernize/*/refs/` and `design/modernize/old-app-states.md` before any screen is restyled (spec §4.2, "checkpoint 1").
- After Task 4: the developer approves the home screen and the shell against the old app (spec §4.3, "A screen is done when its comparison passes (§2) and the developer approves it").

---

### Task 1: Global look

**Files:**
- Modify: `src/plugins/vuetify.ts`
- Modify: `src/assets/style.css`
- Test: `src/plugins/vuetify.test.ts`

**Interfaces:**
- Consumes: existing `vuetify`, `THEME_COLOR`, `BACKGROUND_COLOR`, `storedTheme()` in `src/plugins/vuetify.ts`.
- Produces: `vuetify` created with the `md2` blueprint and Vuetify 2.6.10's theme colours, used by every screen task.

```ts
// src/plugins/vuetify.ts (exports; names unchanged)
export const THEME_COLOR: '#1976D2';
export const BACKGROUND_COLOR: '#FAFAFA'; // the web manifest's background_color (spec W3), not the app surface
export function storedTheme(): Theme;
export const vuetify: Vuetify; // createVuetify({ blueprint: md2, ... })
```

**Spec:**
- §4.1: "Create Vuetify with the `md2` blueprint (`vuetify/blueprints`): MD2 type scale, corner radius, elevation and uppercase buttons, close to Vuetify 2's defaults."
- §4.1: "Theme: the old app's colours. `THEME_COLOR = '#1976D2'` stays (the old app's primary)"
- §4.1: "The default theme stays dark when the device never chose, as in the old app and today."
- §4.1: "App-wide CSS: the old `src/assets/style.css` rules that still apply move into the new one."

**Knowledge:** `design-system/tokens: Vuetify uses the md2 blueprint with Vuetify 2's default theme colours; the manifest keeps THEME_COLOR and BACKGROUND_COLOR`

**Acceptance:**
- Given the created `vuetify`, then its defaults come from the `md2` blueprint (the blueprint's `defaults` and `theme` are what `createVuetify` received).
- Given the light theme, then `primary` is `#1976D2`, `secondary` `#424242`, `accent` `#82B1FF`, `error` `#FF5252`, `info` `#2196F3`, `success` `#4CAF50`, `warning` `#FB8C00`, `background` `#FFFFFF` and `surface` `#FFFFFF` (Vuetify 2.6.10's light preset).
- Given the dark theme, then `primary` is `#1976D2` with the same `secondary` to `warning` values, `background` `#121212` and `surface` `#1E1E1E` (Vuetify 2.6.10's dark preset).
- Given no saved theme, or a saved value other than `'false'`, when the app starts, then the theme is `dark`; given `'false'`, it is `light` (the existing `storedTheme()` cases keep passing).
- Given the old `style.css` (`git show 'b8af93e^:src/assets/style.css'`), then each of its rules whose class is used by a new component is in `src/assets/style.css`, and no rule is added for a class nothing uses.
- Given `vite.config.ts`'s manifest, then `theme_color` is still `#1976D2` and `background_color` still `#FAFAFA`.

- [x] **Step 1: Write the failing tests** for each Acceptance case, in `src/plugins/vuetify.test.ts`
- [x] **Step 2: Run them to verify they fail**

Run: `npm test -- src/plugins/vuetify.test.ts`
Expected: FAIL on the blueprint and theme colour assertions; the `storedTheme()` cases pass.

- [x] **Step 3: Write the minimal implementation** in `src/plugins/vuetify.ts` (the `md2` blueprint, both themes' colours) and `src/assets/style.css`
- [x] **Step 4: Run them to verify they pass**

Run: `npm test -- src/plugins/vuetify.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/plugins/vuetify.ts src/plugins/vuetify.test.ts src/assets/style.css
git commit -m "feat(ui): md2 blueprint and Vuetify 2's theme colours"
```

### Task 2: References from the old app

**Files:**
- Create: `e2e/support/old-app.mjs`
- Create: `e2e/old-app-refs.spec.ts`
- Create: `design/modernize/old-app-states.md`
- Modify: `e2e/fixtures/home.ts`
- Modify (generated): `design/modernize/auth/refs`
- Modify (generated): `design/modernize/home/refs`
- Modify (generated): `design/modernize/add/refs`
- Modify (generated): `design/modernize/profile/refs`
- Modify (generated): `design/modernize/calendar/refs`
- Modify (generated): `design/modernize/notifications/refs`

**Interfaces:**
- Consumes: existing `resetEmulators()`, `createUser()`, `seedDoc()`, `DocRef` (`e2e/support/emulator.ts`); existing `prepareVisualPage()`, `settleVisualPage()`, `visualContextOptions()`, `VISUAL_WIDTHS`, `VISUAL_CLOCK` (`e2e/support/visual.ts`); existing `seedLegacyTask()`, `seedLabel()`, `freshHomeUser()`, `HOME_USER` (`e2e/fixtures/home.ts`).
- Produces: the references Tasks 3 and 4 compare with, and the seed both apps are captured on:

```ts
// e2e/fixtures/home.ts
/** The same board seedHomeBoard seeds, in the old app's shape: `type` references, 'NA' for no date or time. */
export function seedLegacyHomeBoard(uid: string, today: string): Promise<void>;
```

```text
# e2e/support/old-app.mjs (run by hand: node e2e/support/old-app.mjs [--stop])
OLD_APP_REF   = b8af93e^
OLD_APP_DIR   = <os.tmpdir()>/todo-pwa-old-app   (a git worktree, outside the repository)
OLD_APP_PORT  = 5190
Prints:  OLD_APP_URL=http://localhost:5190
```

**Spec:**
- §4.2: "The old code (`b8af93e^`) is built in a throwaway git worktree outside the repository's tracked files. Its Firebase setup is pointed at the local Auth and Firestore emulators (`connectAuthEmulator`, `useEmulator`), with the same seeded user and data as the e2e fixtures, and its clock frozen at the harness's `clock`."
- §4.2: "Each state in §5 is captured from the old app at `390` and `1280`, light by default and dark where §5 says so, with Hindi where the state is `-hi`. These replace `design/modernize/<screen>/refs/`."
- §4.2: "A state the old app can't show (a new feature, or an error it never surfaced) has no old reference: its reference is the restyled new app, approved by the developer at that screen's checkpoint, as today."
- §4.2: "The worktree and its changes are never committed."
- §5: "Added: one dark state per screen (`<screen>-dark`, from its main state), since the old app defaults to dark."
- §8: "Both apps are captured on the same seed in the old shape (`type` references, `'NA'` dates), which the new app reads too (`domain/legacy-documents`), so the two captures differ by style, not content."

**Tags:** `harness`, not security: it signs a seeded emulator test user in through the old app's form, on `demo-todo`, and changes no sign-in code

**Knowledge:** `quality/testing: the visual references are captures of the old app (b8af93e^), taken by e2e/old-app-refs.spec.ts against a worktree e2e/support/old-app.mjs builds; states the old app can't show are listed in design/modernize/old-app-states.md`

**Acceptance:**
- Given `node e2e/support/old-app.mjs`, when it finishes, then a git worktree of `b8af93e^` exists at `<os.tmpdir()>/todo-pwa-old-app`, its Firebase config uses project `demo-todo` and connects Auth to `http://127.0.0.1:9199` and Firestore to `127.0.0.1:8180`, it serves on port `5190`, and `git status` in this repository shows no change from the script.
- Given `node e2e/support/old-app.mjs --stop`, then the server stops and the worktree is removed (`git worktree list` no longer shows it).
- Given `OLD_APP_URL` is unset, or `canCompareVisuals()` is false, when `npm run e2e` runs, then every test in `e2e/old-app-refs.spec.ts` skips.
- Given `seedLegacyHomeBoard(uid, today)`, then it writes the same task titles, statuses, dates, times and labels as `seedHomeBoard(uid, today)`, with labels as `type` references to `types/<id>` and `'NA'` for an indefinite task's `date` and `time`, and no `labelIds`, `timeZone`, `remindAt` or `reminded`.
- Given the old app running and `OLD_APP_URL` set, when `e2e/old-app-refs.spec.ts` runs, then for each state in spec §5 (auth 8, home 6, add 4, profile 4, calendar 5, notifications 4) and each screen's `<screen>-dark` state, at `390` and `1280`, either `design/modernize/<screen>/refs/<state>-<width>.png` is written from the old app, or the state is listed in `design/modernize/old-app-states.md` with the reason the old app can't show it.
- Given a signed-in state in the old app, then the user signs in through the old sign-in form (email and password), never through the new app's services.
- Given the old app's clock, then every capture shows `2026-11-02` as today (the page clock is fixed at `VISUAL_CLOCK`, as `prepareVisualPage()` does).
- Given a `-hi` state, then the old app is opened with `localStorage` `lang` `hi`; given a `-dark` state, with `dark` `true`; otherwise `lang` `en` and `dark` `false`.

- [x] **Step 1: Write the failing test** for the `seedLegacyHomeBoard` case, in `e2e/old-app-refs.spec.ts` (it reads the seeded documents back with `readDoc`, and runs whenever the emulators do)
- [x] **Step 2: Run it to verify it fails**

Run: `npm run e2e -- e2e/old-app-refs.spec.ts --project chromium -g "legacy board"`
Expected: FAIL on the seeded fields, after `seedLegacyHomeBoard` exists with its real signature.

- [x] **Step 3: Write `seedLegacyHomeBoard`** in `e2e/fixtures/home.ts`
- [x] **Step 4: Run it to verify it passes**

Run: `npm run e2e -- e2e/old-app-refs.spec.ts --project chromium -g "legacy board"`
Expected: PASS

- [x] **Step 5: Write `e2e/support/old-app.mjs`** (worktree, demo config, emulator connection, install, serve, `--stop`)
- [x] **Step 6: Write the capture states** in `e2e/old-app-refs.spec.ts`, one block per screen, skipped without `OLD_APP_URL`
- [x] **Step 7: Start the old app**

Run: `node e2e/support/old-app.mjs`
Expected: `OLD_APP_URL=http://localhost:5190`

- [x] **Step 8: Capture the references**

Run: `OLD_APP_URL=http://localhost:5190 npm run e2e -- e2e/old-app-refs.spec.ts --project chromium`
Expected: PASS, with each state's references written or listed in `design/modernize/old-app-states.md`

- [x] **Step 9: Stop the old app**

Run: `node e2e/support/old-app.mjs --stop`
Expected: the worktree is gone from `git worktree list`

- [x] **Step 10: Commit**

```bash
git add e2e/support/old-app.mjs e2e/old-app-refs.spec.ts e2e/fixtures/home.ts design/modernize/old-app-states.md design/modernize/auth/refs design/modernize/home/refs design/modernize/add/refs design/modernize/profile/refs design/modernize/calendar/refs design/modernize/notifications/refs
git commit -m "test(visual): capture the old app's screens as the references"
```

### Task 3: Shell and home frame

**Files:**
- Modify: `src/App.vue`
- Modify: `src/components/layout/AppMenu.vue`
- Modify: `src/components/layout/AppNav.vue`
- Modify: `src/components/layout/AppSnackbar.vue`
- Modify: `src/components/DateBar.vue`
- Modify: `src/views/HomeView.vue`
- Modify: `src/components/tasks/TaskBoard.vue`
- Modify: `e2e/home.spec.ts`
- Modify: `design/modernize/home/compare.json`
- Modify (generated): `design/modernize/home/compare`

**Interfaces:**
- Consumes: `vuetify` with the `md2` blueprint and the old theme colours (Task 1); `seedLegacyHomeBoard()` and the home references in `design/modernize/home/refs/` (Task 2).
- Produces: the old app's shell (top bar, bottom navigation, date bar, menu, snackbar) and home frame (columns, empty, loading and error states) around `TaskCard`, which Task 4 restyles. Component props, emits and `data-testid`s stay as they are.

**Spec:**
- §4.3: "Each area ports the old component's markup structure and CSS into the new component, keeping the new script"
- §4.3 table, Shell, old: "`App.vue`, `ContainerApp`, `ContainerMain`, `ContainerMenu`, `BarTop`, `BarNav`, `BarDate`"
- §4.3 table, Shell, new: "`App.vue`, `layout/AppMenu`, `layout/AppNav`, `layout/AppSnackbar`, `DateBar`"
- §4.1: "Where a glyph differs from `@mdi/font` 4 or the old app used another name (`mdi-clock` for `mdi-clock-outline`, `mdi-card-text` for `mdi-text`, the profile tab's avatar or `mdi-face` for `mdi-account-circle`), the new app uses the old one."
- §6: "Loading, load-error and save-error states | the old app's `v-progress-linear` and snackbar (`ContainerMain`)"
- §2: "A difference that's left is listed with its reason in the plan run's record and approved by the developer at that screen's checkpoint."

**Tags:** `screen`, `failure-paths`

**Knowledge:** `design-system/components: the shell (AppNav, AppMenu, DateBar, AppSnackbar) follows the old app's BarNav, ContainerMenu, BarDate and ContainerMain`

**Acceptance:**
- Given the home visual states seed with `seedLegacyHomeBoard` (not `seedHomeBoard`), when `home-empty`, `home-loading` and `home-load-error` are compared, then each passes against its old-app reference at `390` and `1280`, or its remaining difference is listed with its reason in the run's record.
- Given a new `home-dark` state (the `home-tasks` setup with `theme: 'dark'`), then it is captured and compared like the others.
- Given the bottom navigation, then its tabs are home, calendar, add, notifications and profile in that order, as in the old `BarNav`; the profile tab shows the user's photo at `24` px when the account has one, else `mdi-face`; and each tab keeps its `aria-label`.
- Given the board fails to load, then the screen shows the old app's error presentation and still offers Retry (`data-testid="load-error"`), and the tasks already shown stay.
- Given the board is loading, then the old app's `v-progress-linear` shows, as in `ContainerMain`, and `data-testid="task-skeleton"` still marks each placeholder.
- Given the existing non-visual tests in `e2e/home.spec.ts` and `e2e/shell.spec.ts`, then they pass unchanged, except where a selector relied on markup this task replaced, which is updated to a role or label.

- [x] **Step 1: Write the failing tests**: switch the home visual states to `seedLegacyHomeBoard`, add `home-dark`, and add the bottom-navigation case, in `e2e/home.spec.ts`
- [x] **Step 2: Run them to verify they fail**

Run: `npm run e2e -- e2e/home.spec.ts --project chromium`
Expected: FAIL on the visual comparison of `home-empty`, `home-loading` and `home-load-error`, and on the profile tab's icon.

- [x] **Step 3: Port the old shell's markup and CSS** into `src/App.vue`, `src/components/layout/AppMenu.vue`, `AppNav.vue`, `AppSnackbar.vue` and `src/components/DateBar.vue`
- [x] **Step 4: Port the old task list's frame** into `src/views/HomeView.vue` and `src/components/tasks/TaskBoard.vue`
- [x] **Step 5: Run them to verify they pass**

Run: `npm run e2e -- e2e/home.spec.ts e2e/shell.spec.ts --project chromium`
Expected: PASS for the cases above; `home-tasks`, `home-editing` and `home-hi` may still differ in the cards, which Task 4 restyles.

- [x] **Step 6: Commit**

```bash
git add src/App.vue src/components/layout/AppMenu.vue src/components/layout/AppNav.vue src/components/layout/AppSnackbar.vue src/components/DateBar.vue src/views/HomeView.vue src/components/tasks/TaskBoard.vue e2e/home.spec.ts design/modernize/home/compare.json design/modernize/home/compare
git commit -m "feat(ui): the old app's shell and home frame"
```

### Task 4: Task cards

**Files:**
- Modify: `src/components/tasks/TaskCard.vue`
- Modify: `src/components/tasks/TaskColumn.vue`
- Modify: `src/components/tasks/LabelChips.vue`
- Modify: `src/components/tasks/TaskEditForm.vue`
- Modify: `e2e/home.spec.ts`
- Modify (generated): `design/modernize/home/compare`

**Interfaces:**
- Consumes: the shell and home frame (Task 3); the home references (Task 2); `vuetify` with the old theme (Task 1).
- Produces: task cards, columns, label chips and the edit form in the old `TaskCard` and `TaskCardGrid` style. Props, emits, `data-testid`s and accessible names (`Edit task`, the edit form's `form` role and name) stay as they are.

**Spec:**
- §4.3 table, Home, old: "`TaskList.vue`, `TaskCard`, `TaskCardGrid`"
- §4.3 table, Home, new: "`HomeView`, `tasks/TaskBoard`, `tasks/TaskColumn`, `tasks/TaskCard`, `tasks/LabelChips`, `tasks/TaskEditForm`"
- §4.3: "Each area ports the old component's markup structure and CSS into the new component, keeping the new script"
- §4.1: "Where a glyph differs from `@mdi/font` 4 or the old app used another name (`mdi-clock` for `mdi-clock-outline`, `mdi-card-text` for `mdi-text`, the profile tab's avatar or `mdi-face` for `mdi-account-circle`), the new app uses the old one."
- §2: "for each screen state in §5, the new app's capture matches the old app's capture in the visual harness, at `390` and `1280` wide."

**Tags:** `screen`, `failure-paths`

**Knowledge:** `design-system/components: TaskCard, TaskColumn, LabelChips and TaskEditForm follow the old app's TaskCard and TaskCardGrid`

**Acceptance:**
- Given `home-tasks`, `home-editing`, `home-hi` and `home-dark`, when compared, then each passes against its old-app reference at `390` and `1280`, or its remaining difference is listed with its reason in the run's record.
- Given the edit form, then its time field shows `mdi-clock` and its description field `mdi-card-text`, as in the old app.
- Given a task with labels, then its chips show each label's name in its own colour, passed through `safeColor`, as the old card did.
- Given a done task, then its title is struck through (`.line-through-text`), as in the old card.
- Given a save that fails while editing, then the form keeps the typed values and the old app's snackbar says the save failed (the existing failed-save case in `e2e/home.spec.ts` keeps passing).
- Given the existing drag, edit, tick and delete tests in `e2e/home.spec.ts`, then they pass, with only markup-bound selectors moved to a role or label.

- [x] **Step 1: Write the failing tests** for the icon and chip cases, in `e2e/home.spec.ts`
- [x] **Step 2: Run them to verify they fail**

Run: `npm run e2e -- e2e/home.spec.ts --project chromium`
Expected: FAIL on the visual comparison of `home-tasks`, `home-editing`, `home-hi`, `home-dark`, and on the edit form's icons.

- [x] **Step 3: Port the old card's markup and CSS** into `src/components/tasks/TaskCard.vue`, `TaskColumn.vue` and `LabelChips.vue`
- [x] **Step 4: Port the old card's edit mode** into `src/components/tasks/TaskEditForm.vue`
- [x] **Step 5: Run them to verify they pass**

Run: `npm run e2e -- e2e/home.spec.ts --project chromium`
Expected: PASS

- [x] **Step 6: Commit**

```bash
git add src/components/tasks/TaskCard.vue src/components/tasks/TaskColumn.vue src/components/tasks/LabelChips.vue src/components/tasks/TaskEditForm.vue e2e/home.spec.ts design/modernize/home/compare
git commit -m "feat(ui): the old app's task cards"
```
