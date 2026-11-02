---
type: Design Tokens
status: draft
title: Design tokens
description: Vuetify's defaults with one app colour, #1976D2, shared by the theme and the web manifest, and a light and a dark theme.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
---

# Design tokens

## Colours

- One theme colour, `THEME_COLOR = '#1976D2'`, and `BACKGROUND_COLOR = '#FAFAFA'` (`src/plugins/vuetify.ts`),
  repeated as `theme_color` and `background_color` in the manifest in `vite.config.ts`. The old app had three
  theme colours and a black splash beside a light loader (spec W3).
- Vuetify's light and dark themes, each with `primary` set to `THEME_COLOR`; the light one also sets
  `background` to `BACKGROUND_COLOR` (`createVuetify` in `src/plugins/vuetify.ts`). Which one shows is
  [features/language-and-theme](../features/language-and-theme.md).
- Label colours are the user's own, passed through `safeColor` (`src/components/tasks/labels.ts`) before
  they are used in a style.

## Spacing and radius

Vuetify's defaults: the rebuild kept to them, with no redesign (spec §10). App-wide CSS is in
`src/assets/style.css`.

## Typography

Vuetify's defaults, with Material Design Icons from `@mdi/font` (imported in `src/plugins/vuetify.ts`).

## Sources

- `src/plugins/vuetify.ts`
- `vite.config.ts`
- `src/components/tasks/labels.ts`
- `src/assets/style.css`
- `docs/specs/2026-11-02-modernize-and-fix.md`
