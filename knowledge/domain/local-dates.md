---
type: Business Rule
status: draft
title: Dates are local wall-clock values
description: A task's date and time are what the user typed, in the device's time zone, and are never parsed as UTC; only remindAt is an instant.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
---

# Dates are local wall-clock values

## Rule

- A task's `date` (`'YYYY-MM-DD'`) and `time` (`'HH:mm'`) are wall-clock values in the device's local time zone,
  and are never parsed as UTC. The old app parsed them as UTC midnight, so users west of UTC saw every task a
  day early (spec D1).
- The only instant is `remindAt`, computed from the date, the time and the task's IANA `timeZone`
  (`computeRemindAt`, `zonedTimeToUtc` in `src/lib/dates.ts`, spec P6). A task keeps the zone it was entered
  in until its schedule is edited.
- Relative days are "today", "tomorrow" or "yesterday", else the weekday and date, in the app's language
  (`relativeDayLabel`, spec D2). Long dates carry no ordinals (`formatLongDate`, spec D4).
- "Today" is recomputed at local midnight and when the app becomes visible again (`onDayChange`, spec D3).
- Old tasks with no time zone are read as `Asia/Kolkata`
  ([decisions/legacy-tasks-asia-kolkata](../decisions/legacy-tasks-asia-kolkata.md)).

## Where it is enforced

`src/lib/dates.ts`, used by `src/services/tasks.ts`, the views and `src/components/DateBar.vue`; the migration
applies the same rule in `functions/scripts/migrate-legacy.ts`.

## Sources

- `src/lib/dates.ts`
- `src/services/tasks.ts`
- `src/services/legacy.ts`
- `src/components/DateBar.vue`
- `functions/scripts/migrate-legacy.ts`
