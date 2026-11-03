---
type: Decision
title: Pro is sold through Play Billing in the Android app and Razorpay on the web
description: The Android app sells Pro only through Google Play Billing; the website sells it through Razorpay subscriptions; prices and plans are set in those providers' dashboards, not in code.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-03T08:00:00Z
---

# Pro is sold through Play Billing in the Android app and Razorpay on the web

## Context

Part G of the AI features ([decisions/ai-features-roadmap](ai-features-roadmap.md)) replaces granting Pro by hand
([decisions/pro-granted-by-admin-script](pro-granted-by-admin-script.md)) with payments. The Android app is a
Trusted Web Activity on the Play Store ([apps/android-twa](../apps/android-twa.md)); Google's guide for TWAs says
Play Billing is required for Play Store apps that sell digital goods, through the Digital Goods and Payment Request
APIs. India also allows an alternative billing system beside Play's, but it needs a registered business, PCI-DSS
compliance and a grievance process. The app speaks English and Hindi and its users are mainly in India.

## Decision

The developer decided on 2026-11-03 that:

- Inside the Android app, Pro is sold only through Google Play Billing. No other checkout is offered there.
- On the website, Pro is sold through Razorpay subscriptions (UPI Autopay, cards, netbanking). Stripe was turned
  down for an India-first product.
- Prices, plans and any trial are set in the Play Console and the Razorpay dashboard; the code names products and
  plans by their ids and shows the prices the providers report.
- Granting Pro by hand stays, for accounts given it free, and payments never take it away.

## Consequences

- The Android project gains Play Billing (android-browser-helper's billing extension), and a new app version.
- Razorpay needs the owner's business KYC, and UPI Autopay turned on by Razorpay's support.
- Part A's rule that non-Pro accounts see no AI changes: they now see a way to get Pro.

## Sources

- `packages/android/source/app/src/main/AndroidManifest.xml`
- `docs/specs/2026-11-03-payments.md`
