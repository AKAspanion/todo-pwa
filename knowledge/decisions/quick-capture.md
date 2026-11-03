---
type: Decision
title: Quick add reads dates with its own English and Hindi parser
description: Quick add on Home reads a fixed set of date and time phrases in English and Hindi with a parser of the app's own; the web app gets icon shortcuts and a share target, the Android app later; keys reach cards.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-03T05:23:49Z
---

# Quick add reads dates with its own English and Hindi parser

## Context

Adding a task meant opening `/add` and setting the date and time with pickers. Part 3 of
[decisions/usability-roadmap](usability-roadmap.md) adds quick add, plain-word dates, keyboard shortcuts, and the
installed app's shortcuts and share target. The app speaks English and Hindi
([features/language-and-theme](../features/language-and-theme.md)).

## Decision

The developer decided on 2026-11-03:

- **Dates in words** are read by a small parser of the app's own, for a fixed set of phrases in English and Hindi.
  It adds no dependency. `chrono-node` was turned down: it reads no Hindi and is large.
- **Shortcuts and share target** go on the installed web app only, through the web manifest. The Android app
  ([apps/android-twa](../apps/android-twa.md)) gets the share target with its next Play release, not in this part.
- **Keyboard shortcuts** are `n` (quick add), `/` (search) and `?` (the list of shortcuts), and on a focused card
  `x` (done or not done), `e` (edit) and `Delete` or `Backspace` (delete, with Undo). Cards are reachable with Tab.
- Quick add sits at the top of the Todo column; the add screen keeps its pickers and doesn't read dates from text.

## Consequences

- Each phrase the parser understands is listed and tested; anything else stays in the title.
- The behaviour is specified in `docs/specs/2026-11-03-quick-capture.md`.

## Sources

- `docs/specs/2026-11-03-quick-capture.md`
- `vite.config.ts`
- `src/views/HomeView.vue`
- `src/views/TaskAddView.vue`
