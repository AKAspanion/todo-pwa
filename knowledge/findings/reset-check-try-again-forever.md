---
type: Finding
title: A link check that can never succeed offers Try again forever
description: A failed check on a disabled or deleted account is shown as retryable, so Try again fails with the same answer each time.
generated:
  by: agent:after-finish/claude-sonnet-5-5
  at: 2026-11-05T00:00:00Z
---

# A link check that can never succeed offers Try again forever

## Finding

When `verifyPasswordResetCode` rejects with a code that retrying can't change, such as `auth/user-disabled`, or
`auth/user-not-found` after the account was deleted, the screen treats it like any non-link error: it shows the reason
and offers Try again, which fails with the same answer every time. Only network, too-many-requests and unknown errors
are worth retrying.

## Evidence

`.ga/runs/2026-11-05-password-reset/reviews/final-reviewer.md`: "the snackbar shows the right reason, then 'Try again'
fails with the same answer every time. All non-link errors are treated as retryable." Ledger: "Final review: minor
(deferred): final M4".

## Status

Open: deferred. See [features/password-reset](../features/password-reset.md).

## Sources

- `src/views/ResetPasswordView.vue`
