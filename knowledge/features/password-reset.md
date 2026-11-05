---
type: Feature
title: Password reset
description: A "Forgot password?" link on sign-in opens /forgot-password, which sends Firebase's reset email; /reset-password sets the new password under sign-up's rule.
generated:
  by: agent:after-finish/claude-sonnet-5-5
  at: 2026-11-05T00:00:00Z
---

# Password reset

The rules (the neutral answer, the in-app screen, sign-up's password rule, the console's action URL) are in
[decisions/password-reset](../decisions/password-reset.md); this concept says how the screens behave.

## Screens and routes

- **Forgot password?** is a link on sign-in's email form ([features/sign-in](sign-in.md)). It opens
  `/forgot-password` (`src/views/ForgotPasswordView.vue`), carrying the typed email in history state, never the URL.
- `/forgot-password` sends Firebase's reset email (`requestPasswordReset` in `src/services/auth.ts`) and shows one
  neutral confirmation for every address. An unknown address logs nothing. Too many attempts and network failures
  show as errors.
- `/reset-password` (`src/views/ResetPasswordView.vue`) reads `mode` and `oobCode` from the email's link. It has four
  states: checking the link; invalid or expired, with "Ask for a new link"; the form, under sign-up's rule
  (`isStrongPassword` in `src/lib/authForm.ts`); and done. A failed check that isn't invalid or expired shows its
  reason inline and offers Try again.
- Both routes are in `src/router/index.ts`. Who may open them: [security/auth](../security/auth.md). Texts are in
  `src/i18n/locales/en/auth.json` and `hi/auth.json`; the flows are covered by `e2e/forgot-password.spec.ts` and
  `e2e/reset-password.spec.ts`.

## Rules

- A reset code, email or password is never logged.
- Whether an unknown address is hidden from the server's answer depends on Firebase's email enumeration protection
  for `spanion-todo`, which nobody has confirmed
  ([questions/sign-in-error-enumeration](../questions/sign-in-error-enumeration.md)).
- The console's custom action URL may apply to every email template, not only the password-reset one; check the
  console when setting it.
- Known gaps: [findings/reset-limit-can-reveal-account](../findings/reset-limit-can-reveal-account.md),
  [findings/reset-code-stays-in-address-bar](../findings/reset-code-stays-in-address-bar.md),
  [findings/reset-sign-in-lands-on-other-account](../findings/reset-sign-in-lands-on-other-account.md),
  [findings/reset-lost-response-reports-link-used](../findings/reset-lost-response-reports-link-used.md),
  [findings/reset-check-try-again-forever](../findings/reset-check-try-again-forever.md),
  [findings/reset-fixed-height-layout-short-viewports](../findings/reset-fixed-height-layout-short-viewports.md).

## Sources

- [decisions/password-reset](../decisions/password-reset.md)
- `src/services/auth.ts`
- `src/lib/authForm.ts`
- `src/views/ForgotPasswordView.vue`
- `src/views/ResetPasswordView.vue`
- `src/views/SignInView.vue`
- `src/router/index.ts`
- `src/router/guard.ts`
- `src/i18n/locales/en/auth.json`
- `src/i18n/locales/hi/auth.json`
- `e2e/forgot-password.spec.ts`
- `e2e/reset-password.spec.ts`
