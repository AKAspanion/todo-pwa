---
type: Decision
title: deleteUserData's first deploy is by hand, from the branch, before it merges
description: Hosting deploys on every push to master and the functions only by a manual run from master, so the developer deploys deleteUserData by hand from the Play Store branch before merging it, and no account is deleted while the function is missing.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-05T07:29:20Z
---

# deleteUserData's first deploy is by hand, from the branch, before it merges

## Context

The Play Store work adds Delete account to the web app and `deleteUserData`, the function that erases a deleted
user's data ([decisions/account-deletion-for-play](account-deletion-for-play.md)). Its spec (D8) says the function
must be live before the web change, so no account is ever deleted while its data stays behind. But the deploy
workflow deploys hosting on every push to `master`, and the functions only from a manual run on `master`
([operations/deploy](../operations/deploy.md), `.github/workflows/deploy.yml`): merging would ship the button first.

## Decision

The developer decided on 2026-11-05: before the branch merges, they deploy the function by hand from it, with their
own credentials (`pnpm exec firebase deploy --only functions:deleteUserData --project spanion-todo`), then merge.
Splitting the function into a PR of its own, and accepting a gap of a few minutes, were turned down.

## Consequences

- It is a one-time step for this first release; later function changes follow the manual run as before.
- The release notes in `packages/android/README.md` give the command.

## Sources

- `.github/workflows/deploy.yml`
- `packages/android/README.md`
- `functions/src/deleteUserData.ts`
- `docs/specs/2026-11-04-play-store-twa.md`
