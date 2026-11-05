# Password reset — Implementation Plan

**Status:** complete, commits ed0cd77..2e811f2, 2026-11-05; record: `2026-11-05-password-reset.record.md`

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:feature-build-team by default, or ga:feature-build. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

Plan, then build; tests with each task. Say 'test-first' or 'spec it first' to work that way.

**Goal:** Let an email user who forgot their password ask for a reset link from sign-in and set a new password in the app.

**Architecture:** Three functions in `src/services/auth.ts` wrap Firebase's reset calls, and the one that sends the email gives the same result for an unknown address. A new `/forgot-password` screen, reached from a "Forgot password?" link on sign-in's email form, sends the email. A new `/reset-password` screen, which Firebase's email opens with `mode` and `oobCode` in the query, checks the code and sets the new password under sign-up's rule. Both screens are drawn like sign-in's card.

**Tech Stack:** Vue 3 with `<script setup lang="ts">`, Vuetify, vue-router 4, vue-i18n, Pinia, Firebase Auth (modular SDK), Vitest with `@vue/test-utils` in jsdom, Playwright against the Firebase emulators. CI is the project's own (`knowledge/quality/ci.md`); nothing here changes it.

**Spec:** none. The policy needs no spec for a change of this size. The rules come from [decisions/password-reset](../../knowledge/decisions/password-reset.md), which the developer stated on 2026-11-05.

## Global Constraints

- An unknown email gets exactly the confirmation a known one gets: "If an account exists for that email, a reset link is on its way." (decisions/password-reset).
- Too many attempts and a network failure are still shown as errors, with the existing `auth.errors.tooManyRequests` and `auth.errors.network` copy.
- A new password follows sign-up's rule: `isStrongPassword` in `src/lib/authForm.ts` (at least `PASSWORD_MIN_LENGTH` characters with a letter and a digit, spec D14), with the existing `auth.rules.passwordStrength` and `auth.rules.passwordsMatch` copy.
- The email typed on sign-in reaches `/forgot-password` through the router's history `state`, never the URL.
- A log names an error by its code only (`authErrorCode`), never the email, the password or the `oobCode` (knowledge/project/conventions.md, Error handling).
- Every visible string is in `src/i18n/locales/en/auth.json` and `src/i18n/locales/hi/auth.json`, under the same keys.
- Both new screens look like sign-in: the `auth-page` / `auth-card` layout, the logo, the title "Task Manager", the language toggle, and the "Privacy policy" link to `/privacy` (`auth.privacyLink`). Failures show in the snackbar sign-in uses (`data-testid="auth-error"`, `role="alert"`).
- There's no approved design (the design step is off): sign-in's card is the reference.
- Outside the code, the developer sets the password-reset template's action URL to `https://todo.spanion.in/reset-password` in the Firebase console (Auth → Templates). No task does this.

## Checkpoints

None (`run.checkpoints: none`).

## Review Focus

- A reset link opened a second time, after it was used, shows the invalid-link state and offers a new link. It doesn't fail silently or leave a spinner.
- A reset link opened while another account is signed in on the device still resets the link's account, and leaves the signed-in session alone.
- Pressing "Send reset link" twice quickly sends one request.
- A network failure while changing the password keeps both fields filled and shows the network error.
- Switching language on either new screen keeps the current state (form, confirmation or invalid link), and the shown error follows the language.

---

### Task 1: Reset calls, error keys and copy

**Files:**
- Modify: `src/services/auth.ts`
- Modify: `src/services/auth.test.ts`
- Modify: `src/lib/authForm.ts`
- Modify: `src/lib/authForm.test.ts`
- Modify: `src/i18n/locales/en/auth.json`
- Modify: `src/i18n/locales/hi/auth.json`

**Interfaces:**
- Consumes: existing `auth` from `@/lib/firebase`, existing `authErrorCode()` from `@/lib/authForm`.
- Produces, for Tasks 2 and 3:

