---
type: Decision
title: Usability features are built in eight parts, in order
description: Nineteen usability features are grouped into eight parts — board fixes, views, faster capture, calendar, task fields, reminders, recurring tasks, data and account — each with its own spec and plan.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-03T05:04:17Z
---

# Usability features are built in eight parts, in order

## Context

A review of what the app does ([project/overview](../project/overview.md)) turned up nineteen features that would make
it easier to use day to day. Together they touch the task document, `firestore.rules`, the reminder function and the
service worker, which is far more than one plan at this project's pace (five tasks or fewer per plan).

## Decision

The developer agreed on 2026-11-03 to build them as eight parts, in this order. Each part gets its own design, spec
and plan, and is merged before the next part's spec is written:

1. **Board fixes**: the edit form checks the title and description limits; undo after deleting a task or marking
   it done; clearing done tasks.
2. **Views**: an overdue section on home, and Today, Upcoming, Overdue and No date views.
3. **Faster capture**: quick add on home, dates typed in plain words, keyboard shortcuts, the installed app's
   icon shortcuts and share target.
4. **Calendar**: drag a task to another day, click a day to add one there.
5. **Task fields**: priority, and checklists inside a task.
6. **Reminders**: a reminder opens its task and can mark it done; the user chooses how long before a task to be
   reminded; snooze; a count on the app icon.
7. **Recurring tasks**: after the reminders part, because a repeat needs its next reminder.
8. **Data and account**: export and import, a calendar export
   ([decisions/ics-export-client-side](ics-export-client-side.md)). Deleting the account moved to the Play Store
   work ([decisions/account-deletion-for-play](account-deletion-for-play.md)).

Renaming and deleting labels stays out ([decisions/labels-create-only](labels-create-only.md)).

## Consequences

- Part 2 changes a reviewed rule of the home screen: the picked day shows only that day's todo tasks and undated
  ones ([features/task-board](../features/task-board.md)). Its spec has to settle that with the developer.
- Deleting the account is built with the Play Store app, ahead of part 8, because Play requires it
  ([decisions/account-deletion-for-play](account-deletion-for-play.md)).
- Part 7 is the riskiest; its requirements are to be grilled before its spec.

## History

- 2026-11-04: part 8 included deleting the account, possibly moved earlier; now deletion is built with the Play
  Store app and part 8 is export and import only, because Play requires deletion. See
  [Account deletion for Play](account-deletion-for-play.md).

## Sources

- `src/views/HomeView.vue`
- `src/stores/tasks.ts`
- `functions/src/reminders.ts`
- `firestore.rules`
