---
type: Feature
title: Delete account
description: Profile's Delete account — the user confirms who they are by password or a Google redirect, types DELETE, and the Auth user is deleted; deleteUserData then erases their data.
status: draft
generated:
  by: claude-code/claude-sonnet-5-5
  at: 2026-11-05T09:30:00Z
---

# Delete account

## What it does

Play requires an in-app way to delete an account ([decisions/account-deletion-for-play](../decisions/account-deletion-for-play.md)).
Profile's Account card ([features/profile-and-labels](profile-and-labels.md)) opens the dialog
`src/components/profile/DeleteAccountDialog.vue`, which says what goes and links to the public page
([features/legal-pages](legal-pages.md)).

## Rules

- **Confirm who the user is.** The dialog offers what the account has (`accountProviders` in
  `src/services/account.ts`): a password field for a password account, in place, and Google for a Google account,
  by redirect. A wrong password says so and leaves the dialog unconfirmed.
- **Type `DELETE`, exactly, upper case,** before the Delete button is enabled (`CONFIRM_WORD`).
- **Google comes back to Profile.** Re-confirming leaves the page; on Profile's load `consumeRedirectResult` reports a
  `reauthenticate` outcome, and the dialog reopens already confirmed, only when it is the same uid as the signed-in
  user. Google confirming a different account shows the user-mismatch message, not a deletion. If the browser
  restores the page from its back-forward cache with the Google button busy, the button is usable again.
- **What deleting does, in this order** ([decisions/delete-account-deletes-user-first](../decisions/delete-account-deletes-user-first.md)):
  the Auth user is deleted first (`deleteAccount` in `src/stores/session.ts`); then the sign-out hooks run
  best-effort, which removes this browser's push token; then every per-user store is cleared; then the app goes to
  `/signin` with "Your account was deleted.". A failure before the Auth user is gone changes nothing.
- **Failures.** `auth/requires-recent-login` returns the dialog to unconfirmed with a "confirm again" message;
  any other failure, offline included, says "Couldn't delete your account. Try again." and changes nothing.
- **The data is erased by the server:** deleting the Auth user triggers `deleteUserData`
  ([apps/functions](../apps/functions.md)). A second signed-in device can write for up to an hour afterwards
  ([risks/late-writes-after-account-deletion](../risks/late-writes-after-account-deletion.md)).
- Google sign-in is redirect only everywhere ([decisions/google-sign-in-redirect-only](../decisions/google-sign-in-redirect-only.md)).

## Sources

- `src/components/profile/DeleteAccountDialog.vue`
- `src/components/profile/AccountSection.vue`
- `src/views/ProfileView.vue`
- `src/services/account.ts`
- `src/services/auth.ts`
- `src/stores/session.ts`
- `functions/src/deleteUserData.ts`
- `docs/specs/2026-11-04-play-store-twa.md`
