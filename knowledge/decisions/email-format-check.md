---
type: Decision
title: Auth forms check an email's shape inline, dot in the domain required
description: Sign-in and sign-up refuse an email that isn't shaped name@site.tld under the field, as the user types, before Firebase sees it; stricter than D14's "any address Firebase accepts".
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-05T06:53:58Z
---

# Auth forms check an email's shape inline, dot in the domain required

## Context

Both auth forms checked only that the email was filled in, and only on submit. A malformed address went to
Firebase, and its `auth/invalid-email` error came back in a snackbar, away from the field. Spec D14
(`docs/specs/2026-11-02-modernize-and-fix.md`) had said sign-up accepts any address Firebase accepts, after the old
app's pattern refused valid addresses such as `.info` ones.

## Decision

- The email field on sign-in and sign-up is checked for its shape by `isEmailAddress` in `src/lib/authForm.ts`:
  no whitespace, exactly one `@`, a non-empty part before it, and a domain with a dot that neither starts nor ends
  it (`name@site.tld`). Nothing limits the top-level domain's length or the characters otherwise, so D14's
  `.info` case still passes.
- This is stricter than D14 on one point: an address with no dot in its domain (`ankit@gmail`) is refused even if
  Firebase would take it. The developer chose this on 2026-11-05 to catch that typo before it reaches Firebase.
- Errors show under the field: both forms validate with Vuetify's `validate-on="invalid-input"`, so a field is
  checked when it loses focus and, once it shows an error, again as the user types; submitting checks every field.
- Firebase's own `auth/invalid-email` stays mapped in `authErrorKey` as the backstop.

## Consequences

Applies to every field of both forms, not only the email: password and confirm-password errors also appear on
leaving the field. How the forms behave overall: [features/sign-in](../features/sign-in.md).

## Sources

- `src/lib/authForm.ts`
- `src/views/SignInView.vue`
- `src/views/SignUpView.vue`
- `docs/specs/2026-11-02-modernize-and-fix.md`
