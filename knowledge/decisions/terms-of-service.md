---
type: Decision
title: A public terms of service page, under Indian law, covering only what is built
description: /terms is public like /privacy; the terms are governed by the laws of India with no court named, describe only what is built, say the app may show ads, set the minimum age at 18 in both legal pages, and sign-up shows an agreement notice with no checkbox.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-18T04:39:48Z
verified: human:ankitp@geekyants.com
stated: 'Ads wording in the terms? A new user via Google on sign-in never sees the notice — what should happen? Minimum age for both pages under India''s DPDP Act? — "May show ads" (Recommended) / Leave it / 18, in both (Recommended)'
stated_via: qa
---

# A public terms of service page, under Indian law, covering only what is built

## Context

The app had a public privacy policy and account-deletion page ([features/legal-pages](../features/legal-pages.md))
but no terms of service. The developer asked on 2026-11-17 for both a privacy policy and a terms page, public.
Paid "Pro" AI features and payments are decided ([decisions/payments-play-and-razorpay](payments-play-and-razorpay.md))
but not built.

## Decision

The developer decided on 2026-11-17:

- The terms are at `/terms`, public: reachable signed in or out, like `/privacy`.
- **Governing law:** the laws of India. No court and no city is named.
- **Scope:** the terms describe only what the app does today. They have no Pro or payments clause; when payments
  ship, a section is added and the effective date changes.
- **Ads:** the terms say the app "may show" Google AdSense ads, true before ads ship and after
  ([decisions/adsense-ads](adsense-ads.md)). The privacy policy's Ads section keeps its own wording.
- **Sign-up:** a notice, "By creating an account you agree to the Terms of service and Privacy policy", with both
  linked, and no checkbox. The other auth cards and Profile's Account card get a "Terms of service" link beside
  "Privacy policy".
- **Google sign-in:** someone new who signs in with Google on the sign-in screen gets an account without seeing the
  notice; no notice is added there. They are covered by the terms' clause that using the app means accepting them.
- **Minimum age:** `18`, in the terms and the privacy policy alike, because under the terms' governing law (India's
  Digital Personal Data Protection Act) anyone under 18 is a child, whose data needs verifiable parental consent.

## Consequences

- Shipping payments means editing the terms in the same change.
- No agreement is recorded per user: the sign-up notice and the "using the app" clause are the only acceptance.
- The privacy policy's Children section changes from 13 to 18, with a new effective date.

## History

- 2026-11-18: the terms described "the free app and its ads", the age limit was the privacy policy's 13, and
  Google sign-in wasn't considered; now "may show" ads, 18 in both pages, and Google sign-in is covered by the
  "using the app" clause, because the final review found ads aren't built, a Google account skips the notice, and
  India's DPDP Act treats under-18s as children. The developer chose each.

## Sources

- `src/router/index.ts`
- `src/views/PrivacyView.vue`
