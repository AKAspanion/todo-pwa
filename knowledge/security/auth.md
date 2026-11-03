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
- Google uses a popup and falls back to a redirect where popups are unavailable. A redirect's result is kept in
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
- The guard only decides which screen shows. What a user can read or write is decided by `firestore.rules`
  ([security/roles](roles.md)).
- When Firebase reports another user, or none, the session store clears every per-user store so the next
  account never sees the last one's data (`src/stores/session.ts`, spec D13). Sign-out runs its hooks first,
  such as deleting this device's push registration.

## Sources

- `src/services/auth.ts`
- `src/lib/authDomain.ts`
- `src/router/guard.ts`
- `src/stores/session.ts`
- `firebase.json`
- `firestore.rules`
- `README.md`
