# Terms of Service Page Implementation Plan

**Status:** complete, commits a534247..3ef486d, 2026-11-18. Record: `2026-11-18-terms-page.record.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:feature-build-team by default, or ga:feature-build. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public Terms of service page at `/terms`, and link it wherever the privacy policy is linked, with an agreement notice on sign-up.

**Architecture:** A new view `src/views/TermsView.vue` on the shared `LegalPage` layout, routed in `src/router/index.ts` with no `meta` (public, no app chrome), exactly as `/privacy` is. The links are translated strings in the existing `auth` and `profile` i18n namespaces; the page text is English only.

**Tech Stack:** Vue 3 (`<script setup lang="ts">`), Vuetify, vue-router, vue-i18n, Vitest with `@vue/test-utils`, Playwright (`e2e/`). Firebase Hosting already rewrites every path to `index.html`, so no hosting change is needed.

**Security sign-off:** Task 1, Task 2 — AKASpanion (developer), 2026-11-18: static legal text, a public route and links on the auth cards; no auth logic, session, token, password handling or redirect changes.

**Spec:** none: a small feature settled by [decisions/terms-of-service](../../knowledge/decisions/terms-of-service.md) (stated by the developer) and [decisions/legal-pages-english-only](../../knowledge/decisions/legal-pages-english-only.md); the existing pages are [features/legal-pages](../../knowledge/features/legal-pages.md).

## Global Constraints

- `/terms` is public: no `requireAuth`, no `nav`, no `verifyBanner` in its route's `meta`.
- The terms page text is English only, whatever the app's language; `LegalPage` already sets `lang="en"` on its root.
- Governing law: "the laws of India". No court, city or state is named.
- The terms describe only what the app does today. No mention of Pro, subscriptions, payments, prices, AI features or data export.
- Effective date: `TERMS_EFFECTIVE = '18 November 2026'`, shown as "Effective 18 November 2026".
- Who and contact match `src/views/PrivacyView.vue`: "Ankit Kumar Pandit, an individual developer", `panditankit1995@gmail.com`.
- Minimum age 13, matching the privacy policy's Children section.
- Every visible string outside the legal page's own text lives in `src/i18n/locales/<lang>/<feature>.json` with the same keys in `en` and `hi`.
- Sign-up gets a notice, never a checkbox; nothing about sign-up's buttons changes.

## Checkpoints

None (`run.checkpoints: none`).

---

### Task 1: The /terms page

**Files:**
- Create: `src/views/TermsView.vue`
- Create: `src/views/TermsView.test.ts`
- Modify: `src/router/index.ts` (a `/terms` route beside `/privacy`, before the catch-all)
- Modify: `e2e/legal.spec.ts`

**Interfaces:**
- Consumes: existing `src/components/layout/LegalPage.vue` (`title: string` prop, default slot).
- Produces: the route below, which Task 2's links point at.

```ts
// src/router/index.ts — added to `routes`, no meta
{ path: '/terms', name: 'terms', component: () => import('@/views/TermsView.vue') }
// src/views/TermsView.vue <script setup>
const TERMS_EFFECTIVE = '18 November 2026';
const CONTACT_EMAIL = 'panditankit1995@gmail.com';
```

The page's `h2` sections, in this order, and what each says:

| Heading | Says |
|---|---|
| `Agreeing to these terms` | Using Task Manager or creating an account means accepting these terms and the Privacy policy (a `router-link` to `/privacy`). |
| `Who` | Task Manager is made by Ankit Kumar Pandit, an individual developer; contact by the `mailto:` link. |
| `The service` | A free personal task manager with labels, a calendar and push reminders; features may change or stop; provided as it is, without promises that it is always available or error-free. |
| `Your account` | You must be 13 or older; keep your password safe; you are responsible for what happens in your account. |
| `Your content` | Your tasks and labels stay yours; you let us store and process them only to run the app. |
| `Acceptable use` | No breaking the law with the app, no accessing other people's accounts or data, no attempting to break, overload or get around the app's security, no automated scraping. |
| `Ads` | The app shows Google AdSense ads; how ad data is handled is in the Privacy policy (link to `/privacy`). |
| `Reminders` | Reminders are sent on a best-effort basis and may arrive late or not at all; don't rely on them alone for anything critical. |
| `Ending` | You can delete your account at any time (link to `/delete-account`); an account that breaks these terms may be suspended or deleted. |
| `Liability` | To the extent the law allows, the developer isn't liable for lost data, missed reminders or indirect losses from using the app. |
| `Governing law` | These terms are governed by the laws of India. |
| `Changes` | A change to these terms updates the date at the top; using the app after a change means accepting it. |

**Spec:** none

**Tags:** `screen`; not security: static legal text and a public route; no auth logic, session, token or password handling changes

**Knowledge:**
- `features/legal-pages`: `/terms` (`src/views/TermsView.vue`) is a third public legal page on `LegalPage`, English only, with an effective date in `TERMS_EFFECTIVE`, governed by the laws of India, and describing only the free app and its ads.
- `apps/web`: the routes list includes `/terms` as a public page.

**Acceptance:**
- Given `/terms` is mounted, then its `h1` is "Terms of service" and the text contains "Effective 18 November 2026".
- Given `/terms` is mounted, then its `h2` texts are exactly the twelve headings of the table above, in that order.
- Given `/terms` is mounted, then it contains "Ankit Kumar Pandit" and an `a[href="mailto:panditankit1995@gmail.com"]`.
- Given `/terms` is mounted, then it has links `a[href="/privacy"]` and `a[href="/delete-account"]`.
- Given `/terms` is mounted, then the text contains "laws of India" and "13".
- Given `/terms` is mounted, then the text contains none of "Pro", "subscription", "payment", "price", "AI" and "export" (case-sensitive for "Pro" and "AI", case-insensitive for the rest).
- Given the app's language is Hindi, when `/terms` is mounted, then the `h1` is still "Terms of service" and the root element carries `lang="en"`.
- Given the exported `routes`, then the `/terms` record has no `meta` (`requireAuth`, `nav` and `verifyBanner` all undefined).
- e2e, in `e2e/legal.spec.ts`: given a signed-out visitor, when they open `/terms` directly, then the URL stays `/terms` (not sent to sign-in), the level-1 heading "Terms of service" is visible, and neither the app menu, the back-to-app button nor the bottom navigation shows (the file's `expectNoAppChrome`).
- e2e: given a signed-out visitor who opened `/terms` first, when they press Back, then they land on `/signin?redirect=/home` (`LegalPage`'s fallback through the guard).
- e2e: given a signed-in user, when they open `/terms` directly, then the page shows and the URL stays `/terms`.

- [x] **Step 1: Write the failing unit tests** for the unit Acceptance cases in `src/views/TermsView.test.ts`, mounting the view as `src/views/PrivacyView.test.ts` mounts its view (a memory router holding `/home`, `/terms`, `/privacy` and `/delete-account`). Create `src/views/TermsView.vue` as an empty `LegalPage` first, so the tests fail on behaviour, not on a missing module.

- [x] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/views/TermsView.test.ts`
Expected: FAIL on the assertions.