```ts
// src/services/auth.ts
/** Sends Firebase's reset email to the trimmed address. Resolves alike whether or not it has an account. */
export function requestPasswordReset(email: string): Promise<void>;
/** The email of the account the reset code belongs to. Rejects with the Firebase error, e.g. auth/expired-action-code. */
export function checkResetCode(code: string): Promise<string>;
/** Sets the new password for the code's account. Rejects with the Firebase error. */
export function resetPassword(code: string, newPassword: string): Promise<void>;
```

`authErrorKey()` gains two codes:

| Firebase code | Locale key |
|---|---|
| `auth/expired-action-code` | `auth.errors.resetLinkExpired` |
| `auth/invalid-action-code` | `auth.errors.resetLinkInvalid` |

New English copy in `src/i18n/locales/en/auth.json` (the `hi` file gets the same keys, translated):

```json
{
  "signIn": { "forgotLink": "Forgot password?" },
  "forgot": {
    "subtitle": "Reset your password",
    "hint": "Enter your account's email and we'll send you a link to set a new password.",
    "submit": "Send reset link",
    "sent": "If an account exists for that email, a reset link is on its way.",
    "backToSignIn": "Back to sign in"
  },
  "reset": {
    "subtitle": "Set a new password",
    "forEmail": "For {email}",
    "checking": "Checking your link…",
    "submit": "Change password",
    "done": "Your password has been changed.",
    "signIn": "Sign in",
    "requestNew": "Ask for a new link"
  },
  "fields": { "newPassword": "New password" },
  "errors": {
    "resetLinkExpired": "This reset link has expired. Ask for a new one.",
    "resetLinkInvalid": "This reset link isn't valid or has already been used. Ask for a new one."
  }
}
```

(These keys are added to the existing objects of the same names. Nothing existing is renamed.)

**Spec:** none. decisions/password-reset: "asking for a reset always shows one neutral confirmation … whether or not the address has an account".

**Tags:** `security`, `failure-paths`

**Knowledge:** none. The end-of-plan knowledge job writes `features/password-reset` (see Task 3).

**Acceptance:** (`firebase/auth` mocked, as `src/services/auth.test.ts` already does)
- Given `"  ann@example.com "`, when `requestPasswordReset` is called, then `sendPasswordResetEmail` is called once with `auth` and `"ann@example.com"`, and the call resolves.
- Given `sendPasswordResetEmail` rejects with `auth/user-not-found`, when `requestPasswordReset` is called, then it resolves with `undefined`, exactly as for a known address.
- Given `sendPasswordResetEmail` rejects with `auth/too-many-requests`, then `requestPasswordReset` rejects with that error. The same holds for `auth/network-request-failed`.
- Given `verifyPasswordResetCode` resolves `"ann@example.com"`, when `checkResetCode("abc")` is called, then it resolves `"ann@example.com"` and passed `auth` and `"abc"`.
- Given `verifyPasswordResetCode` rejects with `auth/expired-action-code`, then `checkResetCode` rejects with that same error.
- When `resetPassword("abc", "newpass12")` is called, then `confirmPasswordReset` is called with `auth`, `"abc"`, `"newpass12"`, and the password is not trimmed (`" newpass12 "` passes through as typed).
- `authErrorKey` maps `{ code: 'auth/expired-action-code' }` to `auth.errors.resetLinkExpired`, and `{ code: 'auth/invalid-action-code' }` to `auth.errors.resetLinkInvalid`.
- Every key added to `en/auth.json` exists in `hi/auth.json` with a non-empty value, and `reset.forEmail` keeps its `{email}` placeholder in both.

- [x] **Step 1: Write the failing tests** for each Acceptance case: the service cases in `src/services/auth.test.ts` (mock `sendPasswordResetEmail`, `verifyPasswordResetCode` and `confirmPasswordReset` beside the existing mocks), and the key and locale cases in `src/lib/authForm.test.ts`. First add the three functions to `src/services/auth.ts` with their real signatures and bodies that throw `new Error('not implemented')`, so the tests fail on behaviour.

