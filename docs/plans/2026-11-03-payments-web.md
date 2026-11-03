# Payments G1: Buying Pro on the Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:implement-with-subagents by default, or ga:implement. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An account without Pro can buy it on the website through a Razorpay subscription, verified by the function before Pro is granted, kept while paid and removed when it ends.

**Architecture:** One function, `applyEntitlement`, writes `entitlements/{uid}` and sets the `pro` claim together. The app asks for plans, starts, confirms and cancels a Razorpay subscription through `paymentRequests` documents, which `answerPaymentRequest` answers after checking the signature and Razorpay's own record; `checkSubscriptions` re-reads every Razorpay subscription daily. The Get Pro card, the `/pro` screen and the Pro card live on the profile, and the session refreshes its token when the entitlement changes.

**Tech Stack:** Vue 3 + Vuetify + Pinia + vue-router + vue-i18n (web app at the repository root); Firebase Auth, Firestore and Hosting (`firebase.json`); Cloud Functions on Node 22 with firebase-functions v2 (`functions/`); Razorpay's Node SDK `razorpay` (new, in `functions/`) and Razorpay Checkout's browser script; Vitest against the Firebase emulators; GitHub Actions (`.github/workflows/deploy.yml`).

**Spec:** `docs/specs/2026-11-03-payments.md`

## Global Constraints

- Build after part A (`docs/plans/2026-11-03-ai-foundation.md`) is merged. G2 (`docs/plans/2026-11-03-payments-play.md`) builds after this plan.
- §1: "Pro is granted only after the server has verified the payment with the provider itself; nothing the app reports is trusted on its own."
- §1: "No card, UPI or bank detail ever reaches the app's servers or database."
- §1: "Inside the Android app only Play Billing is offered; on the website only Razorpay."
- §1: "No function answers HTTP or callable requests."
- §5: "**Logs** name the request id, kind, outcome and provider status; never a signature, token, payment id in full, or amount tied to an account."
- No test calls Razorpay or Google; provider APIs are replaced by fakes (§6).
- Every visible string is in `src/i18n/locales/en/pro.json` and `src/i18n/locales/hi/pro.json`, with the same keys.
- No `any` and no `@ts-ignore`; new stores use the setup style.

## Checkpoints

None. The policy's `run.checkpoints` is `none`, and this plan adds no stop. The spec recommends a security review of the branch once G1 and G2 are built; the developer asks for it when they want it.

---

### Task 1: Foundation: dependency, contracts, rules and the entitlement writer

**Files:**
- Modify: `functions/package.json` (dependency `razorpay`)
- Modify: `functions/package-lock.json`
- Create: `functions/src/payments/types.ts`
- Create: `functions/src/payments/entitlement.ts`
- Test: `functions/src/payments/entitlement.test.ts`
- Modify: `src/types/models.ts`
- Modify: `firestore.rules`
- Test: `tests/rules/firestore.rules.test.ts`
- Modify: `firestore.indexes.json`

**Interfaces:**
- Consumes: existing `ClaimsReader` and the claim-merging in `functions/src/admin/pro.ts` (part A); existing `isUser()` and `createdKeys()` in `firestore.rules`.
- Produces, in `functions/src/payments/types.ts` (Tasks 2, 3, 4), with `Entitlement`, `PaymentRequestKind`, `PlanKey` and `PlanInfo` also in `src/types/models.ts` (Task 5):

```ts
export type EntitlementSource = 'razorpay' | 'play' | 'manual';
export type EntitlementStatus = 'active' | 'cancelled' | 'expired';
export type PlanKey = 'monthly' | 'yearly';
export interface Entitlement {
  source: EntitlementSource; status: EntitlementStatus; planKey: PlanKey | null;
  expiresAt: Timestamp | null; ref: string | null; updatedAt: Timestamp;
}
export type PaymentRequestKind = 'listPlans' | 'startRazorpay' | 'confirmRazorpay' | 'cancelRazorpay' | 'confirmPlay';
export interface PlanInfo { key: PlanKey; name: string; amount: number; currency: string; period: 'monthly' | 'yearly' }
export const PAYMENT_CHECK_CONCURRENCY = 10;

// functions/src/payments/entitlement.ts
export interface ClaimsWriter { getClaims(uid: string): Promise<Record<string, unknown>>; setClaims(uid: string, claims: Record<string, unknown>): Promise<void> }
export type ApplyOutcome = 'applied' | 'kept-manual';
export function applyEntitlement(db: Firestore, auth: ClaimsWriter, uid: string, next: Omit<Entitlement, 'updatedAt'>, now: Date): Promise<ApplyOutcome>;
export function isProEntitlement(e: Pick<Entitlement, 'status' | 'expiresAt'>, now: Date): boolean;
```

