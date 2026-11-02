---
type: Component Inventory
status: draft
title: Components
description: The app's own components under src/components, grouped by area, on top of Vuetify's.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
---

# Components

## Components

Everything else is a Vuetify component, auto-imported by `vite-plugin-vuetify` (`vite.config.ts`).

- `src/components/layout/`: `AppMenu.vue` (app bar and menu), `AppNav.vue` (bottom navigation, from each
  route's `meta.nav`), `AppSnackbar.vue` (the one snackbar, driven by `src/stores/ui.ts`).
- `src/components/tasks/`: the board — `TaskBoard.vue`, `TaskColumn.vue` (drag and drop with
  `vue-draggable-plus`), `TaskCard.vue`, `TaskEditForm.vue`, `LabelChips.vue`, and `labels.ts` helpers.
- `src/components/fields/`: `DateField.vue` and `TimeField.vue`, local date and time inputs.
- `src/components/calendar/TaskDetailsDialog.vue`; `src/components/DateBar.vue`;
  `src/components/MarkdownView.vue` (sanitised Markdown, [security/data-protection](../security/data-protection.md)).
- `src/directives/focusOnMount.ts`: the `v-focus-on-mount` directive for forms.
- Every icon-only button carries an `aria-label` from the locale files, and card actions are always visible,
  not only on hover, so touch and keyboard reach them (spec W5, D11).

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
- `src/directives/focusOnMount.ts`
- `src/stores/ui.ts`
- `vite.config.ts`