- [x] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/services/auth.test.ts src/lib/authForm.test.ts`
Expected: FAIL on the new assertions. These tests mock Firebase, so they run without the emulators.

- [x] **Step 3: Write the minimal implementation** to the Interfaces, and add the copy to both locale files. Write the Hindi in the register the file already uses. A person checks it in review.

- [x] **Step 4: Run them to verify they pass**

Run: `npx vitest run src/services/auth.test.ts src/lib/authForm.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/services/auth.ts src/services/auth.test.ts src/lib/authForm.ts src/lib/authForm.test.ts src/i18n/locales/en/auth.json src/i18n/locales/hi/auth.json
git commit -m "feat(auth): password reset calls, error keys and copy"
```

---

### Task 2: Forgot-password screen and the link from sign-in

**Files:**
- Create: `src/views/ForgotPasswordView.vue`
- Create: `src/views/ForgotPasswordView.test.ts`
- Modify: `src/views/SignInView.vue`
- Modify: `src/views/SignInView.test.ts`
- Modify: `src/router/index.ts`
- Modify: `src/router/guard.ts`
- Modify: `src/router/guard.test.ts`
- Modify: `e2e/support/emulator.ts`
- Create: `e2e/forgot-password.spec.ts`

**Interfaces:**
- Consumes: `requestPasswordReset()` and the `auth.forgot.*`, `auth.signIn.forgotLink` copy (Task 1). Existing `authErrorKey()`, `authErrorCode()`, `isEmailAddress()`, `safeRedirect()`, `AppLogo`, `useUiStore()`.
- Produces: the `/forgot-password` route (name `forgot-password`, lazy `ForgotPasswordView.vue`, no `meta`). `/forgot-password` joins `SIGNED_OUT_PATHS` in `src/router/guard.ts`, so a signed-in visit goes where `/signin` would send it, and `safeRedirect` never returns it. For Task 3's e2e test:

```ts
// e2e/support/emulator.ts
export interface OobCode { email: string; requestType: string; oobCode: string; oobLink: string }
/** The out-of-band codes the Auth emulator recorded, from GET /emulator/v1/projects/demo-todo/oobCodes. */
export function listOobCodes(): Promise<OobCode[]>;
```

**Spec:** none. decisions/password-reset: "opens a separate forgot-password screen (route /forgot-password), with the email already typed carried over, and a link back to sign-in."

**Tags:** `security`, `failure-paths`, `screen`

**Knowledge:** none. The end-of-plan job writes `features/password-reset`: "/forgot-password sends Firebase's reset email and answers every address alike". It also writes `features/sign-in`: "sign-in's email form links 'Forgot password?' to /forgot-password, carrying the email in history state".

**Acceptance:**
- Given sign-in's email form is open with `"ann@example.com"` typed, when "Forgot password?" is clicked, then the app is at `/forgot-password` with the email field showing `ann@example.com`, and the URL holds no email.
- Given sign-in at `/signin?redirect=/calendar`, when "Forgot password?" is clicked, then the forgot screen's "Back to sign in" link goes to `/signin?redirect=/calendar`.
- Given the email form on sign-in is closed, then no "Forgot password?" link shows.
- Given `/forgot-password` opened directly, then the email field is empty and focused.
- Given an empty email, when "Send reset link" is pressed, then "Enter your email address" shows under the field and `requestPasswordReset` isn't called. Given `ann@example`, then "Enter a valid email address" shows and it isn't called.
- Given `requestPasswordReset` resolves, when "Send reset link" is pressed, then the form is replaced by "If an account exists for that email, a reset link is on its way." and "Back to sign in".
- Given the button is pressed twice before the first call settles, then `requestPasswordReset` is called once.
- Given `requestPasswordReset` rejects with `auth/too-many-requests`, then the snackbar says "Too many attempts. Wait a moment and try again.", the email stays in the field, and the button is usable again. Given `auth/network-request-failed`, it says "Couldn't reach the server. Check your connection and try again."
- Given a failure, then `console.warn` is called with the error code only, and never with the email.
- The screen shows the logo, "Task Manager", "Reset your password", the language toggle and a "Privacy policy" link to `/privacy`. Switching to `hi` while the confirmation shows keeps the confirmation, in Hindi.
- Guard: a signed-in visit to `/forgot-password` is redirected to `/home`, and `safeRedirect('/forgot-password')` returns `/home`.
- e2e (`e2e/forgot-password.spec.ts`, emulators): given a user `ann@example.com`, when they open sign-in, open the email form, type their email, click "Forgot password?" and send, then the confirmation shows and `listOobCodes()` holds one `PASSWORD_RESET` code for `ann@example.com`. Given `nobody@example.com` instead, then the same confirmation shows and no code is recorded for it.

- [x] **Step 1: Write the failing tests** for each Acceptance case: the screen in `src/views/ForgotPasswordView.test.ts` (services mocked as `SignInView.test.ts` does), the link in `src/views/SignInView.test.ts`, the guard cases in `src/router/guard.test.ts`, and the flow in `e2e/forgot-password.spec.ts` with `listOobCodes` added to `e2e/support/emulator.ts`. Create `ForgotPasswordView.vue` as an empty template and register its route first, so the tests fail on behaviour.

- [x] **Step 2: Run the unit tests to verify they fail**

Run: `npx vitest run src/views/ForgotPasswordView.test.ts src/views/SignInView.test.ts src/router/guard.test.ts`
Expected: FAIL on the new assertions

- [ ] **Step 3: Run the e2e test to verify it fails** (not run in the build: the emulator ports were held by another checkout; see the record)

Run: `npm run e2e -- e2e/forgot-password.spec.ts --project chromium`
Expected: FAIL on the missing link or confirmation

- [x] **Step 4: Write the minimal implementation** to the Interfaces until they pass

- [x] **Step 5: Run the unit tests to verify they pass**

Run: `npx vitest run src/views/ForgotPasswordView.test.ts src/views/SignInView.test.ts src/router/guard.test.ts`
Expected: PASS

- [ ] **Step 6: Run the e2e test to verify it passes** (not run in the build: the emulator ports were held by another checkout; see the record)

Run: `npm run e2e -- e2e/forgot-password.spec.ts --project chromium`
Expected: PASS

- [x] **Step 7: Commit**

```bash
git add src/views/ForgotPasswordView.vue src/views/ForgotPasswordView.test.ts src/views/SignInView.vue src/views/SignInView.test.ts src/router/index.ts src/router/guard.ts src/router/guard.test.ts e2e/support/emulator.ts e2e/forgot-password.spec.ts
git commit -m "feat(auth): forgot-password screen, linked from sign-in"
```

---

### Task 3: Reset-password screen

**Files:**
- Create: `src/views/ResetPasswordView.vue`
- Create: `src/views/ResetPasswordView.test.ts`
- Modify: `src/router/index.ts`
- Create: `e2e/reset-password.spec.ts`

**Interfaces:**
- Consumes: `checkResetCode()`, `resetPassword()` and the `auth.reset.*`, `auth.fields.newPassword`, `auth.errors.resetLink*` copy (Task 1). The `/forgot-password` route and `listOobCodes()` (Task 2). Existing `isStrongPassword()`, `authErrorKey()`, `authErrorCode()`, `AppLogo`, `useUiStore()`.
- Produces: the `/reset-password` route (name `reset-password`, lazy `ResetPasswordView.vue`, no `meta`). It is open to everyone, signed in or not, and isn't added to `SIGNED_OUT_PATHS`, so a link opened on a signed-in device still works. The screen reads `mode` and `oobCode` from the query. It has four states: checking, invalid link, form, done.

**Spec:** none. decisions/password-reset: "The new password is set in the app, on a reset-password screen (route /reset-password), in both languages and drawn like sign-in, with sign-up's rule".

**Tags:** `security`, `failure-paths`, `screen`

**Knowledge:** none. The end-of-plan job writes `features/password-reset`: "/reset-password checks the code, then sets a password under sign-up's rule; an expired or used link offers a new one". It also writes `security/auth`: "a reset code is never logged, and a reset doesn't touch the session already signed in on the device".

**Acceptance:**
- Given `?mode=resetPassword&oobCode=abc` and `checkResetCode` pending, then "Checking your link…" shows with a progress indicator and no form.
- Given `checkResetCode` resolves `ann@example.com`, then "For ann@example.com", a "New password" field, a "Confirm" field (both with the show-password eye) and "Change password" show.
- Given no `oobCode`, or `mode` other than `resetPassword`, or `oobCode` given twice (`?oobCode=a&oobCode=b`), then "This reset link isn't valid or has already been used. Ask for a new one." shows with "Ask for a new link" to `/forgot-password`, and `checkResetCode` isn't called.
- Given `checkResetCode` rejects with `auth/expired-action-code`, then "This reset link has expired. Ask for a new one." shows with "Ask for a new link". Given `auth/invalid-action-code`, the invalid-link copy shows.
- Given `checkResetCode` rejects with `auth/network-request-failed`, then the network error shows in the snackbar, and the screen offers the check again with a Try again button. It doesn't claim the link is invalid.
- Given `abcdefgh` (no digit), when "Change password" is pressed, then "Use at least 8 characters with a letter and a number." shows under the field and `resetPassword` isn't called. Given a confirm that differs, then "Password must match" shows.
- Given `newpass12` in both fields, when "Change password" is pressed, then `resetPassword('abc', 'newpass12')` is called once, even on a double press, and then "Your password has been changed." shows with a "Sign in" button to `/signin`.
- Given `resetPassword` rejects with `auth/network-request-failed`, then the snackbar shows the network error and both fields keep what was typed. Given it rejects with `auth/expired-action-code`, then the expired-link state shows.
- Given any failure, then `console.warn` is called with the error code only, never the code from the URL, the email or the password.
- The screen shows the logo, "Task Manager", "Set a new password", the language toggle and a "Privacy policy" link to `/privacy`. Switching to `hi` on the invalid-link state keeps that state, in Hindi.
- e2e (`e2e/reset-password.spec.ts`, emulators): given user `ann@example.com` with password `abc-def_9`, when a reset is asked for through `/forgot-password` and `/reset-password?mode=resetPassword&oobCode=<the code from listOobCodes()>` is opened, then "For ann@example.com" shows. Setting `newpass12` shows "Your password has been changed.". After that, signing in with `newpass12` reaches `/home`, and signing in with `abc-def_9` shows the wrong-password error. Opening the same link again shows the invalid-link copy.

- [x] **Step 1: Write the failing tests** for each Acceptance case: the screen in `src/views/ResetPasswordView.test.ts` (services mocked) and the flow in `e2e/reset-password.spec.ts`. Create `ResetPasswordView.vue` as an empty template and register its route first, so the tests fail on behaviour.

- [x] **Step 2: Run the unit tests to verify they fail**

Run: `npx vitest run src/views/ResetPasswordView.test.ts`
Expected: FAIL on the new assertions

- [ ] **Step 3: Run the e2e test to verify it fails** (not run in the build: the emulator ports were held by another checkout; see the record)

Run: `npm run e2e -- e2e/reset-password.spec.ts --project chromium`
Expected: FAIL on the missing screen content

- [x] **Step 4: Write the minimal implementation** to the Interfaces until they pass

- [x] **Step 5: Run the unit tests to verify they pass**

Run: `npx vitest run src/views/ResetPasswordView.test.ts`
Expected: PASS

- [ ] **Step 6: Run the e2e test to verify it passes** (not run in the build: the emulator ports were held by another checkout; see the record)

Run: `npm run e2e -- e2e/reset-password.spec.ts --project chromium`
Expected: PASS

- [x] **Step 7: Commit**

```bash
git add src/views/ResetPasswordView.vue src/views/ResetPasswordView.test.ts src/router/index.ts e2e/reset-password.spec.ts
git commit -m "feat(auth): reset-password screen sets a new password from the email's link"
```
