---
type: Finding
title: After resetting one account on a device signed in as another, Sign in lands in the other account
description: The reset screen's Sign in and Ask for a new link go to /signin and /forgot-password, and for a signed-in visitor the guard sends /signin on to /home, which is the signed-in account's.
generated:
  by: agent:after-finish/claude-sonnet-5-5
  at: 2026-11-05T00:00:00Z
---

# After resetting one account on a device signed in as another, Sign in lands in the other account

## Finding

Suppose account B's password is reset while A is signed in on the device. The done state's "Sign in" goes to `/signin`,
which the guard sends a signed-in visitor on from, to A's `/home`, under a screen that just said B's password changed.
On a shared device the user may act in A believing it is B. ("Ask for a new link" goes to `/forgot-password`, which a
signed-in visitor can now open, so only "Sign in" is affected after this branch's guard change. The "Back to home" link
added on 2026-11-06 goes to A's `/home` the same way.) The e2e spec checks
only the link's href on a signed-in device, not where the click ends up.

## Evidence

`.ga/runs/2026-11-05-password-reset/reviews/final-security-reviewer.md`: "'Sign in' then opens A's home, under a screen
that just said B's password changed." Suggested: say who is signed in on the done state and offer a sign-out first.
Ledger: "Final review: minor (deferred): security M3".

## Status

Open: deferred. See [features/password-reset](../features/password-reset.md) and [security/auth](../security/auth.md).

## Sources

- `src/views/ResetPasswordView.vue`
- `src/router/guard.ts`
- `e2e/reset-password.spec.ts`
