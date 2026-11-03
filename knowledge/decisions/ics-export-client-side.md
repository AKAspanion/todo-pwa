---
type: Decision
title: Calendar export is an .ics file made in the browser
description: Tasks reach other calendars as an .ics file the app builds and downloads; there is no subscribable feed, so no function answers HTTP.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-03T05:04:17Z
---

# Calendar export is an .ics file made in the browser

## Context

Getting tasks into Google or Apple Calendar can be a one-off `.ics` file or a feed those calendars subscribe to. A
feed needs a function that answers HTTP behind a secret per-user link, and no function here answers HTTP: a test in
`functions/src/reminders.test.ts` fails on any HTTP or callable export, because the old public `testFunction` leaked
every user's tokens and task titles ([apps/functions](../apps/functions.md)).

## Decision

The developer decided on 2026-11-03 that calendar export is an `.ics` file the web app builds from the user's
tasks and downloads. No subscribable feed, and no HTTP function, is added for it.

## Consequences

- The no-HTTP rule for functions stands, and its test stays as it is.
- An exported file is a snapshot: changes made afterwards reach the other calendar only by exporting again.
- It is built in the data and account part of [decisions/usability-roadmap](usability-roadmap.md).

## Sources

- `functions/src/index.ts`
- `functions/src/reminders.test.ts`
