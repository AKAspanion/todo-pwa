---
type: Requirement
title: Deleting an account deletes its AI documents too
description: When account deletion is built, it removes the account's users/{uid} consent document, its aiUsage count and its aiRequests, as well as its tasks, labels, notifications and devices.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-03T05:17:42Z
---

# Deleting an account deletes its AI documents too

## Requirement

Account deletion is planned in the data and account part of the usability roadmap
([decisions/usability-roadmap](../decisions/usability-roadmap.md)). When it is built, deleting an account must also
delete what the AI features keep about it:

- `users/{uid}`, which holds the account's AI consent;
- `aiUsage/{uid}`, its monthly count;
- every `aiRequests` document whose `uid` is the account's;
- `digestSettings/{uid}`, its digest times, zone and language;
- `entitlements/{uid}`, its `paymentRequests`, and the `playTokens` documents that point at it.

Before deleting, it must cancel an active Razorpay subscription through the function, and tell the person that a
Play subscription is cancelled in the Play Store, so no subscription keeps billing an account that no longer exists.

## Why

The AI foundation spec adds these documents
([decisions/ai-requests-via-firestore](../decisions/ai-requests-via-firestore.md),
[decisions/ai-monthly-limit](../decisions/ai-monthly-limit.md)). A deletion that removes only the collections
that existed before would leave consent and usage records behind for an account that no longer exists.

## History

- 2026-11-03: listed the AI documents only; now also the payment documents, and cancelling a subscription before
  deleting, which the payments part adds. See [decisions/payments-without-http](../decisions/payments-without-http.md).
- 2026-11-03: listed three AI documents; now also `digestSettings/{uid}`, which the digests part adds. See
  [decisions/ai-digests-opt-in](../decisions/ai-digests-opt-in.md).

## Sources

- `docs/specs/2026-11-03-ai-foundation.md` (§8)
- `docs/specs/2026-11-03-ai-digests.md` (§8)
- `docs/specs/2026-11-03-payments.md` (§8)