- [x] **Step 3: Write the page and the route** to the Interfaces, until the unit tests pass.

- [x] **Step 4: Run them to verify they pass**

Run: `npx vitest run src/views/TermsView.test.ts`
Expected: PASS

- [x] **Step 5: Write the e2e cases** in `e2e/legal.spec.ts`, in a new `test.describe('terms of service page')`, reusing the file's `expectNoAppChrome`, `resetEmulators`, `createUser` and `signInAs`.

- [x] **Step 6: Run the new e2e cases**

Run: `npm run e2e -- e2e/legal.spec.ts -g "terms of service page"`
Expected: PASS

- [x] **Step 7: Commit**

```bash
git add src/views/TermsView.vue src/views/TermsView.test.ts src/router/index.ts e2e/legal.spec.ts
git commit -m "feat(legal): add the public terms of service page at /terms"
```

---

### Task 2: Links to the terms, and the sign-up notice

**Files:**
- Modify: `src/views/SignUpView.vue`
- Modify: `src/views/SignInView.vue`
- Modify: `src/views/ForgotPasswordView.vue`
- Modify: `src/views/ResetPasswordView.vue`
- Modify: `src/views/VerifyEmailView.vue`
- Modify: `src/components/profile/AccountSection.vue`
- Modify: `src/i18n/locales/en/auth.json`
- Modify: `src/i18n/locales/hi/auth.json`
- Modify: `src/i18n/locales/en/profile.json`
- Modify: `src/i18n/locales/hi/profile.json`
- Test: `src/views/SignUpView.test.ts`
- Test: `src/views/SignInView.test.ts`
- Test: `src/views/ForgotPasswordView.test.ts`
- Test: `src/views/ResetPasswordView.test.ts`
- Test: `src/views/VerifyEmailView.test.ts`
- Test: `src/views/ProfileView.test.ts`
- Test: `e2e/legal.spec.ts`

**Interfaces:**
- Consumes: the `/terms` route from Task 1 (the e2e walks to it; the unit tests stub it like `/privacy`).
- Produces: the i18n keys below.

```jsonc
// src/i18n/locales/en/auth.json (top level, beside "privacyLink")
"termsLink": "Terms of service",
"signUp": { /* existing keys */ "agreement": "By creating an account you agree to the {terms} and {privacy}." }
// src/i18n/locales/hi/auth.json
"termsLink": "सेवा की शर्तें",
"signUp": { "agreement": "खाता बनाकर आप {terms} और {privacy} से सहमत होते हैं।" }
// src/i18n/locales/en/profile.json, under "account"
"terms": "Terms of service"
// src/i18n/locales/hi/profile.json, under "account"
"terms": "सेवा की शर्तें"
```

