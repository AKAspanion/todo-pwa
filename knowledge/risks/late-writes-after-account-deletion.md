---
type: Risk
title: A second signed-in device can write after an account is deleted
description: Accepted risk — another device keeps a valid ID token for up to an hour after the account is deleted, so it can still write tasks, labels or a device document that deleteUserData, already finished, never erases.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-05T08:44:30Z
---

# A second signed-in device can write after an account is deleted

## Risk

Deleting an account removes the Firebase Auth user, and `deleteUserData` then erases the user's documents
([decisions/account-deletion-for-play](../decisions/account-deletion-for-play.md)). A second device that was signed
in keeps its ID token, valid for up to an hour, and `firestore.rules` checks only that token's uid. So that device
can still create tasks, labels or a push device document after the function has finished, and nothing deletes them.
Found by the security review of the Play Store run, 2026-11-05.

## Decision

The developer accepted it on 2026-11-05 rather than adding a second sweep or a rules tombstone: it needs a second
device in use within the hour, and what it writes is readable only with a token for an account that no longer
exists, which expires within the hour.

## If it needs fixing

A delayed second sweep in `deleteUserData`, or a `deletedUsers/{uid}` document the rules check before any write.

## Sources

- `firestore.rules`
- `functions/src/deleteUserData.ts`
