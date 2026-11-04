---
type: Feature
title: Sign in and sign up
description: Email and password or Google; signed-out visitors are sent to sign in and come back to the page they asked for.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
verified: human:panditankit1995@gmail.com
---

# Sign in and sign up

## What it does

A visitor signs up or signs in with an email and password, or with Google. Facebook sign-in was removed
([decisions/facebook-sign-in-removed](../decisions/facebook-sign-in-removed.md)). A signed-out visit to any
app screen goes to sign-in first and returns to that screen afterwards. Signing out from the menu
(`src/components/layout/AppMenu.vue`) removes this device's push registration first, then clears every
per-user store. How sessions and tokens work: [security/auth](../security/auth.md).

## Screens and routes

- `/signin`: `src/views/SignInView.vue`; `/signup`: `src/views/SignUpView.vue`. Each links to the other,
  keeping the `redirect` query.
- Both screens are drawn and worded like the old Signin and Signup; failures show in a snackbar. The
  show-password eye and the password hint (which names the letter-and-digit rule the app applies) are the
  rewrite's, kept in the old style.
- The language can be switched on both screens; the menu and bottom navigation are hidden on them.

## Rules

- Sign-up accepts any email address Firebase accepts, and a password of at least `PASSWORD_MIN_LENGTH`
  characters with a letter and a digit (`isStrongPassword` in `src/lib/authForm.ts`, spec D14).
- Google opens a popup; where popups are blocked or unsupported (some installed PWAs) it redirects instead,
  and the sign-in screen picks the result up when the page comes back (`signInWithGoogle` and
  `consumeRedirectResult` in `src/services/auth.ts`).
- After signing in, the app goes to the `redirect` query only when it is an in-app path that isn't sign-in or
  sign-up; anything else goes to `/home` (`safeRedirect` in `src/router/guard.ts`).
- Errors are shown from Firebase's error code, translated (`authErrorKey` in `src/lib/authForm.ts`).

## History

- 2026-11-04: was the rewrite's layout and text; now the old Signin's and Signup's, with the show-password eye kept, because the app is restored to the old look. See [decisions/restore-original-design](../decisions/restore-original-design.md).

## Sources

- `src/views/SignInView.vue`
- `src/views/SignUpView.vue`
- `src/components/layout/AppMenu.vue`
- `src/services/auth.ts`
- `src/lib/authForm.ts`
- `src/router/guard.ts`
- `src/stores/session.ts`
