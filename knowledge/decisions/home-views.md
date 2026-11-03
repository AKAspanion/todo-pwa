---
type: Decision
title: Home opens on a Today view with overdue tasks first
description: Home gets Today, Upcoming, Overdue, No date and All views beside the date bar; overdue means dated before today, and undated tasks no longer show on every day.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-03T05:15:40Z
---

# Home opens on a Today view with overdue tasks first

## Context

Home opened on today's date in the date bar, showing that day's todo tasks plus every undated one
([features/task-board](../features/task-board.md)). A todo task from an earlier day was hidden until the user
cleared the day or picked it, so a missed task dropped out of sight. Part 2 of
[decisions/usability-roadmap](usability-roadmap.md) adds views to fix that.

## Decision

The developer decided on 2026-11-03:

- A row of view chips sits above the date bar: **Today**, **Upcoming**, **Overdue**, **No date** and **All**.
  Picking a day in the date bar is a sixth view, that day. Home opens on Today.
- A todo task is **overdue** when its date is before today; the time of day doesn't count, so a task due today
  at 9:00 is still today's at 10:00.
- **Today** shows an Overdue group first, then today's tasks. Undated tasks show only in No date and All, no
  longer on every day.
- Upcoming is the next `7` days after today. The Overdue group appears only in Today. Done tasks show in every
  view, as before. The calendar doesn't change.

## Consequences

- The rule in [features/task-board](../features/task-board.md) that a picked day shows its todo tasks plus the
  indefinite ones changes when this is built: a picked day shows only that day's todo tasks.
- The behaviour is specified in `docs/specs/2026-11-03-home-views.md`.

## Sources

- `docs/specs/2026-11-03-home-views.md`
- `src/views/HomeView.vue`
- `src/components/DateBar.vue`
- `src/stores/tasks.ts`
