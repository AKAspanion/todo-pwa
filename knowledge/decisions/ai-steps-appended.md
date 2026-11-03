---
type: Decision
title: Suggested steps are added after the checklist's items, at most eight at a time
description: "Suggest steps" appends up to eight new checklist items after the existing ones, skipping any that repeat an item, never replacing what the person wrote, with Undo.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-03T08:40:00Z
---

# Suggested steps are added after the checklist's items, at most eight at a time

## Context

Part B2 of the AI features ([decisions/ai-features-roadmap](ai-features-roadmap.md)) breaks a task into steps, filling
the checklist the usability roadmap adds to tasks (at most `CHECKLIST_MAX_ITEMS = 50` items of up to
`CHECKLIST_TEXT_MAX = 200` characters, kept in the order they were added).

## Decision

The developer decided on 2026-11-03 that:

- Suggested steps are added after any items already in the checklist, never replacing them; a step whose text matches
  an existing item, ignoring case, is skipped; the checklist never goes past 50. Undo puts the checklist back as it
  was, as the assists' rewrites do ([decisions/ai-assists-on-request](ai-assists-on-request.md)).
- One press suggests at most `STEPS_MAX = 8` steps, so the answer stays a checklist rather than an essay.

## Consequences

- Pressing again adds more steps rather than replacing the first ones; the person removes what they don't want with
  the checklist editor's remove buttons.

## Sources

- `docs/specs/2026-11-03-ai-steps.md`
