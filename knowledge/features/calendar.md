---
type: Feature
title: Calendar
description: The user's dated tasks by day, week or month; clicking one opens its details.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
verified: human:panditankit1995@gmail.com
---

# Calendar

## What it does

Shows dated tasks on Vuetify's calendar in day, week or month view, around a selected date that Today brings
back. Clicking a task opens its details: title, when it is due, labels and the description as sanitised
Markdown (spec D16).

## Screens and routes

`/calendar`: `src/views/CalendarView.vue`, with `src/components/calendar/TaskDetailsDialog.vue`.

## Rules

- Only dated tasks appear; indefinite tasks have no day to sit on.
- A task's date and time are handed to the calendar as local `'YYYY-MM-DD HH:mm'` text, never as an instant
  ([domain/local-dates](../domain/local-dates.md)).
- The calendar follows the old Calendar: its dark surfaces are scoped to the calendar's own class in an
  unscoped style block in `src/views/CalendarView.vue`, so every selector there must stay qualified by it. Event
  times use the old format, "8 AM" (`formatCalendarTime` in `src/lib/dates.ts`). The task details dialog is in
  the old event-card style; the old app had no such dialog.
- Weeks start on Sunday, as in the old app. Headings and dates follow the app's language, without English
  ordinals (spec D4). "Today" is recomputed as on the home screen (spec D3).

## History

- 2026-11-04: was Vuetify 4's calendar look and "8:00 AM" times; now the old Calendar's, because the app is restored to the old look. See [decisions/restore-original-design](../decisions/restore-original-design.md).

## Sources

- `src/views/CalendarView.vue`
- `src/components/calendar/TaskDetailsDialog.vue`
- `src/components/MarkdownView.vue`
- `src/lib/dates.ts`
