---
type: Feature
title: Email verification reminder
description: Email sign-up sends a verification email whose link opens /verify-email in the app; a banner on signed-in screens reminds unverified users, with Resend email and I've verified.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-06T07:05:58Z
---

# Email verification reminder

## What it does

Signing up with email and password sends Firebase's verification email (`signUpEmail` in `src/services/auth.ts`). While
the signed-in user's email is unverified, a banner at the top of Profile, and of Home until dismissed there, says so,
naming the address, with **Resend email**, and **Dismiss** on Home. Why it gates nothing: [decisions/email-verification-reminder](../decisions/email-verification-reminder.md).

## Screens and routes

- The banner is `src/components/layout/VerifyEmailBanner.vue`, mounted once in `src/App.vue` above the page. It shows
  on routes whose `meta.verifyBanner` is set (`src/router/index.ts`): `always` on Profile, `dismissible` on Home, while
  `session.user.emailVerified` is false.
- `/verify-email` (`src/views/VerifyEmailView.vue`) applies the link's code and says the email is verified, or that the
  link is used, invalid or expired; a network failure offers Try again. Every outcome offers **Go to home**.
- The console's action URL is one setting for every Auth email, and points at `/reset-password`
  ([decisions/password-reset](../decisions/password-reset.md)); so the route sends `mode=verifyEmail` on to
  `/verify-email` with its query (`beforeEnter` in `src/router/index.ts`).
- Strings are the `verify` namespace, `src/i18n/locales/en/verify.json` and `hi/verify.json`.

## Rules

- The email carries a continue link to `/home` on the page's own origin, so Firebase's own page, when it is the one
  shown, offers a way back. When Firebase refuses that link (`auth/unauthorized-continue-uri`,
  `auth/invalid-continue-uri`), the send runs once more without it (`withContinueHome`); the reset email does the same.
- Resend waits `RESEND_COOLDOWN_SECONDS = 60` between sends, so presses don't run into Firebase's rate limit.
- Dismiss saves the time in localStorage, per account (`rememberDismissal` in `src/lib/verifyReminder.ts`), and Home
  hides the banner for `DISMISS_DAYS = 7` days from it. A missing, unreadable or future time, or blocked storage, shows
  the banner.
- The first time the banner shows on a page load it reloads the user quietly (`reloadEmailVerified`), and once verified
  refreshes the ID token; the session store sets the flag itself, since a reload doesn't call the auth listener, and
  the banner goes. A failed check is logged by its code and shows nothing. An answer for a user who has since changed
  is dropped (`checkEmailVerified` in `src/stores/session.ts`).
- `/verify-email` doesn't mark whoever is signed in as verified: the code may be another account's, so it asks
  Firebase about the signed-in user again.
- Home and Profile size their cards to the viewport (`.old-app-card` in `src/assets/style.css`, and `HomeView`), so
  the banner publishes its height as `--verify-banner-height`, which they subtract.
- The banner is a region named by its text, not a live region: its countdown would be read out every second.
- e2e users made by `createUser` (`e2e/support/emulator.ts`) are verified unless `verified: false`, so the banner
  shows only in `e2e/verify-email.spec.ts`.

## History

- 2026-11-06: the banner showed on every signed-in screen with Resend and I've verified; now on Profile always and on Home until dismissed for 7 days, with Dismiss and a quiet check on load. See [decisions/email-verification-reminder](../decisions/email-verification-reminder.md).

## Sources

- `src/lib/verifyReminder.ts`
- `src/lib/verifyReminder.test.ts`

- `src/services/auth.ts`
- `src/stores/session.ts`
- `src/types/models.ts`
- `src/components/layout/VerifyEmailBanner.vue`
- `src/views/VerifyEmailView.vue`
- `src/App.vue`
- `src/router/index.ts`
- `src/assets/style.css`
- `src/views/HomeView.vue`
- `src/i18n/locales/en/verify.json`
- `src/i18n/locales/hi/verify.json`
- `e2e/support/emulator.ts`
- `e2e/verify-email.spec.ts`
- `src/components/layout/VerifyEmailBanner.test.ts`
- `src/views/VerifyEmailView.test.ts`
