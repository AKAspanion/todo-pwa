---
type: Decision
title: Email verification is a reminder, not a gate
description: Email sign-up sends Firebase's verification email and a banner reminds unverified users, as the flash-cards app does; nothing in the app, the rules or the functions reads emailVerified.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-06T07:05:58Z
---

# Email verification is a reminder, not a gate

## Context

Signing up with email and password sent no verification email, and nothing told an unverified user to verify. The
developer asked on 2026-11-06 for it to work "how its done in flash cards", the developer's other app, where
verification is a reminder banner that blocks nothing.

## Decision

- Email sign-up sends Firebase's verification email; a failed send doesn't fail the sign-up.
- While a signed-in user's email is unverified, a banner says so ([features/email-verification](../features/email-verification.md)):
  always on Profile; on Home until dismissed there, then again `DISMISS_DAYS = 7` days later, the dismissal kept in
  the device's localStorage per account; on no other screen. It offers **Resend email** (then a cooldown) and, on
  Home, **Dismiss**. The developer's words, 2026-11-06: "show a dismiss button instead of i have verified button,
  this persistent banner should show up in profile alwasy but in home page show once, after dismiss show in 7 days
  keep dates in localstorage".
- With no "I've verified" button, the banner asks Firebase quietly once per page load whether the email is verified
  now, and goes away once it is.
- It gates nothing: no route, Firestore rule or function reads `emailVerified`.
- The email's link is opened in the app at `/verify-email`, which always offers a way home.

## Consequences

- A dismissal is per device: on another device, or with site data cleared, Home shows the banner again.

- Email accounts made before this, never verified, see the banner too; Google accounts arrive verified and never do.
- Blocking unverified users would be a new decision, with a way through for those existing accounts.

## History

- 2026-11-06: the banner showed on every signed-in screen with Resend and I've verified; now it shows always on Profile and on Home until dismissed for 7 days, with Dismiss in place of I've verified and a quiet check on load, because the developer asked.

## Assumed

From the developer's "No email verification mail going and no banner to verify coming if verification not done - see
how its done in flash cards": that "how its done" includes the reminder-only rule, the resend cooldown and the
continue link home, as flash-cards' own decision has them. The banner shows on every signed-in screen here, unlike
flash-cards, which leaves out its full-height screens: here Home and Profile are full height, so they subtract the
banner's height instead. The quiet check on load is mine, to replace what "I've verified" did.

## Sources

- `src/lib/verifyReminder.ts`
- `src/router/index.ts`

- `src/services/auth.ts`
- `src/stores/session.ts`
- `src/components/layout/VerifyEmailBanner.vue`
- `src/views/VerifyEmailView.vue`
