---
type: Decision
title: Delete account deletes the Firebase user first, then turns push off best-effort
description: Deleting an account deletes the Auth user before running the sign-out hooks, so an offline or failed delete fails fast and leaves this browser's reminders on; the device document is erased by deleteUserData anyway.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-05T08:44:30Z
---

# Delete account deletes the Firebase user first, then turns push off best-effort

## Context

Spec D5 of `docs/specs/2026-11-04-play-store-twa.md` ran the session's sign-out hooks (which delete this browser's
push device document and token) before deleting the Firebase Auth user. The final review of the Play Store run
found two failures in that order: offline, the push hook's Firestore delete never settles, so Delete spins for ever
with Cancel disabled; and a delete that then fails (`auth/requires-recent-login`, a network error) has already
turned this browser's reminders off.

## Decision

The developer decided on 2026-11-05: Delete deletes the Auth user first. Only when that succeeds do the sign-out
hooks run, best-effort: a hook that fails or doesn't settle neither blocks the user nor changes the outcome, and
this browser's push token is still removed. The device document needs no client write, since `deleteUserData`
erases `users/{uid}/devices` ([decisions/account-deletion-for-play](account-deletion-for-play.md)).

## Consequences

- Offline, Delete fails quickly with "Couldn't delete your account. Try again." and nothing changes.
- A failed delete leaves reminders on in this browser.
- The client's device-document delete after deletion is refused by the rules (no signed-in user); that is expected.

## Sources

- `src/stores/session.ts`
- `src/components/profile/DeleteAccountDialog.vue`
- `src/pwa/useMessaging.ts`
- `docs/specs/2026-11-04-play-store-twa.md`
