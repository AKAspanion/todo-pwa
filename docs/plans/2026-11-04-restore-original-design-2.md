# Restore the original design, part 2 Implementation Plan

**Status:** complete

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:implement-with-subagents by default, or ga:implement. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the add, sign-in and sign-up, profile, calendar and notifications screens to match the old app, with the old app's wording, as part 1 did for the shell and home.

**Architecture:** Part 1 put the global look in place (`md2` blueprint, Vuetify 2's colours, the old app-wide CSS) and captured every screen of the old app into `design/modernize/<screen>/refs/`. Each task here ports one old view's markup structure and CSS into its new view, keeping the new script, switches that screen's strings to the old app's in its own locale files, and compares the screen with the old app's captures until they match.

**Tech Stack:** Vue 3.5, Vuetify 4 with the `md2` blueprint, `@mdi/font` 7, vue-i18n (`src/i18n/locales/<lang>/<feature>.json`), Playwright 1.64 with the visual harness (`e2e/support/visual.ts`), Firebase Auth and Firestore emulators, GitHub Actions CI (visual tests skip on CI).

**Spec:** `docs/specs/2026-11-04-restore-original-design.md`

## Global Constraints

- §2: "all behaviour: routes, stores, services, validation, i18n, the auth-domain fix, the Firestore rules" (what stays as it is in the new app)
- §3: "No return to Vue 2, Vuetify 2 or the old code."
- §3: "A string that differs between the apps keeps the new app's wording unless the developer says otherwise per screen." The developer chose the old app's wording for home on 2026-11-04 (`decisions/restore-original-design`); this plan applies the old wording to these five screens too, which the developer confirms with the plan.
- §4.3: "Each area ports the old component's markup structure and CSS into the new component, keeping the new script"
- §7: "every icon-only button keeps its `aria-label` (modernize spec W5)."
- §7: "Selectors that rely on markup (not role or label) are updated with the markup, never weakened."
- The visual compare passes whenever its captures succeed (its `0.1` is a per-pixel tolerance, and `visual-compare.mjs` exits non-zero only on capture errors). A state matches when its diff ratio is at most `10%` at `390` and `5%` at `1280`; each task reports every state's ratios, and lists any state over them with the reason.
- Strings change only in the screen's own locale file, in both `en` and `hi`, with the same keys; `common.json`, `fields.json` and `dates.json` change only where the task says, and never in a way another screen reads differently.
- The old app's code is read with `git show 'b8af93e^:<path>'`; it is never copied into the repository whole.

## Checkpoints

- After Task 5: the developer approves the five screens against the old app, from a side-by-side of each screen's states (spec §4.3, "A screen is done when its comparison passes (§2) and the developer approves it"). The states with no old reference (`calendar-details`, `profile-label-error`, `notifications-unsupported`, listed in `design/modernize/old-app-states.md`) are approved from the new app's capture.

---

### Task 1: Add task

**Files:**
- Modify: `src/views/TaskAddView.vue`
- Modify: `src/components/fields/DateField.vue`
- Modify: `src/components/fields/TimeField.vue`
- Modify: `src/i18n/locales/en/add.json`
- Modify: `src/i18n/locales/hi/add.json`
- Modify: `e2e/add.spec.ts`
- Modify: `design/modernize/add/compare.json`
- Test: `src/components/fields/DateField.test.ts`
- Test: `src/components/fields/TimeField.test.ts`

**Interfaces:**
- Consumes: existing `DateField` and `TimeField` with their `oldFormat`, `variant`, `singleLine`, `flat` and `bgColor` props (built in part 1 for the home edit form); the old app's add references in `design/modernize/add/refs/`.
- Produces: the add screen in the old `TaskAdd.vue` style. `DateField` and `TimeField` keep every prop and emit they have; the home edit form's look doesn't change.

**Spec:**
- §4.3: "Each area ports the old component's markup structure and CSS into the new component, keeping the new script"
- §4.1: "Where a glyph differs from `@mdi/font` 4 or the old app used another name (`mdi-clock` for `mdi-clock-outline`, `mdi-card-text` for `mdi-text`, the profile tab's avatar or `mdi-face` for `mdi-account-circle`), the new app uses the old one."

**Tags:** `screen`, `failure-paths`

**Knowledge:** `features/add-task: the add screen follows the old app's TaskAdd, with its wording`

**Acceptance:**
- Given `add-empty`, `add-filled`, `add-error`, `add-hi` and a new `add-dark` state (the `add-filled` setup with `theme: 'dark'`, added to `design/modernize/add/compare.json`), when compared with the old app's references, then each is within `10%` at `390` and `5%` at `1280`, or listed with its reason.
- Given the add screen, then every label, placeholder, button and message it shows is the old `TaskAdd.vue`'s, in `en` and `hi`, from `add.json`.
- Given the description field, then it shows `mdi-card-text`, and the time field `mdi-clock`, where the old add screen had them.
- Given an empty title, when saved, then the save is blocked and the old app's required-title message shows; given a 201-character title, the save is blocked, and 200 characters are accepted (the existing cases keep passing with the old copy).
- Given a save the server rejects, then the form keeps its values and the failure message shows in the old app's style.
- Given the home edit form, then `e2e/home.spec.ts` still passes: the field changes don't move it.

- [x] **Step 1: Write the failing tests** for each Acceptance case, in `e2e/add.spec.ts` and the field tests
- [x] **Step 2: Run them to verify they fail**

Run: `npm run e2e -- e2e/add.spec.ts --project chromium`
Expected: FAIL on the copy, the icons and the new `add-dark` state.

- [x] **Step 3: Port the old add screen's markup and CSS** into `src/views/TaskAddView.vue`, and the field looks it needs into `DateField.vue` and `TimeField.vue`
- [x] **Step 4: Switch the add strings** to the old app's in `src/i18n/locales/en/add.json` and `src/i18n/locales/hi/add.json`
- [x] **Step 5: Run them to verify they pass**

Run: `npm run e2e -- e2e/add.spec.ts e2e/home.spec.ts --project chromium`
Expected: PASS, with each state's ratios in the report

- [x] **Step 6: Commit**

```bash
git add src/views/TaskAddView.vue src/components/fields/DateField.vue src/components/fields/TimeField.vue src/components/fields/DateField.test.ts src/components/fields/TimeField.test.ts src/i18n/locales/en/add.json src/i18n/locales/hi/add.json e2e/add.spec.ts design/modernize/add/compare.json
git commit -m "feat(ui): the old app's add task screen"
```

### Task 2: Sign-in and sign-up

**Files:**
- Modify: `src/views/SignInView.vue`
- Modify: `src/views/SignUpView.vue`
- Modify: `src/i18n/locales/en/auth.json`
- Modify: `src/i18n/locales/hi/auth.json`
- Modify: `e2e/auth.spec.ts`
- Modify: `design/modernize/auth/compare.json`

**Interfaces:**
- Consumes: existing `SignInView` and `SignUpView` scripts and `src/services/auth.ts`, unchanged; the old app's auth references in `design/modernize/auth/refs/`.
- Produces: the two screens in the old `Signin.vue` and `Signup.vue` style. Routes, guards, the Google sign-in flow and every field's validation stay as they are.

**Spec:**
- §4.3: "Each area ports the old component's markup structure and CSS into the new component, keeping the new script"
- §2: "all behaviour: routes, stores, services, validation, i18n, the auth-domain fix, the Firestore rules" (what stays as it is in the new app)

**Tags:** `screen`, `failure-paths`, `security`

**Knowledge:** `features/sign-in: the sign-in and sign-up screens follow the old app's Signin and Signup, with their wording`

**Acceptance:**
- Given `signin-en`, `signin-email-open-en`, `signin-error-en`, `signup-en`, `signin-hi`, `signin-email-open-hi`, `signin-error-hi`, `signup-hi` and a new `auth-dark` state (sign-in with `theme: 'dark'`, added to `design/modernize/auth/compare.json`), when compared with the old app's references, then each is within `10%` at `390` and `5%` at `1280`, or listed with its reason.
- Given either screen, then no Facebook button shows (modernize spec §11.1; the old app's Facebook button is a listed content difference, not restored).
- Given either screen, then its labels, buttons and messages are the old app's, in `en` and `hi`, from `auth.json`.
- Given a wrong password, then the failure shows where and how the old app showed it, and the email and password fields keep their values.
- Given the existing auth tests in `e2e/auth.spec.ts`, then they pass, with only copy and markup-bound selectors changed.

- [x] **Step 1: Write the failing tests** for each Acceptance case, in `e2e/auth.spec.ts`
- [x] **Step 2: Run them to verify they fail**

Run: `npm run e2e -- e2e/auth.spec.ts --project chromium`
Expected: FAIL on the copy and the new `auth-dark` state.

- [x] **Step 3: Port the old sign-in and sign-up markup and CSS** into `src/views/SignInView.vue` and `src/views/SignUpView.vue`
- [x] **Step 4: Switch the auth strings** to the old app's in `src/i18n/locales/en/auth.json` and `src/i18n/locales/hi/auth.json`
- [x] **Step 5: Run them to verify they pass**

Run: `npm run e2e -- e2e/auth.spec.ts --project chromium`
Expected: PASS, with each state's ratios in the report

- [x] **Step 6: Commit**

```bash
git add src/views/SignInView.vue src/views/SignUpView.vue src/i18n/locales/en/auth.json src/i18n/locales/hi/auth.json e2e/auth.spec.ts design/modernize/auth/compare.json
git commit -m "feat(ui): the old app's sign-in and sign-up screens"
```

### Task 3: Profile

**Files:**
- Modify: `src/views/ProfileView.vue`
- Modify: `src/i18n/locales/en/profile.json`
- Modify: `src/i18n/locales/hi/profile.json`
- Modify: `e2e/profile.spec.ts`
- Modify: `design/modernize/profile/compare.json`

**Interfaces:**
- Consumes: existing `ProfileView` script, the labels and session stores, unchanged; the old app's profile references in `design/modernize/profile/refs/`.
- Produces: the profile screen in the old `Profile.vue` style.

**Spec:**
- §4.3: "Each area ports the old component's markup structure and CSS into the new component, keeping the new script"
- §4.2: "A state the old app can't show (a new feature, or an error it never surfaced) has no old reference: its reference is the restyled new app, approved by the developer at that screen's checkpoint, as today."

**Tags:** `screen`, `failure-paths`, `security`

**Knowledge:** `features/profile-and-labels: the profile screen follows the old app's Profile, with its wording`

**Acceptance:**
- Given `profile`, `profile-editing`, `profile-hi` and a new `profile-dark` state (the `profile` setup with `theme: 'dark'`, added to `design/modernize/profile/compare.json`), when compared with the old app's references, then each is within `10%` at `390` and `5%` at `1280`, or listed with its reason.
- Given `profile-label-error`, which the old app can't show, then it is drawn in the old profile's field and message style and captured for the developer's approval.
- Given an account with no photo, then the avatar shows `mdi-face-man` (`@mdi/font` 7 has no `mdi-face`), as the profile tab does; given one with an `https` photo, the photo shows.
- Given the profile screen, then its labels, buttons and messages are the old app's, in `en` and `hi`, from `profile.json`.
- Given a label name that fails validation, or a rename that fails, then the typed name stays and the message shows (the existing cases keep passing with the old copy).

- [x] **Step 1: Write the failing tests** for each Acceptance case, in `e2e/profile.spec.ts`
- [x] **Step 2: Run them to verify they fail**

Run: `npm run e2e -- e2e/profile.spec.ts --project chromium`
Expected: FAIL on the copy, the avatar icon and the new `profile-dark` state.

- [x] **Step 3: Port the old profile markup and CSS** into `src/views/ProfileView.vue`
- [x] **Step 4: Switch the profile strings** to the old app's in `src/i18n/locales/en/profile.json` and `src/i18n/locales/hi/profile.json`
- [x] **Step 5: Run them to verify they pass**

Run: `npm run e2e -- e2e/profile.spec.ts --project chromium`
Expected: PASS, with each state's ratios in the report

- [x] **Step 6: Commit**

```bash
git add src/views/ProfileView.vue src/i18n/locales/en/profile.json src/i18n/locales/hi/profile.json e2e/profile.spec.ts design/modernize/profile/compare.json
git commit -m "feat(ui): the old app's profile screen"
```

### Task 4: Calendar

**Files:**
- Modify: `src/views/CalendarView.vue`
- Modify: `src/components/calendar/TaskDetailsDialog.vue`
- Modify: `src/i18n/locales/en/calendar.json`
- Modify: `src/i18n/locales/hi/calendar.json`
- Modify: `e2e/calendar.spec.ts`
- Modify: `design/modernize/calendar/compare.json`

**Interfaces:**
- Consumes: existing `CalendarView` script and the tasks store, unchanged; the old app's calendar references in `design/modernize/calendar/refs/`.
- Produces: the calendar in the old `Calendar.vue` style, and the task details dialog in the old calendar's event card style.

**Spec:**
- §4.3: "Each area ports the old component's markup structure and CSS into the new component, keeping the new script"
- §6: "Calendar task details dialog | the old calendar's event card"

**Tags:** `screen`, `failure-paths`

**Knowledge:** `features/calendar: the calendar follows the old app's Calendar, and its task details dialog the old event card`

**Acceptance:**
- Given `calendar-month`, `calendar-week`, `calendar-day`, `calendar-hi` and a new `calendar-dark` state (the `calendar-month` setup with `theme: 'dark'`, added to `design/modernize/calendar/compare.json`), when compared with the old app's references, then each is within `10%` at `390` and `5%` at `1280`, or listed with its reason.
- Given `calendar-details`, which the old app can't show, then the dialog uses the old calendar event's colours, type and spacing, and is captured for the developer's approval.
- Given the calendar, then its labels, buttons and messages are the old app's, in `en` and `hi`, from `calendar.json`.
- Given an event, then it shows in its task's first label colour (passed through `safeColor`), as the old calendar's events did.
- Given the existing move-and-add and details tests in `e2e/calendar.spec.ts`, then they pass, with only copy and markup-bound selectors changed.

- [x] **Step 1: Write the failing tests** for each Acceptance case, in `e2e/calendar.spec.ts`
- [x] **Step 2: Run them to verify they fail**

Run: `npm run e2e -- e2e/calendar.spec.ts --project chromium`
Expected: FAIL on the copy and the new `calendar-dark` state.

- [x] **Step 3: Port the old calendar markup and CSS** into `src/views/CalendarView.vue`, and the old event card's style into `src/components/calendar/TaskDetailsDialog.vue`
- [x] **Step 4: Switch the calendar strings** to the old app's in `src/i18n/locales/en/calendar.json` and `src/i18n/locales/hi/calendar.json`
- [x] **Step 5: Run them to verify they pass**

Run: `npm run e2e -- e2e/calendar.spec.ts --project chromium`
Expected: PASS, with each state's ratios in the report

- [x] **Step 6: Commit**

```bash
git add src/views/CalendarView.vue src/components/calendar/TaskDetailsDialog.vue src/i18n/locales/en/calendar.json src/i18n/locales/hi/calendar.json e2e/calendar.spec.ts design/modernize/calendar/compare.json
git commit -m "feat(ui): the old app's calendar"
```

### Task 5: Notifications

**Files:**
- Modify: `src/views/NotificationsView.vue`
- Modify: `src/i18n/locales/en/notifications.json`
- Modify: `src/i18n/locales/hi/notifications.json`
- Modify: `e2e/notifications.spec.ts`
- Modify: `design/modernize/notifications/compare.json`

**Interfaces:**
- Consumes: existing `NotificationsView` script, the notifications store and `src/pwa/useMessaging.ts`, unchanged; the old app's notifications references in `design/modernize/notifications/refs/`.
- Produces: the notifications screen in the old `Notification.vue` style.

**Spec:**
- §4.3: "Each area ports the old component's markup structure and CSS into the new component, keeping the new script"
- §4.2: "A state the old app can't show (a new feature, or an error it never surfaced) has no old reference: its reference is the restyled new app, approved by the developer at that screen's checkpoint, as today."

**Tags:** `screen`, `failure-paths`

**Knowledge:** `features/notifications: the notifications screen follows the old app's Notification, with its wording`

**Acceptance:**
- Given `notifications-empty`, `notifications-list`, `notifications-hi` and a new `notifications-dark` state (the `notifications-list` setup with `theme: 'dark'`, added to `design/modernize/notifications/compare.json`), when compared with the old app's references, then each is within `10%` at `390` and `5%` at `1280`, or listed with its reason.
- Given `notifications-unsupported`, which the old app can't show, then it is drawn in the old screen's empty-card style and captured for the developer's approval.
- Given the screen, then its labels, buttons and messages are the old app's, in `en` and `hi`, from `notifications.json`.
- Given a notification whose old `timestamp` text can't be parsed, then it shows with no time, as today (`domain/legacy-documents`).
- Given a delete that fails, then the notification stays in the list and the failure shows (the existing case keeps passing with the old copy).

- [x] **Step 1: Write the failing tests** for each Acceptance case, in `e2e/notifications.spec.ts`
- [x] **Step 2: Run them to verify they fail**

Run: `npm run e2e -- e2e/notifications.spec.ts --project chromium`
Expected: FAIL on the copy and the new `notifications-dark` state.

- [x] **Step 3: Port the old notifications markup and CSS** into `src/views/NotificationsView.vue`
- [x] **Step 4: Switch the notifications strings** to the old app's in `src/i18n/locales/en/notifications.json` and `src/i18n/locales/hi/notifications.json`
- [x] **Step 5: Run them to verify they pass**

Run: `npm run e2e -- e2e/notifications.spec.ts --project chromium`
Expected: PASS, with each state's ratios in the report

- [x] **Step 6: Commit**

```bash
git add src/views/NotificationsView.vue src/i18n/locales/en/notifications.json src/i18n/locales/hi/notifications.json e2e/notifications.spec.ts design/modernize/notifications/compare.json
git commit -m "feat(ui): the old app's notifications screen"
```
