---
type: Feature
title: Privacy policy, terms of service and account-deletion pages
description: The public /privacy, /terms and /delete-account pages, in English only, reachable signed in or out; the policy and the terms are linked from every auth card and Profile, and sign-up shows an agreement notice.
status: draft
generated:
  by: claude-code/claude-sonnet-5-5
  at: 2026-11-05T09:30:00Z
---

# Privacy policy, terms of service and account-deletion pages

## What it does

Three public pages. Play's listing links to the privacy and deletion pages
([decisions/account-deletion-for-play](../decisions/account-deletion-for-play.md)):

- `/privacy`: the privacy policy. It says who runs the app, what is collected and why, who processes it (Google,
  through Firebase), that the app shows Google AdSense ads ([decisions/adsense-ads](../decisions/adsense-ads.md)),
  what the app doesn't do, how long data is kept, and children. It carries an effective date
  that a change to the policy updates (`PRIVACY_EFFECTIVE` in `src/views/PrivacyView.vue`).
- `/terms`: the terms of service. They describe only what the app does today, are governed by the laws of India,
  and carry their own effective date (`TERMS_EFFECTIVE` in `src/views/TermsView.vue`); the choices behind them are
  [decisions/terms-of-service](../decisions/terms-of-service.md).
- `/delete-account`: how to delete an account: the in-app steps, an email request for someone who can't sign in,
  what is deleted and what is kept. The deletion itself is [features/account-deletion](account-deletion.md).

## Screens and routes

- `/privacy`: `src/views/PrivacyView.vue`; `/terms`: `src/views/TermsView.vue`; `/delete-account`:
  `src/views/DeleteAccountInfoView.vue`; all in `src/router/index.ts`.
- All are public: no `requireAuth`, so a signed-out visitor and Play's reviewer reach them; and no `meta.nav`, so
  the menu and bottom bar are hidden. All use the shared layout `src/components/layout/LegalPage.vue`
  ([design-system/components](../design-system/components.md)).
- They are in English only, whatever language the app is set to, and the layout's root carries `lang="en"`
  so screen readers read them as English ([decisions/legal-pages-english-only](../decisions/legal-pages-english-only.md)).
- Every auth card (sign-in, sign-up, forgot and reset password, verify email) links "Terms of service" and "Privacy
  policy", as does Profile's Account card; the delete dialog links "how it works", to `/delete-account`. Sign-up's
  card instead shows "By creating an account you agree to the Terms of service and Privacy policy.", both linked,
  with no checkbox ([decisions/terms-of-service](../decisions/terms-of-service.md)). The link texts are translated
  like any other string.

## Rules

- What the pages state must stay true to what the app does: the policy's retention paragraph describes the order and
  scope of [features/account-deletion](account-deletion.md) and `deleteUserData` ([apps/functions](../apps/functions.md)).
- The minimum age is the same in the terms and the policy's Children section
  ([decisions/terms-of-service](../decisions/terms-of-service.md)); change both together.
- The root `PRIVACY.md` is now only a pointer to `/privacy`; the policy's text lives in the view.

## History

- 2026-11-18: the pages were the policy and the deletion page, the policy set the minimum age at 13 and said data is kept until the user deletes the account; now `/terms` is a third page, the policy says 18 (effective 18 November 2026) and that data is kept until the account is deleted by the user, or by us if it breaks the terms, and the terms are linked from every auth card and Profile, because the developer asked for a terms page. See [decisions/terms-of-service](../decisions/terms-of-service.md).
- 2026-11-06: the policy promised no ads; now it has an Ads section on Google AdSense, its cookies, consent and opt-out, because the app will show ads. See [decisions/adsense-ads](../decisions/adsense-ads.md).

## Sources

- `src/views/PrivacyView.vue`
- `src/views/TermsView.vue`
- `src/views/DeleteAccountInfoView.vue`
- `src/components/layout/LegalPage.vue`
- `src/router/index.ts`
- `src/views/SignInView.vue`
- `src/views/SignUpView.vue`
- `src/views/ForgotPasswordView.vue`
- `src/views/ResetPasswordView.vue`
- `src/views/VerifyEmailView.vue`
- `src/components/profile/AccountSection.vue`
- `PRIVACY.md`
- `docs/specs/2026-11-04-play-store-twa.md`
