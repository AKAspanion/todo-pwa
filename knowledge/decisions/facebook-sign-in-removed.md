---
type: Decision
status: draft
title: Facebook sign-in is removed
description: Only email and password, and Google, remain; accounts that only ever used Facebook can no longer sign in.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
---

# Facebook sign-in is removed

## Context

The old app offered Facebook, Google and email sign-in. The 2026-11-02 rebuild had to choose which providers to
carry over.

## Decision

Facebook sign-in is removed: no button, provider or code. The developer disables the Facebook provider in the
Firebase console after the deploy (spec §11.1). The spec doesn't record why.

## Consequences

- `src/services/auth.ts` offers exactly email and password, and Google.
- Accounts that only ever signed in with Facebook can no longer sign in.

## Sources

- `docs/specs/2026-11-02-modernize-and-fix.md`
- `src/services/auth.ts`
- `README.md`
