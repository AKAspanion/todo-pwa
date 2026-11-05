---
type: Open Question
title: Does Google sign-in use a popup first, or a redirect only?
description: Answered — redirect only. The code used to try signInWithPopup first, against the draft decision that every Google step is a redirect; the code was changed to the decision.
generated:
  by: agent:after-finish/claude-sonnet-5-5
  at: 2026-11-05T00:00:00Z
---

# Does Google sign-in use a popup first, or a redirect only?

## Question

`signInWithGoogle` in `src/services/auth.ts` used to try `signInWithPopup` first and redirect only when popups were
unavailable, which [features/sign-in](../features/sign-in.md) also said. The draft
[decisions/google-sign-in-redirect-only](../decisions/google-sign-in-redirect-only.md) says the developer decided
on 2026-11-04 that every Google step is a redirect and the popup code is removed. The two disagree. Which is
right: change the code to the decision, or change the decision to the code?

The code now redirects only, as the decision says.

## Status

Answered: redirect only; the code changes to the decision, not the other way round (the developer, 2026-11-05: Google sign-in still opening a popup is the gap to close). See [decisions/google-sign-in-redirect-only](../decisions/google-sign-in-redirect-only.md).

## Sources

- `src/services/auth.ts`
- [decisions/google-sign-in-redirect-only](../decisions/google-sign-in-redirect-only.md)