**Spec:**
- §4.1: "In one step it writes the document and sets the `pro` claim: on when `status` is `'active'` or `'cancelled'` and `expiresAt` is in the future (or `null` for manual), off otherwise. It merges `pro` into the account's other claims, as part A's script does."
- §4.1: "**Manual wins.** When the current entitlement's `source` is `'manual'`, a payment for the same account never replaces it; the payment is still recorded (its `paymentRequests` answer says so) so nothing is lost."
- §4.5: "`entitlements/{uid}`: **read** `isUser(uid)`; no client writes."
- §4.5: "`paymentRequests/{id}`: **create** by `isUser(request.resource.data.uid)` with exactly `uid`, `kind`, `input`, `status: 'pending'` and `createdAt == request.time`, `kind` one of the four, and `input` of that kind's shape (ids as strings of 1–100 characters, `planKey` one of the two); **read, delete** by the owner; never updated."
- §4.5: "`playTokens/{tokenHash}` (G2): no client access."
- §4.5: "`firestore.indexes.json`: `entitlements (source ASC, status ASC)`."

**Tags:** security

**Knowledge:** `data/model`: three new collections, `entitlements` (function-only, the source of the `pro` claim), `paymentRequests` and `playTokens`; `security/roles`: the `pro` claim is set only from an entitlement, by `applyEntitlement` or the admin script.

