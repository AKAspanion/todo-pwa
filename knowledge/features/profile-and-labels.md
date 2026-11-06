---
type: Feature
title: Profile and labels
description: The profile screen — the user's name and photo, editing the display name, and creating labels with a name and colour.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
verified: human:panditankit1995@gmail.com
---

# Profile and labels

## What it does

Shows the signed-in user's photo (or initials), name and email; edits the display name; lists the user's
labels and creates new ones with a name and a colour. Labels are create-only by decision:
[decisions/labels-create-only](../decisions/labels-create-only.md).

## Screens and routes

`/profile`: `src/views/ProfileView.vue`, drawn and worded like the old Profile; with no photo the avatar is
`mdi-face-man`.

## Rules

- The display name is saved trimmed (`updateDisplayName` in `src/services/auth.ts`). Firebase reports no
  auth change for a profile update, so the screen updates the session's copy itself.
- A label name is 1–`LABEL_NAME_MAX` characters after trimming, counted as code points; a colour is required
  (`createLabel` in `src/services/labels.ts`, spec D15). The colour picker starts at `DEFAULT_LABEL_COLOR`.
- The photo is shown only when its URL is https (`httpsPhotoUrl` in `src/lib/photo.ts`), since anyone can set the account's photo URL.
- A pencil beside the name edits it, and one on the avatar's lower right opens a dialog for the photo's link
  (`src/components/profile/PhotoDialog.vue`): only an https link is saved, trimmed, since only one is shown; an empty
  link removes the photo, sent to Firebase as an empty string because the Auth API refuses null (`updatePhotoUrl` in
  `src/services/auth.ts`). A failed save keeps the dialog and the link as typed. The name pencil is `color="white"`:
  Vuetify's buttons default to the primary colour, which beat a `text-white` class and hid it on the blue band.
- An Account card below the labels holds a link to the privacy policy ([features/legal-pages](legal-pages.md)), Sign
  out (the menu's flow, shared through `src/composables/useSignOut.ts`) and
  Delete account ([features/account-deletion](account-deletion.md)); Profile also picks up Google's re-confirmation
  redirect on load (`ProfileView.vue`).
- Saves never time out ([decisions/saves-never-time-out](../decisions/saves-never-time-out.md)).

## History

- 2026-11-06: the name pencil was invisible (primary on the blue band), the photo couldn't be changed and signing out was only in the menu; now the pencil is white, a pencil on the avatar edits the photo link and the Account card has Sign out, because the developer asked.

- 2026-11-05: Profile ended at the labels; now an Account card with the privacy link and Delete account follows, because Play requires an in-app way to delete an account. See [decisions/account-deletion-for-play](../decisions/account-deletion-for-play.md).
- 2026-11-04: was the rewrite's layout and text; now the old Profile's, because the app is restored to the old look. See [decisions/restore-original-design](../decisions/restore-original-design.md).

## Sources

- `src/components/profile/PhotoDialog.vue`
- `src/components/profile/AccountSection.vue`
- `src/composables/useSignOut.ts`
- `src/lib/photo.ts`

- `src/views/ProfileView.vue`
- `src/services/auth.ts`
- `src/services/labels.ts`
- `src/stores/labels.ts`
