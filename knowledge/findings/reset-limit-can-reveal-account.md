---
type: Finding
title: The per-account reset limit can reveal that an address has an account
description: Asking repeatedly for one address ends in "Too many attempts" for a known account and in the neutral confirmation for an unknown one, unless email enumeration protection hides it; not confirmed against the live project.
generated:
  by: agent:after-finish/claude-sonnet-5-5
  at: 2026-11-05T00:00:00Z
---

# The per-account reset limit can reveal that an address has an account

## Finding

Firebase's EXCEED_LIMIT error, the limit on reset emails sent to one account, maps to
`auth/too-many-requests`, which `/forgot-password` shows as an error (the decision says too many attempts show as
errors). An unknown address has no account to count against, so it never reaches that limit: repeated requests end in
"Too many attempts" for a known address and in the neutral confirmation for an unknown one, unless the per-IP limit
trips first. It costs an attacker many requests per address, and sign-in already enumerates
([questions/sign-in-error-enumeration](../questions/sign-in-error-enumeration.md)), so it is minor.

## Evidence

`.ga/runs/2026-11-05-password-reset/reviews/final-security-reviewer.md`: "I haven't confirmed whether email
enumeration protection hides this error, so check that against the live project." It comes from the plan's constraint,
not a mistake in the code. Ledger: "Final review: minor (deferred): security M1".

## Status

Open: deferred. Either record that too many attempts can reveal an account as the price of telling the user to wait,
or answer `too-many-requests` with the neutral confirmation too. See [features/password-reset](../features/password-reset.md).

## Sources

- `src/services/auth.ts`
- `src/views/ForgotPasswordView.vue`
