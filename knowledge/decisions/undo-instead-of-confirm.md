---
type: Decision
title: Deletes on the board are undone, not confirmed
description: Deleting a task happens at once and offers Undo instead of asking first; Clear done still asks, deletes only the done tasks the filter shows, and offers Undo too.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-03T05:07:07Z
---

# Deletes on the board are undone, not confirmed

## Context

The board asked "Delete?" on the card before deleting a task, and a deleted task was gone for good. Part 1 of
[decisions/usability-roadmap](usability-roadmap.md) adds undo, which makes the question redundant for one task.

## Decision

The developer decided on 2026-11-03:

- Deleting one task needs no confirmation; the snackbar offers Undo, which restores it under the same id.
- Clear done **deletes** the done tasks, with Undo; it doesn't archive them. Archiving would need a new task field
  and rule changes.
- Clear done asks first, with the count, and covers only the done tasks the column shows under the current search
  and label filter, not every done task.

## Consequences

- A notification's `taskId` still leads to a task that was deleted and then restored.
- An undo lasts as long as its snackbar message; a newer message replaces it.
- The behaviour is specified in `docs/specs/2026-11-03-board-fixes.md` (B2–B5).

## Sources

- `docs/specs/2026-11-03-board-fixes.md`
- `src/components/tasks/TaskCard.vue`
- `src/components/tasks/TaskBoard.vue`
- `src/services/tasks.ts`
