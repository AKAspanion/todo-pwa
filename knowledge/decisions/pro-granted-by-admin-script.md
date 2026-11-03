---
type: Decision
title: Pro is turned on by hand with an admin script until payments exist
description: Until the payments part is built, an account gets the paid AI features only when someone runs an admin script for it; no payment code comes before then.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-03T05:05:25Z
---

# Pro is turned on by hand with an admin script until payments exist

## Context

The AI features are meant for a paid plan ("Pro"), but taking payments is a sub-project of its own: Play Billing in
the Android app ([apps/android-twa](../apps/android-twa.md)) and a checkout on the web. The developer wants the AI
features first, with payments later.

## Decision

The developer decided on 2026-11-03 that until payments are built, Pro is granted and revoked per account by hand,
with an admin script run by someone with access to the Firebase project. No payment, checkout or billing code is
written before the payments part. Signed-in users without Pro don't get the AI features.

## Consequences

- Where the Pro flag is stored, and the rule that a client can't set it on itself, are settled in the first AI
  sub-project's spec. The flag has to be one a client can't write, since `firestore.rules` is the only server-side
  check on what a client writes ([project/architecture](../project/architecture.md)).
- When payments are built, they write the same flag the script writes, so the AI features don't change.

## Sources

- `firestore.rules`
