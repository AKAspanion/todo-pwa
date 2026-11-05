---
type: Finding
title: errorCode and isOwnerId are duplicated across two functions, and the errorCode copies differ
description: functions/src/deleteUserData.ts copies isOwnerId and errorCode from reminders.ts; the two errorCode copies disagree on numeric gRPC codes, so the same Firestore failure logs differently.
generated:
  by: claude-code/claude-sonnet-5-5
  at: 2026-11-05T09:30:00Z
---

# errorCode and isOwnerId are duplicated across two functions, and the errorCode copies differ

## Finding

`isOwnerId` and `errorCode` exist in both `functions/src/reminders.ts` and `functions/src/deleteUserData.ts`. The
`deleteUserData.ts` `errorCode` maps a numeric gRPC code to its string, the `reminders.ts` one drops it, so a Firestore
failure in the reminder run logs `Error` where the deletion logs `14`. A fix to one copy won't reach the other, and
the project's convention is that Firebase-free rules get their own module.

## Evidence

`.ga/runs/2026-11-04-play-store-twa/reviews/final-reviewer.md`, Minor M2: "The same Firebase-free helpers now live in
two function modules, and their `errorCode` copies have drifted ... The `reminders.ts` `errorCode` drops numeric
gRPC codes, which the new one maps, so a Firestore failure in reminders logs `Error` instead of `14`"
(`functions/src/reminders.ts:85-101`). Ledger: "Final review: minor (deferred)". Suggested fix: one Firebase-free module
used by both functions.

## Status

Open: deferred; logging differs, behaviour doesn't. See [apps/functions](../apps/functions.md) and
[project/conventions](../project/conventions.md).

## Sources

- `functions/src/deleteUserData.ts`
- `functions/src/reminders.ts`
