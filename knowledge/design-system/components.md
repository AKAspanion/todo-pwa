---
type: Component Inventory
title: Components
description: The app's own components under src/components, grouped by area, drawn like the old app's, on top of Vuetify's.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
verified: human:panditankit1995@gmail.com
---

# Components

## Components

Everything else is a Vuetify component, auto-imported by `vite-plugin-vuetify` (`vite.config.ts`).

- The old app is the look reference ([decisions/restore-original-design](../decisions/restore-original-design.md)): each component's
  markup and CSS follows its old counterpart.
- `src/components/layout/`: `AppMenu.vue` (the old ContainerMenu and top bar: home's bar, and on every other
  route a plain bar with a back arrow to `/home` and a title chip from `common.bar.*`), `AppNav.vue` (the old
  BarNav, from each route's `meta.nav`; the profile tab shows the user's photo, else `mdi-face-man`, with an
  https-only check in `src/lib/photo.ts`), `AppSnackbar.vue` (the one snackbar, driven by `src/stores/ui.ts`).
- `src/components/tasks/`: the board, after the old TaskCard and TaskCardGrid — `TaskBoard.vue`,
  `TaskColumn.vue` (drag and drop with `vue-draggable-plus`), `TaskCard.vue`, `TaskEditForm.vue`,
  `LabelChips.vue`, and `labels.ts` helpers.
- `src/components/fields/`: `DateField.vue` and `TimeField.vue`, local date and time inputs.
- `src/components/calendar/TaskDetailsDialog.vue` (in the old event-card style; the old app had no dialog);
  `src/components/DateBar.vue` (the old BarDate);
  `src/components/MarkdownView.vue` (sanitised Markdown, [security/data-protection](../security/data-protection.md)).
- `src/directives/focusOnMount.ts`: the `v-focus-on-mount` directive for forms.
- Every icon-only button carries an `aria-label` from the locale files, and card actions are always visible,
  not only on hover, so touch and keyboard reach them (spec W5, D11).

## History

- 2026-11-04: was the rewrite's Material Design 3 look; now each component follows its old Vue 2 counterpart, because the app is restored to the old look. See [decisions/restore-original-design](../decisions/restore-original-design.md).

## Sources

- `src/components/layout/AppMenu.vue`
- `src/components/layout/AppNav.vue`
- `src/components/layout/AppSnackbar.vue`
- `src/components/tasks/TaskBoard.vue`
- `src/components/tasks/TaskColumn.vue`
- `src/components/tasks/TaskCard.vue`
- `src/components/tasks/TaskEditForm.vue`
- `src/components/tasks/LabelChips.vue`
- `src/components/tasks/labels.ts`
- `src/components/fields/DateField.vue`
- `src/components/fields/TimeField.vue`
- `src/components/calendar/TaskDetailsDialog.vue`
- `src/components/DateBar.vue`
- `src/components/MarkdownView.vue`
- `src/lib/photo.ts`
- `src/directives/focusOnMount.ts`
- `src/stores/ui.ts`
- `vite.config.ts`
