---
type: Decision
title: Task assists run only when pressed, and a rewrite can be undone
description: Suggest labels, Rewrite and Translate each spend a request only when the person presses them; a rewritten or translated description replaces the old one at once, with Undo in the snackbar.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-03T05:40:00Z
---

# Task assists run only when pressed, and a rewrite can be undone

## Context

Part B of the AI features ([decisions/ai-features-roadmap](ai-features-roadmap.md)) adds three assists to the add
and edit forms: suggest labels, rewrite a description, translate a description. Each one is an AI request, and each
request counts against the account's monthly limit ([decisions/ai-monthly-limit](ai-monthly-limit.md)).

## Decision

The developer decided on 2026-11-03 that:

- An assist runs only when the person presses its button. Nothing is sent as they type, so no request is spent
  without their asking. Suggestions running on their own after a title is typed were turned down for that reason.
- A rewritten or translated description replaces the old one at once, and the snackbar offers Undo, which puts the
  old description back. A preview to accept or discard first was turned down as a step too many for a short text.

## Consequences

- The forms need no debounce or background requests for AI.
- An answer that arrives after the person has changed the description again is not applied, so Undo never has to
  restore over their newer typing.

## Sources

- `src/views/TaskAddView.vue`
- `src/components/tasks/TaskEditForm.vue`
