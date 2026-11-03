---
type: Feature
title: Language and theme
description: English or Hindi, light or dark, each remembered on the device under the old app's storage keys.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
verified: human:panditankit1995@gmail.com
---

# Language and theme

## What it does

The user picks English or Hindi and a light or dark theme from the menu (and the language on the sign-in and
sign-up screens). Both are remembered per device, not per account, and survive sign-out.

## Screens and routes

The app menu, `src/components/layout/AppMenu.vue`; the state is `src/stores/ui.ts`.

## Rules

- The language is stored under `LOCALE_STORAGE_KEY` (`src/plugins/i18n.ts`) and the theme under
  `THEME_STORAGE_KEY` (`src/plugins/vuetify.ts`): the keys the old app used, so a returning user keeps both.
- A device that never chose gets English and the dark theme: only a stored `'false'` means light, as in the
  old app (`storedTheme`).
- English is the fallback for any missing Hindi string; every key is meant to exist in both
  ([project/conventions](../project/conventions.md)). Vuetify's own strings come from the app's
  `vuetify.json` locale files through the vue-i18n adapter.
- Blocked storage never breaks the app: the choice applies until the page reloads.

## Sources

- `src/components/layout/AppMenu.vue`
- `src/stores/ui.ts`
- `src/plugins/i18n.ts`
- `src/plugins/vuetify.ts`
- `src/i18n/locales/en/vuetify.json`
