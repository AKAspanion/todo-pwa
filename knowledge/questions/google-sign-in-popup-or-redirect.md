---
type: Open Question
title: Does Google sign-in use a popup first, or a redirect only?
description: The code tries signInWithPopup and redirects only when popups are unavailable, while the draft decision says every Google step is a redirect and the popup code is removed; which is right is the developer's call.
generated:
  by: agent:after-finish/claude-sonnet-5-5
  at: 2026-11-05T00:00:00Z
---

# Does Google sign-in use a popup first, or a redirect only?

## Question

`signInWithGoogle` in `src/services/auth.ts` tries `signInWithPopup` first and redirects only when popups are
unavailable, which is also what [features/sign-in](../features/sign-in.md) says. The draft
[decisions/google-sign-in-redirect-only](../decisions/google-sign-in-redirect-only.md) says the developer decided
on 2026-11-04 that every Google step is a redirect and the popup code is removed. The two disagree. Which is
right: change the code to the decision, or change the decision to the code?

Neither the decision nor the code was edited; this records the conflict. The developer hasn't answered yet.

## Status

Answered: redirect only; the code changes to the decision, not the other way round (the developer, 2026-11-05: Google sign-in still opening a popup is the gap to close). See [decisions/google-sign-in-redirect-only](../decisions/google-sign-in-redirect-only.md).

## Sources

- `src/services/auth.ts`
- [decisions/google-sign-in-redirect-only](../decisions/google-sign-in-redirect-only.md)
