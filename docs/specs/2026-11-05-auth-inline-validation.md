# Inline validation on sign-in and sign-up

## Problem

`SignInView.vue` and `SignUpView.vue` validate only on submit, and the email rule only checks that the field is
filled. A malformed email (`ankit@gmail`, `ankit.gmail.com`) is sent to Firebase, and the `auth/invalid-email` error
appears in a snackbar instead of under the field.

## Agreed

- Email shape: `name@site.tld`. No whitespace, exactly one `@`, a non-empty local part, and a domain with a dot that
  is neither its first nor its last character. No limit on the top-level domain's length (D14's `.info` case still
  passes). Stricter than D14 for domains with no dot: chosen by the developer, recorded in
  `knowledge/decisions/email-format-check.md`.
- When errors show: Vuetify's `validate-on="invalid-input"` on both `<v-form>`s. A field is checked on blur; once
  invalid, it is checked on every input, so the error clears as soon as it is fixed. Submit still validates every
  field.

## Changes

1. `src/lib/authForm.ts`: `isEmailAddress(value: string): boolean`, applied to the trimmed value, unit-tested in
   `src/lib/authForm.test.ts`. Test it first.
2. Both views: the email rules become required, then `isEmailAddress(v.trim()) || t('auth.rules.emailInvalid')`;
   `validate-on="submit"` becomes `validate-on="invalid-input"`.
3. `src/i18n/locales/en/auth.json` and `hi/auth.json`: `auth.rules.emailInvalid`. English: "Enter a valid email
   address". Hindi: "मान्य ईमेल पता दर्ज करें".
4. `authErrorKey` keeps `auth/invalid-email` as the backstop. No other behaviour changes.

## Out of scope

Server-side checks (Firebase still decides), the sign-in error wording
(`knowledge/questions/sign-in-error-enumeration.md`), and visual reference refreshes: the default screens show no
error, so they do not change.

## Testing

Unit tests for `isEmailAddress`: accepts `a@b.co`, `name+tag@site.info`, `first.last@sub.example.org`; rejects
`''`, `ankit@gmail`, `ankit.gmail.com`, `a@@b.co`, `a b@c.co`, `@site.com`, `name@.com`, `name@site.`. The forms
are checked by hand in the browser: typing a malformed email and leaving the field shows the message under it.
