---
type: Decision
title: A photo gives a list of proposed tasks to tick before any is added
description: Photo to tasks answers with up to ten proposed tasks; the person ticks and edits them, and only the ticked ones are saved.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-03T06:05:00Z
---

# A photo gives a list of proposed tasks to tick before any is added

## Context

A photo of a shopping list, a whiteboard or a notice often holds several tasks, where Fill from text fills one
form ([decisions/ai-features-roadmap](ai-features-roadmap.md)).

## Decision

The developer decided on 2026-11-03 that a photo's answer is a review list of up to ten proposed tasks, each with a
checkbox and an editable title. Nothing is saved until the person presses the button that adds the ticked tasks.
Filling a single form from a photo was turned down: it would lose every task after the first.

## Consequences

- Saving several tasks at once needs a way to show which saved and which didn't, since saves never time out or
  retry ([decisions/saves-never-time-out](saves-never-time-out.md)).

## Sources

- `src/stores/tasks.ts`
