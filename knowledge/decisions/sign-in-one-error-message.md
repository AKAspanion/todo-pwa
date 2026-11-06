---
type: Decision
title: A wrong password and an unknown email share one sign-in message
description: Sign-in says "Incorrect email or password." for a wrong password, an unknown email and an invalid credential alike, so it can't be used to learn who has an account.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-06T07:05:58Z
verified: human:ankitp@geekyants.com
stated: There is no user record corresponding to this identifier. The user may have been deleted. - update this message to just say “Incorrect email or password.”
stated_via: chat
---

# A wrong password and an unknown email share one sign-in message

## Context

Sign-in showed Firebase's own wording per error code, so `auth/user-not-found` read "There is no user record
corresponding to this identifier. The user may have been deleted." and told anyone whether an email had an account,
unless Firebase's email enumeration protection was on for the live project, which nobody had confirmed
([questions/sign-in-error-enumeration](../questions/sign-in-error-enumeration.md)).

## Decision

The developer decided on 2026-11-06: show just "Incorrect email or password." `auth/wrong-password`,
`auth/user-not-found`, `auth/invalid-credential` and `auth/invalid-login-credentials` all map to the one key
`auth.errors.invalidCredential` (`ERROR_KEYS` in `src/lib/authForm.ts`), whatever the console setting.

## Consequences

- The app no longer depends on email enumeration protection to hide who has an account at sign-in.
- Forgot-password already answered every address alike ([decisions/password-reset](password-reset.md)); sign-up
  still says when an email is in use, as Firebase's `auth/email-already-in-use` does.

## Sources

- `src/lib/authForm.ts`
- `src/i18n/locales/en/auth.json`
- `src/i18n/locales/hi/auth.json`
