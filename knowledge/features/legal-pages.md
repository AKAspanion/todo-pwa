---
type: Feature
title: Privacy policy and account-deletion pages
description: The public /privacy and /delete-account pages Google Play asks for, in English only, reachable signed in or out and linked from sign-in, sign-up, Profile and the delete dialog.
status: draft
generated:
  by: claude-code/claude-sonnet-5-5
  at: 2026-11-05T09:30:00Z
---

# Privacy policy and account-deletion pages

## What it does

Two public pages that Play's listing links to ([decisions/account-deletion-for-play](../decisions/account-deletion-for-play.md)):

- `/privacy`: the privacy policy. It says who runs the app, what is collected and why, who processes it (Google,
  through Firebase), that the app shows Google AdSense ads ([decisions/adsense-ads](../decisions/adsense-ads.md)),
  what the app doesn't do, how long data is kept, and children. It carries an effective date
  that a change to the policy updates (`PRIVACY_EFFECTIVE` in `src/views/PrivacyView.vue`).
- `/delete-account`: how to delete an account: the in-app steps, an email request for someone who can't sign in,
  what is deleted and what is kept. The deletion itself is [features/account-deletion](account-deletion.md).

## Screens and routes

- `/privacy`: `src/views/PrivacyView.vue`; `/delete-account`: `src/views/DeleteAccountInfoView.vue`; both in
  `src/router/index.ts`.
- Both are public: no `requireAuth`, so a signed-out visitor and Play's reviewer reach them; and no `meta.nav`, so
  the menu and bottom bar are hidden. Both use the shared layout `src/components/layout/LegalPage.vue`
  ([design-system/components](../design-system/components.md)).
- They are in English only, whatever language the app is set to, and the layout's root carries `lang="en"`
  so screen readers read them as English ([decisions/legal-pages-english-only](../decisions/legal-pages-english-only.md)).
- Linked from the sign-in and sign-up cards ("Privacy policy"), from Profile's Account card, and from the delete
  dialog ("how it works", to `/delete-account`). The link texts are translated like any other string.

## Rules

- What the pages state must stay true to what the app does: the policy's retention paragraph describes the order and
  scope of [features/account-deletion](account-deletion.md) and `deleteUserData` ([apps/functions](../apps/functions.md)).
- The root `PRIVACY.md` is now only a pointer to `/privacy`; the policy's text lives in the view.

## History

- 2026-11-06: the policy promised no ads; now it has an Ads section on Google AdSense, its cookies, consent and opt-out, because the app will show ads. See [decisions/adsense-ads](../decisions/adsense-ads.md).

## Sources

- `src/views/PrivacyView.vue`
- `src/views/DeleteAccountInfoView.vue`
- `src/components/layout/LegalPage.vue`
- `src/router/index.ts`
- `src/views/SignInView.vue`
- `src/views/SignUpView.vue`
- `PRIVACY.md`
- `docs/specs/2026-11-04-play-store-twa.md`
