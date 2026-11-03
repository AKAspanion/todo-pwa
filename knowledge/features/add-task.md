---
type: Feature
title: Add a task
description: The add screen — a title, a Markdown description, a local date and time or indefinite, and any of the user's labels.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
verified: human:panditankit1995@gmail.com
---

# Add a task

## What it does

Creates a task with a title, a Markdown description, a date and time (or "indefinite"), and any number of the
user's labels. A new task is always `todo`.

## Screens and routes

`/add`: `src/views/TaskAddView.vue`, with `src/components/fields/DateField.vue` and `TimeField.vue`.

## Rules

- The title is required and at most 200 characters after trimming, the description at most 5,000
  (`TITLE_MAX`, `DESCRIPTION_MAX` in `src/views/TaskAddView.vue`, the same limits as `firestore.rules`).
- The date and time are taken as the device's local wall-clock time; the store adds `timeZone`, `remindAt`
  and `reminded` ([data/task](../data/task.md)).
- The save never times out or retries; after 15 s the form says it is still saving, and a rejected save keeps
  the input with an error ([decisions/saves-never-time-out](../decisions/saves-never-time-out.md)).

## Sources

- `src/views/TaskAddView.vue`
- `src/components/fields/DateField.vue`
- `src/components/fields/TimeField.vue`
- `src/stores/tasks.ts`
- `src/services/tasks.ts`
- `firestore.rules`
