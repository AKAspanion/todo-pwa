---
type: Feature
title: Task board (home)
description: The home screen — Todo and Done lists, narrowed by text, labels and a day, where tasks are checked, dragged, edited and deleted.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
verified: human:panditankit1995@gmail.com
---

# Task board (home)

## What it does

Shows the user's tasks in a Todo and a Done column. A task moves between them by its check button or by
dragging it to the other column; it is edited in place on its card and can be deleted. A search box matches
the title and description, label chips filter, and a date bar picks the day shown.

## Screens and routes

- `/home`: `src/views/HomeView.vue`, with `src/components/DateBar.vue` and the board in
  `src/components/tasks/` (`TaskBoard.vue`, `TaskColumn.vue`, `TaskCard.vue`, `TaskEditForm.vue`,
  `LabelChips.vue`).
- The home screen uses the old app's wording and date formats ("0 tasks today", "TODO", "Today at 9:30 AM",
  "Indefinite task?"), through the old-format helpers in `src/lib/dates.ts` and the locale files
  `src/i18n/locales/*/tasks.json` ([decisions/restore-original-design](../decisions/restore-original-design.md)).
- It loads tasks and labels as soon as Firebase reports the user (`src/stores/tasks.ts`, `src/stores/labels.ts`).

## Rules

- Order: by date, then time (a dated task with no time ends its day), indefinite tasks last. There is no manual
  ordering: dragging within a column doesn't reorder (`compareTasks` in `src/stores/tasks.ts`, spec D9).
  An empty column still accepts a drop.
- Filter (`filter` in `src/stores/tasks.ts`): text matches title or description ignoring case; a task matches
  the labels if it has any one of them, by exact id; the picked day shows todo tasks on that day plus
  indefinite ones, and every done task.
- The date bar shows today and the next 15 days (`DAYS_SHOWN` in `src/components/DateBar.vue`), with a
  calendar for any other day. "Today" moves on at local midnight and when the app becomes visible after the
  day changed (`onDayChange` in `src/lib/dates.ts`, spec D3).
- Saves follow [decisions/saves-never-time-out](../decisions/saves-never-time-out.md): the card keeps the
  edit open until the store answers, says it is still saving after 15 s, and shows the error on failure.
- While loading with nothing to show, skeleton cards are shown, never alongside real cards (spec D10).
- A label id with no label is left off the card (spec D6).

## History

- 2026-11-04: was the rewrite's text and date formats; now the old app's on the home screen, because the developer chose them at the home checkpoint. See [decisions/restore-original-design](../decisions/restore-original-design.md).

## Sources

- `src/views/HomeView.vue`
- `src/components/DateBar.vue`
- `src/components/tasks/TaskBoard.vue`
- `src/components/tasks/TaskColumn.vue`
- `src/components/tasks/TaskCard.vue`
- `src/components/tasks/TaskEditForm.vue`
- `src/components/tasks/LabelChips.vue`
- `src/stores/tasks.ts`
- `src/stores/labels.ts`
- `src/lib/dates.ts`
- `src/i18n/locales/en/tasks.json`
