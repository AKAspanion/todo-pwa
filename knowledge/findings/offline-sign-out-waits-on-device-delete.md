---
type: Finding
title: Offline, sign-out still waits for the device document to be deleted
description: The sign-out hook awaits the device-document delete, which never settles offline, so Sign out from the menu spins until the connection returns, although the push token is now removed at once.
generated:
  by: claude-code/claude-sonnet-5-5
  at: 2026-11-05T09:30:00Z
---

# Offline, sign-out still waits for the device document to be deleted

## Finding

Sign-out runs the push hook (`forgetThisDevice` in `src/pwa/useMessaging.ts`) and waits for it, and the hook waits for
the Firestore delete of this browser's device document. Offline that delete doesn't reject, it waits, so Sign out from
the menu spins until the connection returns. The token is removed first now, so the browser stops receiving this
user's reminders. Account deletion doesn't wait, by decision
([decisions/delete-account-deletes-user-first](../decisions/delete-account-deletes-user-first.md)).

## Evidence

`.ga/runs/2026-11-04-play-store-twa/reviews/final-r1-reviewer.md`, Out-of-Scope Observations: "sign-out still awaits the
push hook, which awaits the device-document `deleteDoc`; offline that never settles, so Sign out from the app menu spins
until the connection returns (same mechanism as I2, on sign-out). Pre-existing and kept on purpose by the brief"
(`src/stores/session.ts:105-106`, `src/pwa/useMessaging.ts:287-293`). Ledger: "Final review: minor (deferred)".

## Status

Open: deferred; unchanged sign-out behaviour.

## Sources

- `src/pwa/useMessaging.ts`
- `src/stores/session.ts`
