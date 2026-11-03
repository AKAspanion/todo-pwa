---
type: Decision
title: Labels stay create-only
description: Users create labels but don't rename, recolour or delete them; the app needs no edit or delete for labels.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-03T04:18:47Z
verified: human:panditankit1995@gmail.com
---

# Labels stay create-only

## Context

`src/services/labels.ts` only creates labels, while `firestore.rules` would allow an owner to update and delete
them ([questions/label-edit-delete](../questions/label-edit-delete.md)).

## Decision

The developer decided on 2026-11-03 that renaming, recolouring and deleting labels isn't needed.

## Consequences

- The profile screen keeps creating labels only ([features/profile-and-labels](../features/profile-and-labels.md)).
- The update and delete rules on `types` stay as they are; nothing in the app uses them.

## Sources

- `src/services/labels.ts`
- `firestore.rules`
- `src/views/ProfileView.vue`
