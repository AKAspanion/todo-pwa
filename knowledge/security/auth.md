---
type: Security
title: Authentication
description: Firebase Auth with email and password or Google; the route guard is a convenience, and the Firestore rules are the real check.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
verified: human:panditankit1995@gmail.com
---

# Authentication

## How users sign in

- Firebase Auth, with exactly two providers: email and password, and Google (`src/services/auth.ts`). What
  the screens do is [features/sign-in](../features/sign-in.md).
- Google always uses a redirect: there is no popup anywhere ([decisions/google-sign-in-redirect-only](../decisions/google-sign-in-redirect-only.md)).
  Re-authentication before an account is deleted is by password (`reauthenticateWithCredential`) or a Google
  redirect (`reauthenticateWithRedirect`) in `src/services/account.ts`, through the same-origin handler below;
  `consumeRedirectResult` reports which operation came back (`signIn`, `reauthenticate` or `link`), so a
  re-confirmation is never taken for a sign-in. A redirect's result is kept in
  the auth handler's storage at `https://<authDomain>/__/auth/handler`; browsers that block third-party storage
  drop it when that origin differs from the page's. So on each of the app's Hosting domains the app uses its
  own host as the auth domain (`pickAuthDomain` in `src/lib/authDomain.ts`, from
  `VITE_FIREBASE_AUTH_DOMAINS`), and `VITE_FIREBASE_AUTH_DOMAIN` anywhere else (review I5). Each such domain
  must be an authorized domain and redirect URI in the console (`README.md`, "Deploy & CI setup").
- The CSP and `X-Frame-Options` are left off `/__/**`, so the app can frame its own `/__/auth/iframe`
  (`firebase.json`).

## Tokens and sessions

- Firebase keeps the session and ID token; the app never handles a token itself. `waitForAuthReady` waits for
  Firebase to restore the last session before the guard decides.
- `authGuard` (`src/router/guard.ts`) sends a signed-out visit to a `requireAuth` route to `/signin` with a
  `redirect` query, and a signed-in visit to sign-in or sign-up onwards. `safeRedirect` accepts only an in-app
  path no longer than `MAX_REDIRECT_LENGTH`; `//host`, `/\host` and the like go to `/home`.
- The guard keeps two sets (`src/router/guard.ts`): `safeRedirect` never returns `/signin`, `/signup` or
  `/forgot-password`, and a signed-in visit is sent away only from `/signin` and `/signup`. So a signed-in visitor can
  open `/forgot-password`, and `/reset-password` is open to everyone ([features/password-reset](../features/password-reset.md)),
  as is `/verify-email` ([features/email-verification](../features/email-verification.md)).
- Nothing reads `emailVerified` to allow or refuse anything: verification is a reminder
  ([decisions/email-verification-reminder](../decisions/email-verification-reminder.md)).
  The sets compare paths exactly ([findings/guard-compares-paths-exactly](../findings/guard-compares-paths-exactly.md)).
- A reset code (`oobCode`), email or password is never logged. Resetting the password of the account signed in on a
  device makes Firebase revoke that account's refresh tokens, so its sessions, on this device and others, end at their
  next token refresh, within the hour; the Firestore rules don't check revocation, so the current ID token works until
  then.
- The guard only decides which screen shows. What a user can read or write is decided by `firestore.rules`
  ([security/roles](roles.md)).
- When Firebase reports another user, or none, the session store clears every per-user store so the next
  account never sees the last one's data (`src/stores/session.ts`, spec D13). Sign-out runs its hooks first,
  such as deleting this device's push registration.

## History

- 2026-11-05: the guard kept one set of signed-out screens; now it keeps two, so a signed-in visitor can open `/forgot-password`, because a reset link opened on a signed-in device must be able to ask for a new one. See [decisions/password-reset](../decisions/password-reset.md).
- 2026-11-05: Google used a popup and fell back to a redirect; now it is a redirect only, and re-authentication before deleting an account is by password or Google redirect, because the Play app's Trusted Web Activity can't show a popup. See [decisions/google-sign-in-redirect-only](../decisions/google-sign-in-redirect-only.md).

## Sources

- `src/views/VerifyEmailView.vue`
- `src/services/auth.ts`
- `src/services/account.ts`
- `src/lib/authDomain.ts`
- `src/router/guard.ts`
- `src/stores/session.ts`
- `firebase.json`
- `firestore.rules`
- `README.md`
