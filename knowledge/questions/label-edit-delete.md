---
type: Open Question
title: Should labels be renamed or deleted?
description: The rules let an owner update and delete labels, but the app only creates them.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
verified: human:panditankit1995@gmail.com
---

# Should labels be renamed or deleted?

## Question

Should users be able to rename, recolour or delete a label? Today only `createLabel` exists
(`src/services/labels.ts`), while `firestore.rules` already allows an owner's update and delete on `types`.

## Why it matters

A label created by mistake stays forever. If deleting is added, tasks keep the dead id; the board already hides
it (spec D6), but nothing would clean `labelIds`.

## Status

Answered: not needed; labels stay create-only. See [labels-create-only](../decisions/labels-create-only.md).

## Sources

- `src/services/labels.ts`
- `firestore.rules`
- `src/views/ProfileView.vue`
