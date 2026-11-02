---
type: Feature
status: draft
title: Profile and labels
description: The profile screen — the user's name and photo, editing the display name, and creating labels with a name and colour.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
---

# Profile and labels

## What it does

Shows the signed-in user's photo (or initials), name and email; edits the display name; lists the user's
labels and creates new ones with a name and a colour. Labels can't be renamed or deleted here:
[questions/label-edit-delete](../questions/label-edit-delete.md).

## Screens and routes

`/profile`: `src/views/ProfileView.vue`.

## Rules

- The display name is saved trimmed (`updateDisplayName` in `src/services/auth.ts`). Firebase reports no
  auth change for a profile update, so the screen updates the session's copy itself.
- A label name is 1–`LABEL_NAME_MAX` characters after trimming, counted as code points; a colour is required
  (`createLabel` in `src/services/labels.ts`, spec D15). The colour picker starts at `DEFAULT_LABEL_COLOR`.
- The photo is shown only when its URL is https, since anyone can set the account's photo URL.
- Saves never time out ([decisions/saves-never-time-out](../decisions/saves-never-time-out.md)).

## Sources

- `src/views/ProfileView.vue`
- `src/services/auth.ts`
- `src/services/labels.ts`
- `src/stores/labels.ts`
