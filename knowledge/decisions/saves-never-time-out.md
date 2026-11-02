---
type: Decision
status: draft
title: Saves never time out or retry
description: A save waits for Firestore's answer however long it takes, because a timeout or a retry risks writing twice; the form says it is still saving after 15 s.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
---

# Saves never time out or retry

## Context

A slow save could be cut short with a timeout or retried, but a retry, or a timeout followed by the user saving
again, risks a duplicate write (Review Focus 1, in the comments of `src/views/TaskAddView.vue` and
`src/components/tasks/TaskBoard.vue`).

## Decision

No save times out or is retried. The form keeps its input in a saving state until the store answers; after
15 s it says it is still saving (`STILL_SAVING_AFTER_MS` in `src/views/TaskAddView.vue` and
`src/views/ProfileView.vue`, `SLOW_SAVE_MS` in `src/components/tasks/TaskBoard.vue`), and a rejected save
shows the error and keeps the input.

## Consequences

Applies to adding a task, editing one on the board, saving the display name and creating a label
(`src/views/ProfileView.vue`). The store changes only after the save succeeds.

## Sources

- `src/views/TaskAddView.vue`
- `src/components/tasks/TaskBoard.vue`
- `src/views/ProfileView.vue`
- `src/stores/tasks.ts`