**Acceptance:**
- Given an account with claims `{ admin: true }`, when `applyEntitlement` applies `{ source: 'razorpay', status: 'active', planKey: 'monthly', expiresAt: 2026-12-03, ref: 'sub_1' }` at `2026-11-03`, then the entitlement document holds it with `updatedAt`, the claims are `{ admin: true, pro: true }`, and it returns `'applied'`.
- Given `status: 'cancelled'` with `expiresAt` in the future, then `pro` is `true`; with `expiresAt` in the past, `false`; given `status: 'expired'`, `false`.
- Given a `manual` entitlement with `expiresAt: null` and `status: 'active'`, then `pro` is `true`.
- Given the current entitlement is `manual` and active, when a `razorpay` entitlement is applied, then the document and the claim are unchanged and it returns `'kept-manual'`; when a `manual` one is applied (the admin script revoking), it is applied.
- Given `isProEntitlement` at exactly `expiresAt`, then `false`.
- Given a client, when it creates, updates or deletes `entitlements/{uid}` (its own or another's), then it is refused; the owner can read their own, another user can't.
- Given a client, when it reads or writes any `playTokens` document, then it is refused.
- Given the owner, when they create a `paymentRequests` document `{ uid, kind: 'startRazorpay', input: { planKey: 'monthly' }, status: 'pending', createdAt: <server time> }`, then it is allowed; with `planKey: 'weekly'`, another uid, `status: 'done'`, or an extra key `amount`, it is refused.
- Given `confirmRazorpay` with `input` `{ paymentId, subscriptionId, signature }` each 1–100 characters, then it is allowed; with any of them `''` or 101 characters, or a missing one, it is refused; given `listPlans` or `cancelRazorpay` with `input` `{}`, then it is allowed, and with any key, refused.
- Given a `paymentRequests` document, when its owner updates it, then it is refused; reads and deletes it, allowed; another user, refused.
- Given the earlier parts' rules cases, when the rules tests run, then they still pass.

- [ ] **Step 1: Add the dependency and the contracts**: install `razorpay` in `functions/`, and write `functions/src/payments/types.ts` and the additions to `src/types/models.ts` to the Interfaces, and the index to `firestore.indexes.json`

Run: `npm --prefix functions install razorpay`
Expected: `functions/package.json` and `functions/package-lock.json` list `razorpay`

- [ ] **Step 2: Write the failing tests** for each Acceptance case: `applyEntitlement` and `isProEntitlement` in `functions/src/payments/entitlement.test.ts` against the Firestore emulator with a fake `ClaimsWriter`; the rules cases in `tests/rules/firestore.rules.test.ts`

- [ ] **Step 3: Run them to verify they fail**

Run: `npm --prefix functions run test -- src/payments/entitlement.test.ts`
Expected: FAIL on the assertions

Run: `npm run test:rules -- tests/rules/firestore.rules.test.ts`
Expected: FAIL on the new allowed cases; the earlier cases pass

- [ ] **Step 4: Write the minimal implementation**: `applyEntitlement` and `isProEntitlement`, and the rules for `entitlements`, `paymentRequests` and `playTokens`

- [ ] **Step 5: Run them to verify they pass**

Run: `npm --prefix functions run test -- src/payments/entitlement.test.ts`
Expected: PASS

Run: `npm run test:rules -- tests/rules/firestore.rules.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add functions/package.json functions/package-lock.json functions/src/payments/types.ts functions/src/payments/entitlement.ts functions/src/payments/entitlement.test.ts src/types/models.ts firestore.rules tests/rules/firestore.rules.test.ts firestore.indexes.json
git commit -m "feat(payments): entitlements, payment request rules and the claim writer"
```

---

### Task 2: Razorpay requests: plans, start, confirm and cancel

**Files:**
- Create: `functions/src/payments/razorpay.ts`
- Test: `functions/src/payments/razorpay.test.ts`
- Create: `functions/src/payments/requests.ts`
- Test: `functions/src/payments/requests.test.ts`
- Modify: `functions/src/index.ts`
- Modify: `functions/src/reminders.test.ts` (the `functions entry point` block only)
- Modify: `functions/.env.example`
- Modify: `.github/workflows/deploy.yml` (the step that writes `functions/.env`)

**Interfaces:**
- Consumes: `Entitlement`, `PaymentRequestKind`, `PlanKey`, `PlanInfo` from `functions/src/payments/types.ts` and `applyEntitlement()` from `functions/src/payments/entitlement.ts` (Task 1); the `paymentRequests` rules (Task 1); existing request-claiming pattern in `functions/src/ai/answer.ts` (part A).
- Produces (Tasks 3, and G2):

```ts
// functions/src/payments/razorpay.ts
export interface RazorpayApi {
  fetchPlan(planId: string): Promise<{ id: string; name: string; amount: number; currency: string; period: string }>;
  createSubscription(planId: string, notes: { uid: string }): Promise<{ id: string }>;
  fetchSubscription(id: string): Promise<{ id: string; planId: string; status: string; notes: { uid?: string }; currentEnd: number | null }>;
  cancelSubscription(id: string, atCycleEnd: true): Promise<void>;
  listActiveSubscriptions(): AsyncIterable<{ id: string; status: string; notes: { uid?: string } }>;
}
export function razorpayApi(keyId: string, keySecret: string): RazorpayApi;
export function verifyRazorpaySignature(paymentId: string, subscriptionId: string, signature: string, keySecret: string): boolean;
export const razorpayKeyId: StringParam;       // RAZORPAY_KEY_ID
export const razorpayKeySecret: SecretParam;   // RAZORPAY_KEY_SECRET
export const razorpayPlanMonthly: StringParam; // RAZORPAY_PLAN_MONTHLY, may be empty
export const razorpayPlanYearly: StringParam;  // RAZORPAY_PLAN_YEARLY, may be empty

// functions/src/payments/requests.ts
export interface PaymentDeps { db: Firestore; auth: ClaimsWriter; razorpay: RazorpayApi; keyId: string; keySecret: string; plans: Partial<Record<PlanKey, string>> }
export type PaymentHandler = (deps: PaymentDeps, uid: string, input: unknown, now: Date) => Promise<Record<string, unknown>>;
export const paymentHandlers: Partial<Record<PaymentRequestKind, PaymentHandler>>;   // G2 adds confirmPlay
export function runPaymentRequest(deps: PaymentDeps, requestId: string, now: Date): Promise<'done' | 'error' | 'skipped'>;
export const answerPaymentRequest: CloudFunction<...>;   // onDocumentCreated('paymentRequests/{requestId}')
```

**Spec:**
- §4.3: "**`listPlans`** fetches the plans named by the params `RAZORPAY_PLAN_MONTHLY` and `RAZORPAY_PLAN_YEARLY` (either may be empty) from Razorpay's API, and answers their names, amounts, currency and period. It never answers a plan that isn't configured."
- §4.3: "**`startRazorpay`** refuses an account that already has an active or cancelled paid entitlement, then creates a Razorpay subscription for the configured plan with `notes: { uid }`, and answers its id and the key id."
- §4.3: "checks `signature` as Razorpay's Subscriptions documentation specifies, an HMAC-SHA256 with `RAZORPAY_KEY_SECRET` over the payment and subscription ids, compared in constant time; the exact payload is confirmed against those docs when it is built;"
- §4.3: "fetches the subscription from Razorpay's API and requires that it exists, its `notes.uid` is the requester's, its plan is a configured one, and its status is `active` or `authenticated`;"
- §4.3: "Any failure is answered `error: 'unverified'` and changes nothing. Confirming the same subscription again changes nothing more."
- §4.3: "**`cancelRazorpay`** cancels the requester's Razorpay subscription at the end of the current cycle through Razorpay's API, and applies `status: 'cancelled'` with the same `expiresAt`."
- §5: "**Secrets**: `RAZORPAY_KEY_SECRET` in Secret Manager, bound only to `answerPaymentRequest` and `checkSubscriptions`; `RAZORPAY_KEY_ID` is a param (Checkout needs it in the browser)."

**Tags:** security, failure-paths

**Knowledge:** `integrations/razorpay` (new): subscriptions on the website, verified by signature and by Razorpay's own record, with the uid in the subscription's notes; `apps/functions`: `answerPaymentRequest`, triggered by `paymentRequests` documents, and still nothing answers HTTP; `operations/environment`: the Razorpay params and secret.

**Acceptance:**
- Given `RAZORPAY_PLAN_MONTHLY` is `plan_m` and `RAZORPAY_PLAN_YEARLY` is empty, and a fake Razorpay whose `plan_m` is "Pro monthly", `9900` paise, `INR`, monthly, when `listPlans` runs, then it answers exactly one plan `{ key: 'monthly', name: 'Pro monthly', amount: 9900, currency: 'INR', period: 'monthly' }`.
- Given an account with no paid entitlement, when `startRazorpay { planKey: 'monthly' }` runs, then the fake received `createSubscription('plan_m', { uid })` and the answer is `{ subscriptionId, keyId }`.
- Given `planKey: 'yearly'` with no yearly plan configured, then the answer is `error: 'no-plan'` and nothing is created.
- Given an account whose entitlement is `razorpay` and `active`, or `play` and `cancelled` with a future `expiresAt`, when `startRazorpay` runs, then the answer is `error: 'already-pro'` and nothing is created.
- Given `verifyRazorpaySignature` with a signature computed by the payload Razorpay's Subscriptions docs give, then `true`; with one byte changed, `false`; with a signature of the wrong length, `false` without throwing.
- Given a good signature and a fake subscription `{ status: 'active', notes: { uid }, planId: 'plan_m', currentEnd }`, when `confirmRazorpay` runs, then the entitlement is `{ source: 'razorpay', status: 'active', planKey: 'monthly', expiresAt: currentEnd, ref: subscriptionId }`, the claim is on, and the answer is `{ status: 'active' }`; `authenticated` is accepted the same.
- Given a bad signature, or a subscription whose `notes.uid` is another account's, or whose `planId` isn't configured, or whose status is `created`, then the answer is `error: 'unverified'` and the entitlement and claim are unchanged.
- Given a confirmed subscription confirmed again, then the entitlement is the same and the answer is `{ status: 'active' }`.
- Given the account has a `manual` entitlement, when a good `confirmRazorpay` runs, then the answer is `{ status: 'manual' }` and the entitlement stays manual.
- Given an active Razorpay entitlement, when `cancelRazorpay` runs, then the fake received `cancelSubscription(ref, true)`, the entitlement is `'cancelled'` with the same `expiresAt`, the claim stays on, and the answer is `{ endsAt }`; given no Razorpay entitlement, `error: 'nothing-to-cancel'`.
- Given the fake throws on any call, then the answer is `error: 'failed'` and nothing changes.
- Given a request already answered, when its trigger runs again, then nothing changes and it returns `'skipped'`.
- Given any request, when the function logs, then no line holds the signature, the full payment id, or an amount.
- Given the functions entry point, then `answerPaymentRequest` is exported with an event trigger on `paymentRequests/{requestId}` and the secret `RAZORPAY_KEY_SECRET`, and no export has an HTTP or callable trigger.

- [ ] **Step 1: Write the failing tests** for each Acceptance case: the signature and the API wrapper's mapping in `functions/src/payments/razorpay.test.ts`; each handler and `runPaymentRequest` in `functions/src/payments/requests.test.ts` against the Firestore emulator with a fake `RazorpayApi` and a fake `ClaimsWriter`; the entry point in `functions/src/reminders.test.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm --prefix functions run test -- src/payments/razorpay.test.ts src/payments/requests.test.ts src/reminders.test.ts`
Expected: FAIL on the new assertions

- [ ] **Step 3: Write the minimal implementation** to the Interfaces, confirming the subscription signature's payload against Razorpay's Subscriptions documentation before writing `verifyRazorpaySignature`

- [ ] **Step 4: Run them to verify they pass**

Run: `npm --prefix functions run test -- src/payments/razorpay.test.ts src/payments/requests.test.ts src/reminders.test.ts`
Expected: PASS

- [ ] **Step 5: Declare the params** in `functions/.env.example` (`RAZORPAY_KEY_ID`, `RAZORPAY_PLAN_MONTHLY`, `RAZORPAY_PLAN_YEARLY`, empty by default, each with a comment) and write them from repository variables in the deploy workflow's `functions/.env` step

- [ ] **Step 6: Commit**

```bash
git add functions/src/payments/razorpay.ts functions/src/payments/razorpay.test.ts functions/src/payments/requests.ts functions/src/payments/requests.test.ts functions/src/index.ts functions/src/reminders.test.ts functions/.env.example .github/workflows/deploy.yml
git commit -m "feat(payments): verify Razorpay subscriptions through payment requests"
```

---

### Task 3: The daily subscription check

**Files:**
- Create: `functions/src/payments/check.ts`
- Test: `functions/src/payments/check.test.ts`
- Modify: `functions/src/index.ts`
- Modify: `functions/src/reminders.test.ts` (the `functions entry point` block only)
- Modify: `README.md` (a new "Payments" section)

**Interfaces:**
- Consumes: `applyEntitlement()`, `Entitlement`, `PAYMENT_CHECK_CONCURRENCY` (Task 1); `RazorpayApi`, `razorpayApi()`, the Razorpay params and secret (Task 2).
- Produces:

```ts
// functions/src/payments/check.ts
export function runSubscriptionCheck(db: Firestore, auth: ClaimsWriter, razorpay: RazorpayApi, plans: Partial<Record<PlanKey, string>>, now: Date): Promise<{ checked: number; changed: number; failed: number }>;
export const checkSubscriptions: ScheduleFunction;   // 'every day 03:00', Asia/Kolkata
```

**Spec:**
- §4.4: "For every entitlement with `source: 'razorpay'` and `status` other than `'expired'`, fetches its subscription from Razorpay and applies what it says: `active` keeps it active with the new period end; `cancelled` or `completed` makes it `'cancelled'` until `expiresAt`; `halted` or `expired` makes it `'expired'`."
- §4.4: "For a subscription that Razorpay reports active with `notes.uid` but whose account has no entitlement (a confirm that never arrived), applies it as `confirmRazorpay` would."
- §4.4: "For every paid entitlement whose `expiresAt` has passed, applies `'expired'`."
- §4.4: "Handles `PAYMENT_CHECK_CONCURRENCY = 10` at a time; one account's failure never stops the others."
- §7: "The README gains a "Payments" section with the owner's one-time steps:"

**Tags:** security, failure-paths

**Knowledge:** `domain/subscriptions` (new): how each Razorpay status maps to an entitlement, that manual grants are never touched, and that a missed confirm is picked up within a day; `operations/deploy`: the Razorpay and Play one-time setup.

**Acceptance:**
- Given a Razorpay entitlement `active` with `expiresAt` `2026-12-03`, when the fake reports `active` with a new `currentEnd` of `2027-01-03`, then the entitlement is `active` with `expiresAt` `2027-01-03`.
- Given the fake reports `cancelled` or `completed`, then the entitlement is `'cancelled'` with the same `expiresAt`, and the claim stays on until then.
- Given the fake reports `halted` or `expired`, then the entitlement is `'expired'` and the claim is off.
- Given a Razorpay entitlement `'cancelled'` whose `expiresAt` has passed, and a Play entitlement `'active'` whose `expiresAt` has passed, then both become `'expired'`.
- Given a `manual` entitlement, then it is never read from Razorpay and never changed.
- Given Razorpay lists an active subscription with `notes.uid` of an account that has no entitlement, and a configured plan, then that account gets an active Razorpay entitlement and the claim; with a plan that isn't configured, nothing.
- Given three entitlements where the fake throws for the second, then the first and third are applied and the run returns `failed: 1`.
- Given the functions entry point, then `checkSubscriptions` runs `every day 03:00` in `Asia/Kolkata` with the secret `RAZORPAY_KEY_SECRET`, and still no export is HTTP or callable.

- [ ] **Step 1: Write the failing tests** for each Acceptance case: the run in `functions/src/payments/check.test.ts` against the Firestore emulator with a fake `RazorpayApi` and a fake `ClaimsWriter`; the entry point in `functions/src/reminders.test.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm --prefix functions run test -- src/payments/check.test.ts src/reminders.test.ts`
Expected: FAIL on the new assertions

- [ ] **Step 3: Write the minimal implementation** to the Interfaces, and export `checkSubscriptions` from `functions/src/index.ts`

- [ ] **Step 4: Run them to verify they pass**

Run: `npm --prefix functions run test -- src/payments/check.test.ts src/reminders.test.ts`
Expected: PASS

- [ ] **Step 5: Write the README's "Payments" section** with every step in the spec's §7: Razorpay KYC, UPI Autopay switched on in test and live mode, the plans, the params and the secret; the Play Console steps (for G2); terms, refund and privacy policies and GST; and the TTL policy on `paymentRequests.expireAt`

- [ ] **Step 6: Commit**

```bash
git add functions/src/payments/check.ts functions/src/payments/check.test.ts functions/src/index.ts functions/src/reminders.test.ts README.md
git commit -m "feat(payments): re-check Razorpay subscriptions every day"
```

---

### Task 4: Manual grants through the entitlement

**Files:**
- Modify: `functions/src/admin/pro.ts`
- Test: `functions/src/admin/pro.test.ts`
- Modify: `functions/scripts/grant-pro.ts`

**Interfaces:**
- Consumes: `applyEntitlement()` and `ClaimsWriter` from `functions/src/payments/entitlement.ts` (Task 1); existing `setPro(auth, email, on)` (part A).
- Produces: `setPro(auth: ProAuth, db: Firestore, email: string, on: boolean, now: Date): Promise<{ uid: string; pro: boolean }>`; `functions/scripts/grant-pro.ts` passes the Admin SDK's Firestore. Its output and arguments are unchanged.

**Spec:**
- §4.1: "**Part A's admin script** (`functions/src/admin/pro.ts`) writes a manual entitlement through `applyEntitlement` when it grants, and marks it `'expired'` when it revokes."

**Tags:** security

**Knowledge:** `security/roles`: granting Pro by hand writes a manual entitlement, which payments never replace.

**Acceptance:**
- Given `setPro(auth, db, ' Alice@Example.com ', true, now)`, then the entitlement of that account is `{ source: 'manual', status: 'active', planKey: null, expiresAt: null, ref: null }` and its claim is on, keeping its other claims.
- Given that account revoked, then its entitlement is `{ source: 'manual', status: 'expired' }` and its claim is off.
- Given an account with an active Razorpay entitlement, when Pro is granted by hand, then the entitlement becomes manual and active; when that manual grant is later revoked, it is `'expired'`, and the next daily check (Task 3) or confirm can apply a paid one again.
- Given part A's cases for `setPro` (email normalised, unknown email refused, usage message), when the tests run, then they still pass with the new signature.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `functions/src/admin/pro.test.ts`, against the Firestore emulator with a fake `ProAuth`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm --prefix functions run test -- src/admin/pro.test.ts`
Expected: FAIL on the new assertions

- [ ] **Step 3: Write the minimal implementation**: `setPro` applies a manual entitlement through `applyEntitlement`, and `functions/scripts/grant-pro.ts` passes Firestore

- [ ] **Step 4: Run them to verify they pass**

Run: `npm --prefix functions run test -- src/admin/pro.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add functions/src/admin/pro.ts functions/src/admin/pro.test.ts functions/scripts/grant-pro.ts
git commit -m "feat(payments): grant Pro by hand through a manual entitlement"
```

---

### Task 5: Get Pro, the Pro card and Razorpay Checkout

**Files:**
- Create: `src/services/payments.ts`
- Test: `src/services/payments.test.ts`
- Create: `src/stores/payments.ts`
- Modify: `src/stores/session.ts`
- Test: `src/stores/session.test.ts`
- Create: `src/lib/razorpayCheckout.ts`
- Create: `src/lib/platform.ts`
- Create: `src/views/ProView.vue`
- Test: `src/views/ProView.test.ts`
- Create: `src/components/profile/ProCard.vue`
- Test: `src/components/profile/ProCard.test.ts`
- Modify: `src/views/ProfileView.vue`
- Modify: `src/router/index.ts`
- Modify: `firebase.json` (the Content Security Policy)
- Test: `tests/hosting/headers.test.ts`
- Create: `src/i18n/locales/en/pro.json`
- Create: `src/i18n/locales/hi/pro.json`

**Interfaces:**
- Consumes: `Entitlement`, `PaymentRequestKind`, `PlanKey`, `PlanInfo` from `src/types/models.ts` (Task 1); the `entitlements` and `paymentRequests` rules (Task 1); existing `isPro`, the per-user store reset and `getIdToken` in `src/stores/session.ts` (part A); existing route `meta` and guard; existing `tests/hosting/headers.test.ts` (part C). This task's tests write each answer and entitlement straight into the emulator, so they need no function running.
- Produces:

```ts
// src/services/payments.ts
export function watchEntitlement(uid: string, onChange: (e: Entitlement | null) => void): () => void;
export function requestPayment(uid: string, kind: PaymentRequestKind, input: Record<string, string>): Promise<string>;   // the request id
export function watchPaymentRequest(id: string, onChange: (answer: { status: string; result?: Record<string, unknown>; error?: string }) => void): () => void;

// src/lib/platform.ts (G2's playBilling.ts uses it)
export function isAndroidApp(): boolean;   // the Digital Goods API is present, or the TWA referrer

// src/lib/razorpayCheckout.ts
export function openCheckout(options: { keyId: string; subscriptionId: string; name: string }): Promise<{ paymentId: string; subscriptionId: string; signature: string } | 'closed' | 'failed'>;

// src/stores/payments.ts
export const usePaymentsStore: StoreDefinition<'payments', ...>;
// state: entitlement, plans, busy, error; actions: loadPlans(), subscribe(planKey), cancel()
```

**Spec:**
- §3.1: "On the profile screen, an account without Pro sees a "Get Pro" card: "AI help for your tasks: fill from text, suggestions, voice and photos, daily plans and more." with a "See plans" button to `/pro`."
- §3.1: "**`/pro`** (`src/views/ProView.vue`), for signed-in accounts without Pro; an account with Pro is sent to `/profile`."
- §3.1: "While the plans load, a progress indicator; if they can't load, "Plans didn't load." with Try again."
- §3.1: "With no plan configured for the current place, "Pro isn't available here yet.""
- §3.2: "When Checkout reports success, the screen says "Confirming your payment…" until the server has verified it (§4.3), then "You're on Pro." and goes to `/profile`."
- §3.2: "If the person closes Checkout, nothing happens and the plans stay. If Checkout reports a failure, "The payment didn't go through. Nothing was charged.""
- §3.2: "If the server can't verify it, "We couldn't confirm that payment. If you were charged, it will be refunded or your Pro will start within a day.""
- §3.2: "Inside the Android app, the website's checkout is never shown, even if the page is opened there."
- §3.4: "**Razorpay**: "Renews on <date>" or, once cancelled, "Ends on <date>"; a "Cancel subscription" button, which asks "Cancel Pro? You'll keep it until <date>." with Cancel subscription and Keep."
- §3.4: "A failed cancel: "Couldn't cancel. Try again.""
- §3.4: "**Manual**: "Pro, given to this account." and nothing to manage."
- §3.4: "An account on Razorpay that opens the Android app sees "Manage on the website" instead of a cancel button, and the reverse for Play on the website."
- §4.2: "When it changes, the store refreshes the ID token once (`getIdToken(true)`), so `isPro` (part A §4.1) follows a purchase or an expiry without signing out."
- §4.3: "The Content Security Policy in `firebase.json` adds Razorpay's checkout script, frame and API origins to `script-src`, `frame-src` and `connect-src`, and nothing else."

**Tags:** screen, failure-paths, security

**Knowledge:** `features/pro` (new): the Get Pro card, `/pro` and the Pro card, by source and status; `security/data-protection`: the CSP allows Razorpay's checkout origins and no payment detail reaches the app; `features/profile-and-labels`: the profile shows the Get Pro or Pro card.

**Acceptance:**
- Given an account without Pro, then the profile shows the Get Pro card with "AI help for your tasks: fill from text, suggestions, voice and photos, daily plans and more." and "See plans" opens `/pro`; with Pro, the Pro card instead.
- Given an account with Pro, when it opens `/pro`, then it lands on `/profile`.
- Given `/pro` on the website, then a `listPlans` request is made and a progress indicator shows; given the answer has one monthly plan of `9900` paise INR, then it shows "Pro monthly" priced "₹99.00" (formatted for the app's language) and "Subscribe"; given the answer has none, "Pro isn't available here yet."; given `error: 'failed'`, "Plans didn't load." with Try again, which asks again.
- Given "Subscribe" is pressed, then a `startRazorpay` request is made, and with its answer Checkout is opened with that subscription id and key id.
- Given Checkout returns `'closed'`, then nothing more happens and the plans stay; `'failed'`, then "The payment didn't go through. Nothing was charged."
- Given Checkout returns the three ids, then a `confirmRazorpay` request is made with them and "Confirming your payment…" shows; given its answer `{ status: 'active' }`, "You're on Pro." and the app goes to `/profile`; given `error: 'unverified'`, "We couldn't confirm that payment. If you were charged, it will be refunded or your Pro will start within a day."
- Given `isAndroidApp()` is true, when `/pro` opens, then Razorpay's script is never loaded and no `startRazorpay` request is possible.
- Given a Razorpay entitlement `active` until `2026-12-03`, then the Pro card says "Renews on 3 Dec 2026" with "Cancel subscription"; pressing it asks "Cancel Pro? You'll keep it until 3 Dec 2026."; Keep closes it; Cancel subscription makes a `cancelRazorpay` request, and its failure shows "Couldn't cancel. Try again."
- Given `'cancelled'` until `2026-12-03`, then the card says "Ends on 3 Dec 2026" and has no cancel button.
- Given a manual entitlement, then the card says "Pro, given to this account." and nothing else.
- Given a Razorpay entitlement inside the Android app, then the card says "Manage on the website" instead of a cancel button; given a Play entitlement on the website, the same.
- Given the entitlement document changes while signed in, then the session store calls `getIdToken(true)` once, and `isPro` follows the new claim.
- Given the user signs out, then the payments store is reset with the other per-user stores.
- Given `firebase.json`, then the CSP's `script-src`, `frame-src` and `connect-src` each also allow Razorpay's origins (as Razorpay's Checkout documentation lists them), and no other directive changes; the `Permissions-Policy` stays as part C left it.
- Given each new string, then `en/pro.json` and `hi/pro.json` have the same keys, and the Hindi says the same as the English.

- [ ] **Step 1: Write the failing tests** for each Acceptance case: the service in `src/services/payments.test.ts` against the emulators; the token refresh and reset in `src/stores/session.test.ts`; the screen in `src/views/ProView.test.ts` and the card in `src/components/profile/ProCard.test.ts`, with `openCheckout` and `isAndroidApp` replaced and each answer written into the emulator; the CSP in `tests/hosting/headers.test.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/services/payments.test.ts src/stores/session.test.ts src/views/ProView.test.ts src/components/profile/ProCard.test.ts tests/hosting/headers.test.ts`
Expected: FAIL on the new assertions

- [ ] **Step 3: Write the minimal implementation** to the Interfaces: the service, the store, the token refresh in the session store, `platform.ts`, `razorpayCheckout.ts` (loading Razorpay's script only when called), the view and its route, the card on the profile, the CSP origins (from Razorpay's Checkout documentation), and the strings

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/services/payments.test.ts src/stores/session.test.ts src/views/ProView.test.ts src/components/profile/ProCard.test.ts tests/hosting/headers.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/payments.ts src/services/payments.test.ts src/stores/payments.ts src/stores/session.ts src/stores/session.test.ts src/lib/razorpayCheckout.ts src/lib/platform.ts src/views/ProView.vue src/views/ProView.test.ts src/components/profile/ProCard.vue src/components/profile/ProCard.test.ts src/views/ProfileView.vue src/router/index.ts firebase.json tests/hosting/headers.test.ts src/i18n/locales/en/pro.json src/i18n/locales/hi/pro.json
git commit -m "feat(payments): Get Pro on the web with Razorpay Checkout"
```
