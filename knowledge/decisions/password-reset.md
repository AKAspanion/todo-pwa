---
type: Decision
title: Email users reset a forgotten password in the app
description: A "Forgot password?" link on sign-in leads to an in-app request screen that always gives the same answer, and Firebase's reset email brings the user back to an in-app screen that applies the sign-up password rule.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-05T12:52:56Z
verified: human:ankitp@geekyants.com
stated: "Plan password reset with my recommended answers? (1) an in-app /reset-password screen with the sign-up password rule, the console's action URL pointed at it; (2) the same neutral confirmation whether or not the email has an account; (3) a Forgot password? link under sign-in's password field opening /forgot-password with the email prefilled; (4) feat/password-reset from master, its own PR — Yes, use them"
stated_via: chat
---

# Email users reset a forgotten password in the app

## Context

Sign-in offers email and password, and Google ([features/sign-in](../features/sign-in.md)), with no way back in
for an email user who forgets their password, so such a user also can't reach Delete account
([questions/password-reset](../questions/password-reset.md)). Firebase can send a reset email and offers its own
hosted page for setting the new password, but that page is English only and accepts any password Firebase's own
minimum allows, weaker than sign-up's rule (`isStrongPassword` in `src/lib/authForm.ts`, spec D14).

## Decision

The developer decided on 2026-11-05:

- **The way in:** a "Forgot password?" link under the password field of sign-in's email form opens a separate
  forgot-password screen (route /forgot-password), with the email already typed carried over, and a link back to
  sign-in.
- **The same answer for every email:** asking for a reset always shows one neutral confirmation, "If an account
  exists for that email, a reset link is on its way.", whether or not the address has an account, so the screen
  can't be used to learn who has one. Too many attempts and a network failure are still shown as errors.
- **The new password is set in the app,** on a reset-password screen (route /reset-password), in both languages
  and drawn like sign-in, with sign-up's rule: at least `PASSWORD_MIN_LENGTH` characters with a letter and a digit.
- **The email's link points at the app:** in the Firebase console, Auth → Templates → Password reset, the action
  URL is set to https://todo.spanion.in/reset-password, a one-time step outside the code.
- Built on its own branch from `master`, with its own merge request.

## Consequences

- The reset email's link only works once the console's action URL is set; until then it opens Firebase's hosted
  page, which still resets the password, under Firebase's weaker rule.
- The sign-in screen's own error wording for an unknown email is a separate matter, still open
  ([questions/sign-in-error-enumeration](../questions/sign-in-error-enumeration.md)).

## Sources

- [questions/password-reset](../questions/password-reset.md)
- `src/services/auth.ts`
- `src/views/SignInView.vue`
- `src/lib/authForm.ts`
- `src/router/index.ts`
