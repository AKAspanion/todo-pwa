---
type: Decision
title: Google sign-in uses a same-origin redirect everywhere, never a popup
description: Signing in, signing up and re-confirming before deleting the account all go to Google by redirect through the page's own /__/auth/handler; the popup path is removed because popups are unreliable in the Android TWA.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-04T09:20:07Z
---

# Google sign-in uses a same-origin redirect everywhere, never a popup

## Context

Google sign-in opened a popup and fell back to a redirect only where popups were blocked or unsupported
([features/sign-in](../features/sign-in.md)). Inside the Android Trusted Web Activity
([decisions/android-app-bubblewrap](android-app-bubblewrap.md)) a popup opens as another tab or window and the
result often doesn't come back to the app. The auth domain is already the page's own host on each Hosting domain
(`pickAuthDomain`, [security/auth](../security/auth.md)), so a redirect stays on one origin.

## Decision

The developer decided on 2026-11-04: every Google step is a redirect (`signInWithRedirect`,
`reauthenticateWithRedirect`) through the same-origin handler, on sign-in, sign-up and the re-confirmation before
deleting the account. The popup code is removed, in the web app as well as the TWA, so there is one path to test.

## Consequences

- The page leaves for Google and comes back; each screen that starts a Google step picks its result up on load.
- Re-confirming before deleting the account comes back to Profile, which reopens the delete dialog already
  confirmed ([decisions/account-deletion-for-play](account-deletion-for-play.md)).
- On a host that isn't one of the app's Hosting domains (such as local development), the redirect uses
  `VITE_FIREBASE_AUTH_DOMAIN` as before.

## Sources

- `src/services/auth.ts`
- `src/lib/authDomain.ts`
- `docs/specs/2026-11-04-play-store-twa.md`
