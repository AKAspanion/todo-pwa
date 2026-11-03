---
type: Decision
title: Calendar tasks move by drag or a Move button, and empty space adds one
description: Todo tasks are dragged to another day or time on the calendar (15-minute steps in week and day view, press and hold on touch), with a Move button for the keyboard; clicking empty space opens the add screen with that date.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-03T05:30:53Z
---

# Calendar tasks move by drag or a Move button, and empty space adds one

## Context

The calendar only showed tasks; moving one meant editing it on Home ([features/calendar](../features/calendar.md)).
Part 4 of [decisions/usability-roadmap](usability-roadmap.md) adds moving and adding from the calendar.
Vuetify 4.3's `v-calendar` has no drag and drop of its own, but forwards pointer events per event, day and time
slot (`@mousedown:event`, `@mousemove:time`, `@mouseup:day`), which a drag can be built on.

## Decision

The developer decided on 2026-11-03:

- Clicking empty space opens the add screen with the date filled in, and in a week or day time slot the time,
  rounded down to the half hour. Clicking a day's number still opens that day.
- A drag in month view changes only the date. In week and day view it changes the date and time in `15`-minute
  steps; a task without a time gets one only when dropped on a time slot.
- Mouse drag, and press and hold to pick up on touch, as the board does. The task details dialog gains a Move
  button with date and time fields for keyboard and screen-reader users.
- Only todo tasks move; every move offers Undo.

## Consequences

- No new dependency: the drag is built on `v-calendar`'s forwarded events.
- A move is an ordinary edit, so the task's reminder is worked out again
  ([domain/reminder-schedule](../domain/reminder-schedule.md)).
- The behaviour is specified in `docs/specs/2026-11-03-calendar-move-and-add.md`.

## Sources

- `docs/specs/2026-11-03-calendar-move-and-add.md`
- `src/views/CalendarView.vue`
- `src/components/calendar/TaskDetailsDialog.vue`
