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
  https-only check in `src/lib/photo.ts`), `AppSnackbar.vue` (the one snackbar, driven by `src/stores/ui.ts`), `AppLogo.vue` (the blue double tick as a decorative inline SVG, prop `size`; an exception to the old look, see [decisions/app-logo](../decisions/app-logo.md)), `VerifyEmailBanner.vue` (the verify-email reminder above Home and Profile, see [features/email-verification](../features/email-verification.md)).
- `src/components/layout/LegalPage.vue`: the shared layout of the public `/privacy` and `/delete-account` pages: a back
  button, the heading and the text, with `lang="en"` on its root ([features/legal-pages](../features/legal-pages.md)).
- `src/components/profile/`: Profile's Account card, `AccountSection.vue`; `DeleteAccountDialog.vue`, the
  delete dialog it opens ([features/account-deletion](../features/account-deletion.md)); and `PhotoDialog.vue`, which
  edits the photo's link ([features/profile-and-labels](../features/profile-and-labels.md)).
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

- 2026-11-06: layout had no banner and profile no photo dialog; now `VerifyEmailBanner.vue` and `PhotoDialog.vue`, because of the verify-email reminder and the photo-link edit.
- 2026-11-05: had no legal layout or profile components; now `LegalPage.vue` and `src/components/profile/` exist, because of the Play Store work's public pages and Delete account. See [features/legal-pages](../features/legal-pages.md).
- 2026-11-05: had no logo component; now `AppLogo.vue` draws the blue double tick, because the developer chose the tick as the logo everywhere. See [decisions/app-logo](../decisions/app-logo.md).
- 2026-11-04: was the rewrite's Material Design 3 look; now each component follows its old Vue 2 counterpart, because the app is restored to the old look. See [decisions/restore-original-design](../decisions/restore-original-design.md).

## Sources

- `src/components/layout/AppMenu.vue`
- `src/components/layout/AppNav.vue`
- `src/components/layout/AppSnackbar.vue`
- `src/components/layout/AppLogo.vue`
- `src/components/layout/LegalPage.vue`
- `src/components/profile/AccountSection.vue`
- `src/components/profile/DeleteAccountDialog.vue`
- `src/components/profile/PhotoDialog.vue`
- `src/components/layout/VerifyEmailBanner.vue`
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
