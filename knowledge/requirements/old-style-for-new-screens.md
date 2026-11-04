---
type: Requirement
title: New screens and features use the old app's look
description: A feature built after the restyle, such as quick capture, home views, priority and checklists, undo, recurring tasks or data export, borrows the closest pattern of the old app's design, not Material Design 3.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-04T08:52:00Z
---

# New screens and features use the old app's look

## Requirement

The app looks like the old Vue 2 app ([decisions/restore-original-design](../decisions/restore-original-design.md)).
A feature specced on 2026-11-03 and built later must be drawn with the closest old pattern, as the restore spec's §6
lists:

- home views and quick capture: the old task list's toolbar and text field;
- priority and checklist: the old task card's chips and its description block;
- undo: the old snackbar, with its action button;
- recurring tasks, data export and import, account deletion: the old profile and add screens' cards, fields and
  buttons.

Its spec says which pattern it uses, and its screens are compared in the visual harness like the restyled ones.

## Sources

- `docs/specs/2026-11-04-restore-original-design.md`
