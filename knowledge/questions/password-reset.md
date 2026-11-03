---
type: Open Question
title: Should email users be able to reset a forgotten password?
description: The app has no "forgot password" flow, so an email user who forgets their password can't sign in, nor reach Delete account; it is outside the agreed usability roadmap.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-03T07:02:55Z
---

# Should email users be able to reset a forgotten password?

## Question

Sign-in offers email and password, and Google ([features/sign-in](../features/sign-in.md)), but no way to reset a
forgotten password: nothing in `src/` calls Firebase's `sendPasswordResetEmail`. An email user who forgets their
password can't get back in, and so can't reach Delete account (part 8 of
[decisions/usability-roadmap](../decisions/usability-roadmap.md)). Should a reset flow be added, and as a ninth part
or within part 8?

Raised on 2026-11-03 while reviewing `docs/specs/2026-11-03-data-and-account.md`; the developer hasn't answered yet.

## Status

Open

## Sources

- `src/services/auth.ts`
- `src/views/SignInView.vue`
- `docs/specs/2026-11-03-data-and-account.md`
