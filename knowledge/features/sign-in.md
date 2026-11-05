---
type: Feature
title: Sign in and sign up
description: Email and password or Google; signed-out visitors are sent to sign in and come back to the page they asked for.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
verified: human:panditankit1995@gmail.com
---

# Sign in and sign up

## What it does

A visitor signs up or signs in with an email and password, or with Google. Facebook sign-in was removed
([decisions/facebook-sign-in-removed](../decisions/facebook-sign-in-removed.md)). A signed-out visit to any
app screen goes to sign-in first and returns to that screen afterwards. Signing out from the menu
(`src/components/layout/AppMenu.vue`) removes this device's push registration first, then clears every
per-user store. How sessions and tokens work: [security/auth](../security/auth.md).

## Screens and routes

- `/signin`: `src/views/SignInView.vue`; `/signup`: `src/views/SignUpView.vue`. Each links to the other,
  keeping the `redirect` query.
- Both screens are drawn and worded like the old Signin and Signup; failures show in a snackbar. The
  show-password eye and the password hint (which names the letter-and-digit rule the app applies) are the
  rewrite's, kept in the old style.
- Both cards show the app logo at the top, above the "Task Manager" title, an exception to the old look
  ([decisions/app-logo](../decisions/app-logo.md)). Fields on both forms sit 12 px below the
  message line of the field above (`gr-3` on sign-up's row, `mb-3` on sign-in's fields), so a form full of errors
  doesn't look cramped. Sign-up's submit button is drawn like sign-in's "Sign in with Email" button (elevated
  primary, `width="280"`, `size="large"`) without its icon, capped at the fields' width (`max-width="100%"`) so it
  can't overflow a phone-width card, 12 px below the last field (`mt-3`), and outside `v-card-actions`, whose
  defaults would turn it into a text button.
- The language can be switched on both screens; the menu and bottom navigation are hidden on them.

## Rules

- Sign-in and sign-up accept an email shaped `name@site.tld` (`isEmailAddress` in `src/lib/authForm.ts`), and
  sign-up a password of at least `PASSWORD_MIN_LENGTH` characters with a letter and a digit (`isStrongPassword`,
  spec D14). Each field's error shows under it once the field loses focus, then updates as the user types
  ([decisions/email-format-check](../decisions/email-format-check.md)).
- Google always redirects, never a popup (`signInWithGoogle` in `src/services/auth.ts`), since a Trusted Web
  Activity and some installed PWAs can't show one. Both screens pick the result up when the page loads again
  (`consumeRedirectResult` reports the operation, and only a `signIn` goes on to the app), and reset a busy Google
  button when the browser restores the page from its back-forward cache (a `pageshow` listener). Cancelling
  Google's page before it loads leaves the button busy
  ([findings/google-redirect-cancel-leaves-button-busy](../findings/google-redirect-cancel-leaves-button-busy.md)).
- Both screens show a "Privacy policy" link to `/privacy` ([features/legal-pages](legal-pages.md)).
- After signing in, the app goes to the `redirect` query only when it is an in-app path that isn't sign-in or
  sign-up; anything else goes to `/home` (`safeRedirect` in `src/router/guard.ts`).
- Errors are shown from Firebase's error code, translated (`authErrorKey` in `src/lib/authForm.ts`). Whether
  wrong-password and unknown-user should share one message is open
  ([questions/sign-in-error-enumeration](../questions/sign-in-error-enumeration.md)).
- Popup versus redirect for Google was decided: redirect only, everywhere
  ([decisions/google-sign-in-redirect-only](../decisions/google-sign-in-redirect-only.md)).
- The account menu shows the email once: as the title when there is no display name, as the subtitle under the
  name when there is one (`subtitle` in `src/components/layout/AppMenu.vue`). It keeps Vuetify's default menu
  z-index so it opens above the app bar; a fixed high value sat under the bar and clipped the top row.
- A field's validation message wraps inside the field rather than widening the card, and is aligned to the
  field's start rather than centred like the rest of the card (the `.auth-page .v-input__details` rule in
  `src/assets/style.css`).

## History

- 2026-11-05: Google opened a popup and redirected only where popups failed; now it always redirects, both screens pick the result up on load and reset a busy button on a back-forward cache restore, and both link to `/privacy`, because the Play app's Trusted Web Activity can't show a popup. See [decisions/google-sign-in-redirect-only](../decisions/google-sign-in-redirect-only.md).
- 2026-11-05: messages were centred and fields sat 4 px below the message above; now messages are left-aligned and fields sit 12 px apart, with sign-up's button capped at the fields' width, because the form looked congested with errors showing.

- 2026-11-05: sign-up accepted any email Firebase accepts and both forms showed errors only on submit, a malformed email only in a snackbar; now both forms require `name@site.tld` and show each error under its field as the user goes, because the developer asked for inline validation. See [decisions/email-format-check](../decisions/email-format-check.md).
- 2026-11-05: the cards had no logo and the sign-up fields sat 46 px apart; now both cards show the logo above the title and sign-up's fields sit 26 px apart like sign-in's, because the developer asked. See [decisions/app-logo](../decisions/app-logo.md).
- 2026-11-05: the account menu showed the email twice and opened under the app bar, and long validation messages widened the sign-up card; now the email shows once, the menu opens above the bar and messages wrap in the field, because of the visual fixes on `fix/auth-visuals`.
- 2026-11-04: was the rewrite's layout and text; now the old Signin's and Signup's, with the show-password eye kept, because the app is restored to the old look. See [decisions/restore-original-design](../decisions/restore-original-design.md).

## Sources

- `src/views/SignInView.vue`
- `src/views/SignUpView.vue`
- `src/components/layout/AppMenu.vue`
- `src/services/auth.ts`
- `src/lib/authForm.ts`
- `src/router/guard.ts`
- `src/assets/style.css`
- `src/stores/session.ts`
