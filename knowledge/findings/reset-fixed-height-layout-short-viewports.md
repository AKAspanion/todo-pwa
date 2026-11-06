---
type: Finding
title: The forgot and reset screens use sign-in's fixed-height layout, which may cut off a tall card on short viewports
description: ResetPasswordView and ForgotPasswordView set a 100vh centred layout like sign-in's, not sign-up's scrolling one; the reset card is as tall as sign-up's, so its top may be unreachable on a short screen; not verified.
generated:
  by: agent:after-finish/claude-sonnet-5-5
  at: 2026-11-05T00:00:00Z
---

# The forgot and reset screens use sign-in's fixed-height layout, which may cut off a tall card on short viewports

## Finding

`.reset-container { height: 100vh }` and `.auth-layout { height: 100% }` (in `ResetPasswordView.vue`, and the same in
`ForgotPasswordView.vue`) copy sign-in's layout. The reset card, with two password fields, an account line and field
errors, is as tall as sign-up's, which scrolls (`overflow-y: auto`, `min-height: 100%`). A centred fixed-height card
overflows both ways on a short viewport (a landscape phone, the Play app with the keyboard open), and the top half
can't be scrolled to. Not verified: the reviewer couldn't run the app.

## Evidence

`.ga/runs/2026-11-05-password-reset/reviews/final-reviewer.md`: "The top half then can't be scrolled to: think of a
landscape phone, or the TWA with the keyboard open." Ledger: "Final review: minor (deferred): final M5".

## Status

Open: deferred; check at 390 px wide with a short height. See [features/password-reset](../features/password-reset.md).

## Sources

- `src/views/ResetPasswordView.vue`
- `src/views/ForgotPasswordView.vue`
- `src/views/SignUpView.vue`
