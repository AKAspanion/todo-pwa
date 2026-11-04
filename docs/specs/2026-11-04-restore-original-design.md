# Restore the original design

Date: 2026-11-04 · Status: draft, for review

## 1. Why

The first successful deploy of the rewrite (PR 64, `feat/modernize-stack`) took todo.spanion.in from the Vue 2 /
Vuetify 2 app to the Vue 3 / Vuetify 4 one. The icons, typography, cards and layout all changed, because the
modernize spec allowed "no redesign beyond what Vuetify 4's defaults change" (`2026-11-02-modernize-and-fix.md`
§10), and Vuetify 4's defaults are Material Design 3. Hosting was rolled back to the old build. The developer wants
the new app to look like the old one.

## 2. Goal

The new app looks like the old app (`b8af93e^`, the build live on todo.spanion.in on 2026-11-04) on every screen,
in light and dark, at phone and desktop widths.

What stays as it is in the new app:

- all behaviour: routes, stores, services, validation, i18n, the auth-domain fix, the Firestore rules;
- what the rewrite added to the screens the old app had (the calendar's task details dialog, the error and
  loading states). These are drawn in the old app's visual language: its cards,
  colours, icons, spacing and type, not Material Design 3.

Success: for each screen state in §5, the new app's capture matches the old app's capture in the visual harness, at
`390` and `1280` wide. A difference that's left is listed with its reason in the plan run's record and approved by
the developer at that screen's checkpoint. The existing e2e suite still passes.

## 3. Non-goals

- No change to behaviour, data, rules, routes or copy. A string that differs between the apps keeps the new app's
  wording unless the developer says otherwise per screen.
- No return to Vue 2, Vuetify 2 or the old code.
- No new visual design for anything: where the old app has no counterpart, the new element borrows the closest old
  pattern (§6).
- The features specced on 2026-11-03 and not built (quick capture, home views, priority and checklists, undo,
  recurring tasks, data export and import) aren't part of this work; §6 says how each is drawn when it is built.

## 4. Approach

### 4.1 Global look (first)

- Create Vuetify with the `md2` blueprint (`vuetify/blueprints`): MD2 type scale, corner radius, elevation and
  uppercase buttons, close to Vuetify 2's defaults.
- Theme: the old app's colours. `THEME_COLOR = '#1976D2'` stays (the old app's primary); light and dark surfaces,
  text and card colours are read from the old app's computed styles (§5 captures), not guessed. The default theme
  stays dark when the device never chose, as in the old app and today.
- Icons: `@mdi/font` 7 stays. Where a glyph differs from `@mdi/font` 4 or the old app used another name
  (`mdi-clock` for `mdi-clock-outline`, `mdi-card-text` for `mdi-text`, the profile tab's avatar or `mdi-face` for
  `mdi-account-circle`), the new app uses the old one. Icons only the new app has keep their names.
- App-wide CSS: the old `src/assets/style.css` rules that still apply move into the new one.

### 4.2 References from the old app

- The old code (`b8af93e^`) is built in a throwaway git worktree outside the repository's tracked files. Its
  Firebase setup is pointed at the local Auth and Firestore emulators (`connectAuthEmulator`,
  `useEmulator`), with the same seeded user and data as the e2e fixtures, and its clock frozen at the harness's
  `clock`.
- Each state in §5 is captured from the old app at `390` and `1280`, light by default and dark where §5 says so,
  with Hindi where the state is `-hi`. These replace `design/modernize/<screen>/refs/`. The developer reviews the
  new references before any screen is restyled (checkpoint 1).
- A state the old app can't show (a new feature, or an error it never surfaced) has no old reference: its reference
  is the restyled new app, approved by the developer at that screen's checkpoint, as today.
- The worktree and its changes are never committed.

### 4.3 Screens

Each area ports the old component's markup structure and CSS into the new component, keeping the new script:

