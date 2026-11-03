---
type: Decision
title: Overdue triage only proposes new dates, on request, and is applied from a review list
description: "Sort out" on the overdue tasks asks the AI for a new date in the next 14 days or no date for each, never done or deleted; the person ticks and edits the proposals, and the moves are undone together.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-03T07:05:00Z
---

# Overdue triage only proposes new dates, on request, and is applied from a review list

## Context

Part E of the AI features ([decisions/ai-features-roadmap](ai-features-roadmap.md)) helps with overdue tasks, which
the usability roadmap's home views gather into an Overdue group and view. Board changes there happen at once and
offer Undo rather than asking first (the usability roadmap's undo decision).

## Decision

The developer decided on 2026-11-03 that:

- **On request.** Triage starts only from a "Sort out" button on the overdue tasks, one request per press, as every
  assist does ([decisions/ai-assists-on-request](ai-assists-on-request.md)). Proposing it from the morning digest was
  turned down.
- **Dates only.** The AI may propose, for each overdue task, a new date within the next 14 days or no date, with a
  short reason. It never proposes marking a task done or deleting it, so nothing it proposes can lose a task. To
  spread the load it sees, besides the overdue tasks, only how many tasks each of the next 14 days already has.
- **Reviewed, then undone together.** The proposals open in a review list, every row ticked, each date changeable;
  the ticked ones are moved at once, and one Undo puts every moved task back. Applying with no list was turned down.

## Consequences

- A proposal for a task that changed after the request is skipped at apply time rather than overwriting the change.

## Sources

- `src/views/HomeView.vue`
- `src/stores/tasks.ts`
