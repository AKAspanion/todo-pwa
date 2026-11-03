---
type: Decision
title: Tasks get a four-level priority that sorts within a day, and a checklist field
description: A task has a priority (none, low, medium, high) that orders tasks within a day before their time, and a checklist of up to 50 items stored in its own field.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-03T05:35:29Z
---

# Tasks get a four-level priority that sorts within a day, and a checklist field

## Context

A task had a title, a description, a date and time and labels ([data/task](../data/task.md)). Part 5 of
[decisions/usability-roadmap](usability-roadmap.md) adds priority and checklists, the first new task fields since
the 2026-11-02 rebuild.

## Decision

The developer decided on 2026-11-03:

- **Priority** has four levels, `none`, `low`, `medium` and `high`, shown as a coloured flag, set on the add
  screen and in the edit form, and filtered by on Home.
- **Order** becomes: undated last; then by date; then by priority, high first; then by time, a task without a time
  ending its group. Within a day, higher-priority tasks come before earlier ones. This replaces "by date, then
  time" (D9 of the 2026-11-02 spec) on the board, in the views and in the Overdue group.
- **Checklists** are a `checklist` field of at most `50` items, each a text of 1–`200` characters and a done flag.
  Ticking an item on the card saves at once; finishing every item doesn't mark the task done. Markdown checkboxes
  in the description were turned down: ticking one would rewrite the description.

## Consequences

- `firestore.rules` gains the two fields. The rules can cap the list's length but not check each item, so the app
  checks items before saving and reads them defensively ([domain/legacy-documents](../domain/legacy-documents.md)).
- Old tasks read as priority `none` and an empty checklist; no migration is needed.
- The order rule in [features/task-board](../features/task-board.md) changes when this is built.
- The behaviour is specified in `docs/specs/2026-11-03-task-priority-and-checklist.md`.

## Sources

- `docs/specs/2026-11-03-task-priority-and-checklist.md`
- `firestore.rules`
- `src/stores/tasks.ts`
- `src/services/legacy.ts`
- `src/types/models.ts`