| Area | Old (`b8af93e^`) | New |
|---|---|---|
| Shell | `App.vue`, `ContainerApp`, `ContainerMain`, `ContainerMenu`, `BarTop`, `BarNav`, `BarDate` | `App.vue`, `layout/AppMenu`, `layout/AppNav`, `layout/AppSnackbar`, `DateBar` |
| Home | `TaskList.vue`, `TaskCard`, `TaskCardGrid` | `HomeView`, `tasks/TaskBoard`, `tasks/TaskColumn`, `tasks/TaskCard`, `tasks/LabelChips`, `tasks/TaskEditForm` |
| Add | `TaskAdd.vue` | `TaskAddView`, `fields/DateField`, `fields/TimeField` |
| Auth | `Signin.vue`, `Signup.vue` | `SignInView`, `SignUpView` |
| Profile | `Profile.vue` | `ProfileView` |
| Calendar | `Calendar.vue` | `CalendarView`, `calendar/TaskDetailsDialog` |
| Notifications | `Notification.vue` | `NotificationsView` |

A screen is done when its comparison passes (§2) and the developer approves it.

## 5. Screen states

The visual harness's states (`design/modernize/<screen>/compare.json`), each at `390` and `1280`:

- auth: `signin-en`, `signin-email-open-en`, `signin-error-en`, `signup-en`, `signin-hi`, `signin-email-open-hi`,
  `signin-error-hi`, `signup-hi`
- home: `home-empty`, `home-loading`, `home-tasks`, `home-editing`, `home-load-error`, `home-hi`
- add: `add-empty`, `add-filled`, `add-error`, `add-hi`
- profile: `profile`, `profile-editing`, `profile-label-error`, `profile-hi`
- calendar: `calendar-month`, `calendar-week`, `calendar-day`, `calendar-details`, `calendar-hi`
- notifications: `notifications-empty`, `notifications-list`, `notifications-unsupported`, `notifications-hi`

Added: one dark state per screen (`<screen>-dark`, from its main state), since the old app defaults to dark.

## 6. What the old app has no counterpart for

Built now, restyled in this work:

| Element | Old pattern it borrows |
|---|---|
| Calendar task details dialog | the old calendar's event card |
| Loading, load-error and save-error states | the old app's `v-progress-linear` and snackbar (`ContainerMain`) |

Specced, not built: each borrows a pattern when it is built, so its spec and plan follow this design.

| Feature | Old pattern it borrows |
|---|---|
| Home views, quick capture | the old task list's toolbar and text field |
| Priority, checklist | the old task card's chips and its description block |
| Undo | the old snackbar, with its action button |
| Recurring tasks, data export and import, account deletion | the old profile and add screens' cards, fields and buttons |

## 7. Testing

- Per screen: its visual comparison against §5's references, run locally (visual tests skip on CI).
- The existing e2e suite, unchanged, proves behaviour didn't move. Selectors that rely on markup (not role or
  label) are updated with the markup, never weakened.
- Accessibility kept from the rewrite: every icon-only button keeps its `aria-label` (modernize spec W5).

## 8. Risks

- **Old app on the emulators.** Its compat SDK supports the emulators, but its task list throws on a task with no
  `type` field (`parseAllTasks` reads `task.type.length`). Both apps are captured on the same seed in the old shape
  (`type` references, `'NA'` dates), which the new app reads too (`domain/legacy-documents`), so the two captures
  differ by style, not content.
- **Fonts.** The harness runs on macOS; the old app may load Roboto differently. The references and captures are
  taken on the same machine.
- **md2 blueprint gaps.** Where the blueprint and Vuetify 2 still differ (density, some component paddings), the
  component's CSS makes up the difference.

## 9. Decisions this replaces

- `2026-11-02-modernize-and-fix.md` §10, "no redesign beyond what Vuetify 4's defaults change", for the look only.
- `design-system/tokens`: "Vuetify's defaults … with no redesign".

Both are replaced by `decisions/restore-original-design`.

## 10. Delivery

Two plans, each within the fast pace's five tasks:

1. Global look, references from the old app, shell, home.
2. Add, auth, profile, calendar, notifications.

Hosting goes live only when both are done and the developer turns the Deploy workflow back on.
