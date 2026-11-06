---
type: Design Tokens
title: Design tokens
description: Vuetify's md2 blueprint with the old app's Vuetify 2 light and dark colours; the light primary and the web manifest share one colour.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
verified: human:panditankit1995@gmail.com
---

# Design tokens

## Colours

- Vuetify is created with the `md2` blueprint, so it draws Material Design 2 as the old app did
  ([decisions/restore-original-design](../decisions/restore-original-design.md)). One default is the app's own, merged
  over md2's: every `v-switch` is `inset`, its thumb inside the track, since md2's thumb overhangs the track's start
  and was clipped where a row cut it off.
- A button that should look usable doesn't take `secondary`: Vuetify 2's secondary is dark grey (`#424242`), which on
  the dark theme's surface reads as disabled.
- Both themes use Vuetify 2.6.10's presets (`createVuetify` in `src/plugins/vuetify.ts`). The light primary is
  `THEME_COLOR = '#1976D2'`, with `BACKGROUND_COLOR = '#FAFAFA'` exported beside it, repeated as `theme_color`
  and `background_color` in the manifest in `vite.config.ts`. The dark theme's primary is `#2196F3` and its
  accent `#FF4081`, because that is what the old app's dark screens showed. Which theme shows is
  [features/language-and-theme](../features/language-and-theme.md).
- Label colours are the user's own, passed through `safeColor` (`src/components/tasks/labels.ts`) before
  they are used in a style.

## Spacing and radius

The old app's: its app-wide CSS is carried over into `src/assets/style.css`, which `src/plugins/vuetify.ts`
imports.

## Typography

Vuetify 2's look under the md2 blueprint, with Material Design Icons from `@mdi/font` (imported in
`src/plugins/vuetify.ts`).

## History

- 2026-11-06: switches were md2's, the thumb overhanging the track; now every switch is inset by default, because the developer found the menu's, add task's and notifications' switches badly drawn.

- 2026-11-04: was Vuetify 4's defaults with one primary, `#1976D2`, in both themes; now the md2 blueprint with
  Vuetify 2.6.10's light and dark presets (dark primary `#2196F3`), because the app is restored to the old look.
  See [decisions/restore-original-design](../decisions/restore-original-design.md).

## Sources

- `src/plugins/vuetify.ts`
- `vite.config.ts`
- `src/components/tasks/labels.ts`
- `src/assets/style.css`
- `docs/specs/2026-11-02-modernize-and-fix.md`
- `docs/specs/2026-11-04-restore-original-design.md`