The sign-up notice is rendered with vue-i18n's `<i18n-t keypath="auth.signUp.agreement">`, its `terms` and `privacy` slots being `router-link`s to `/terms` and `/privacy` whose texts are `auth.termsLink` and `auth.privacyLink`. It replaces the sign-up card's lone "Privacy policy" link. On the other four auth cards, a "Terms of service" `router-link` to `/terms` sits beside the existing "Privacy policy" link, with the same `auth-link text-caption` classes. In Profile's Account card, a row "Terms of service" (icon `mdi-file-document-outline`) linking to `/terms` sits directly below the Privacy policy row, styled as that row (`account__item`).

**Spec:** none

**Tags:** `screen`; not security: adds static links and a notice to the auth cards; no auth logic, form handling or redirect changes

**Knowledge:**
- `features/legal-pages`: the terms page is linked from every auth card beside the privacy policy and from Profile's Account card; sign-up shows "By creating an account you agree to the Terms of service and Privacy policy." with no checkbox.
- `features/sign-in`: sign-up's card carries the agreement notice in place of its lone privacy link.
- `features/profile-and-labels`: the Account card has a Terms of service row below Privacy policy.

**Acceptance:**
- Given sign-up in English, then its card reads "By creating an account you agree to the Terms of service and Privacy policy." with "Terms of service" linking to `/terms` and "Privacy policy" linking to `/privacy`.
- Given sign-up, then it has no checkbox (`input[type="checkbox"]` count 0), and the Sign up and Continue with Google buttons are enabled without any interaction beyond filling the form, exactly as before.
- Given sign-up in Hindi, then the notice reads "खाता बनाकर आप सेवा की शर्तें और गोपनीयता नीति से सहमत होते हैं।" and both links still point at `/terms` and `/privacy`.
- Given sign-in, forgot-password, reset-password and verify-email, each in English, then each has a link "Terms of service" to `/terms` and still its "Privacy policy" link to `/privacy`.
- Given sign-in in Hindi, then its terms link reads "सेवा की शर्तें".
- Given Profile, then its Account card has, in order, rows "Privacy policy" (`/privacy`), "Terms of service" (`/terms`), then Sign out and Delete account.
- The existing tests that assert the privacy links (`SignInView.test.ts`, `SignUpView.test.ts`, `ProfileView.test.ts`, `VerifyEmailView.test.ts`, `ForgotPasswordView.test.ts`, `ResetPasswordView.test.ts`) still pass, each test router gaining a stub `/terms` route.
- e2e, in `e2e/legal.spec.ts`: given a signed-out visitor on `/signup`, when they click "Terms of service" in the notice, then they reach `/terms` with the heading "Terms of service"; when they then click the page's Privacy policy link, they reach `/privacy`.
- e2e: given a signed-out visitor on `/signin`, when they click "Terms of service", then they reach `/terms`.
- e2e: given a signed-in user on `/profile`, when they click the "Terms of service" row, then they reach `/terms`.

- [x] **Step 1: Write the failing unit tests** for the unit Acceptance cases, each in the test file beside the view it covers, adding a stub `/terms` route to each test router.

- [x] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/views/SignUpView.test.ts src/views/SignInView.test.ts src/views/ForgotPasswordView.test.ts src/views/ResetPasswordView.test.ts src/views/VerifyEmailView.test.ts src/views/ProfileView.test.ts`
Expected: FAIL on the new terms assertions only.

- [x] **Step 3: Add the keys and the links** to the Interfaces, until the unit tests pass.

- [x] **Step 4: Run them to verify they pass**

Run: `npx vitest run src/views/SignUpView.test.ts src/views/SignInView.test.ts src/views/ForgotPasswordView.test.ts src/views/ResetPasswordView.test.ts src/views/VerifyEmailView.test.ts src/views/ProfileView.test.ts`
Expected: PASS

- [x] **Step 5: Write the e2e cases** in `e2e/legal.spec.ts`, in a new `test.describe('links to the terms')`.

- [x] **Step 6: Run the new e2e cases**

Run: `npm run e2e -- e2e/legal.spec.ts -g "links to the terms"`
Expected: PASS

- [x] **Step 7: Commit**

```bash
git add src/views/SignUpView.vue src/views/SignInView.vue src/views/ForgotPasswordView.vue src/views/ResetPasswordView.vue src/views/VerifyEmailView.vue src/components/profile/AccountSection.vue src/i18n/locales/en/auth.json src/i18n/locales/hi/auth.json src/i18n/locales/en/profile.json src/i18n/locales/hi/profile.json src/views/SignUpView.test.ts src/views/SignInView.test.ts src/views/ForgotPasswordView.test.ts src/views/ResetPasswordView.test.ts src/views/VerifyEmailView.test.ts src/views/ProfileView.test.ts e2e/legal.spec.ts
git commit -m "feat(legal): link the terms from every auth card and Profile, with a sign-up notice"
```
