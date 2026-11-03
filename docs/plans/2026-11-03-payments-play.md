# Payments G2: Buying Pro in the Android App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:implement-with-subagents by default, or ga:implement. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An account without Pro can buy it inside the Android app through Google Play Billing, verified by the function with Google before Pro is granted, and kept in step with Play's renewals and cancellations.

**Architecture:** The TWA gains Play Billing through android-browser-helper's billing extension. The web app, when the Digital Goods API is present, reads the plans' prices from Play and buys through `PaymentRequest`, then sends the purchase token in a `confirmPlay` payment request; the function checks it with the Android Publisher API, ties it to one account, acknowledges it and applies the entitlement. Play's real-time notifications arrive on a Pub/Sub topic and update the entitlement.

**Tech Stack:** Vue 3 + Vuetify + Pinia + vue-i18n (web app at the repository root); the Digital Goods and Payment Request APIs in Chrome; Firebase Auth and Firestore; Cloud Functions on Node 22 with firebase-functions v2 and Pub/Sub triggers (`functions/`); `@googleapis/androidpublisher` (new, in `functions/`); the Android TWA (`packages/android/source`, android-browser-helper `2.5.0`, Gradle); Vitest against the Firebase emulators; GitHub Actions (`.github/workflows/deploy.yml`).

**Spec:** `docs/specs/2026-11-03-payments.md`

## Global Constraints

- Build after G1 (`docs/plans/2026-11-03-payments-web.md`) is merged. This plan consumes its entitlements, payment requests, `paymentHandlers`, `applyEntitlement`, `isAndroidApp()`, the `/pro` screen and the Pro card.
- §1: "Pro is granted only after the server has verified the payment with the provider itself; nothing the app reports is trusted on its own."
- §1: "Inside the Android app only Play Billing is offered; on the website only Razorpay."
- §1: "No function answers HTTP or callable requests."
- §5: "Google's API is called with the functions' service account; no Google key is stored."
- §5: "**Logs** name the request id, kind, outcome and provider status; never a signature, token, payment id in full, or amount tied to an account."
- No test calls Google; the Android Publisher API and the Digital Goods API are replaced by fakes (§6).
- Every visible string is in `src/i18n/locales/en/pro.json` and `src/i18n/locales/hi/pro.json`, with the same keys.
- No `any` and no `@ts-ignore`.

## Checkpoints

None. The policy's `run.checkpoints` is `none`, and this plan adds no stop. The spec recommends a security review of the branch once G1 and G2 are built; the developer asks for it when they want it.

---

### Task 1: Foundation: dependency, Play contracts and the build-time product id

**Files:**
- Modify: `functions/package.json` (dependency `@googleapis/androidpublisher`)
- Modify: `functions/package-lock.json`
- Create: `functions/src/payments/playTypes.ts`
- Test: `functions/src/payments/playTypes.test.ts`
- Modify: `.env.example`
- Modify: `.env.ci`
- Modify: `.github/workflows/deploy.yml` (the web build's environment)
- Test: `tests/hosting/env.test.ts`

**Interfaces:**
- Consumes: existing `Entitlement`, `PlanKey` (G1); the deploy workflow's list of `VITE_*` variables.
- Produces, in `functions/src/payments/playTypes.ts` (Tasks 2, 3):

```ts
export interface PlayTokenDoc { uid: string; productId: string; linkedAt: Timestamp }
export type PlaySubscriptionState =
  | 'SUBSCRIPTION_STATE_ACTIVE' | 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD' | 'SUBSCRIPTION_STATE_ON_HOLD'
  | 'SUBSCRIPTION_STATE_PAUSED' | 'SUBSCRIPTION_STATE_CANCELED' | 'SUBSCRIPTION_STATE_EXPIRED' | 'SUBSCRIPTION_STATE_PENDING';
export interface PlaySubscription {
  state: PlaySubscriptionState; acknowledged: boolean;
  lineItems: { productId: string; basePlanId: string; expiryTime: string }[];
}
export function tokenHash(purchaseToken: string): string;   // SHA-256 hex
```

- Produces, for the app (Task 5): the build-time setting `VITE_PLAY_SUBSCRIPTION_ID`, empty by default, declared in `.env.example` and `.env.ci`, read as `import.meta.env.VITE_PLAY_SUBSCRIPTION_ID` as `src/lib/firebase.ts` reads the others, and set from the repository variable `VITE_PLAY_SUBSCRIPTION_ID` in the deploy workflow's web build.

**Spec:**
- §4.6: "reads the details of `PLAY_SUBSCRIPTION_ID`'s base plans (the app's build-time config `VITE_PLAY_SUBSCRIPTION_ID`)"
- §5: "**No payment data is stored or seen.** Razorpay Checkout and Play take payment details; the app's database holds only ids, a token hash, statuses and dates."

**Tags:** security

**Knowledge:** `operations/environment`: `VITE_PLAY_SUBSCRIPTION_ID` names the Play subscription the app offers, and only a token's hash is stored.

**Acceptance:**
- Given `tokenHash('abc')`, then it returns the 64-character SHA-256 hex of `abc`; the same token always gives the same hash, and two tokens give different ones.
- Given `.env.example` and `.env.ci`, then each declares `VITE_PLAY_SUBSCRIPTION_ID` with an empty value and a comment saying what it names.
- Given the deploy workflow, then its web build sets `VITE_PLAY_SUBSCRIPTION_ID` from the repository variable of that name, beside the other `VITE_*` values, and its check for missing variables doesn't fail when it is empty.

- [ ] **Step 1: Add the dependency and the contracts**: install `@googleapis/androidpublisher` in `functions/`, and write `functions/src/payments/playTypes.ts` to the Interfaces

Run: `npm --prefix functions install @googleapis/androidpublisher`
Expected: `functions/package.json` and `functions/package-lock.json` list it

- [ ] **Step 2: Write the failing tests** for each Acceptance case: `tokenHash` in `functions/src/payments/playTypes.test.ts`; the env declarations and the workflow in `tests/hosting/env.test.ts`, reading the files from the repository root

- [ ] **Step 3: Run them to verify they fail**

Run: `npm --prefix functions run test -- src/payments/playTypes.test.ts`
Expected: FAIL on the assertions

Run: `npm test -- tests/hosting/env.test.ts`
Expected: FAIL: the variable isn't declared yet

- [ ] **Step 4: Write `tokenHash`, and declare the variable** in `.env.example`, `.env.ci` and the deploy workflow

- [ ] **Step 5: Run them to verify they pass**

Run: `npm --prefix functions run test -- src/payments/playTypes.test.ts`
Expected: PASS

Run: `npm test -- tests/hosting/env.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add functions/package.json functions/package-lock.json functions/src/payments/playTypes.ts functions/src/payments/playTypes.test.ts .env.example .env.ci .github/workflows/deploy.yml tests/hosting/env.test.ts
git commit -m "feat(payments): Play contracts and the app's subscription id"
```

---

### Task 2: Confirming a Play purchase

**Files:**
- Create: `functions/src/payments/play.ts`
- Test: `functions/src/payments/play.test.ts`
- Modify: `functions/src/payments/requests.ts`
- Test: `functions/src/payments/requests.test.ts`
- Modify: `functions/.env.example`
- Modify: `firestore.rules`
- Test: `tests/rules/firestore.rules.test.ts`

**Interfaces:**
- Consumes: `PlayTokenDoc`, `PlaySubscription`, `tokenHash()` (Task 1); `applyEntitlement()`, `paymentHandlers`, `PaymentDeps`, `runPaymentRequest()` (G1).
- Produces (Task 3):

```ts
// functions/src/payments/play.ts
export interface PlayApi {
  getSubscription(packageName: string, purchaseToken: string): Promise<PlaySubscription>;
  acknowledge(packageName: string, productId: string, purchaseToken: string): Promise<void>;
}
export function playApi(): PlayApi;   // the functions' service account
export const playPackageName: StringParam;     // PLAY_PACKAGE_NAME
export const playSubscriptionId: StringParam;  // PLAY_SUBSCRIPTION_ID
export function planKeyFromBasePlan(basePlanId: string): PlanKey | null;   // 'monthly' | 'yearly' by the base plan's id
export function entitlementFromPlay(sub: PlaySubscription, productId: string, hash: string): Omit<Entitlement, 'updatedAt'> | null;
```

`PaymentDeps` gains `play: PlayApi`, `packageName` and `subscriptionId`; `paymentHandlers.confirmPlay` is added. G1's `paymentRequests` create rule accepts four kinds; this task adds `confirmPlay` with `input` `{ productId, purchaseToken }`, each a string of 1–200 characters, to `firestore.rules` and its tests.

**Spec:**
- §4.6: "refuses a `productId` that isn't `PLAY_SUBSCRIPTION_ID`;"
- §4.6: "checks the token with the Android Publisher API (`purchases.subscriptionsv2.get` for the package `PLAY_PACKAGE_NAME`) using the function's service account, which the owner grants access in the Play Console; requires `SUBSCRIPTION_STATE_ACTIVE` (or in grace period);"
- §4.6: "in one transaction, ties the token's hash to the requester in `playTokens/{tokenHash}`; a token already tied to another account is refused;"
- §4.6: "acknowledges the purchase if it isn't yet;"
- §4.6: "applies the entitlement: `source: 'play'`, `status: 'active'`, `planKey` from the base plan, `expiresAt` from the line item's expiry, `ref` the token's hash."
- §4.6: "Any failure answers `error: 'unverified'` and changes nothing."

**Tags:** security, failure-paths

**Knowledge:** `integrations/google-play-billing` (new): purchases checked with the Android Publisher API by the functions' service account, one token tied to one account, and acknowledged by the function.

**Acceptance:**
- Given `PLAY_SUBSCRIPTION_ID` is `pro`, a fake Play subscription `{ state: 'SUBSCRIPTION_STATE_ACTIVE', acknowledged: false, lineItems: [{ productId: 'pro', basePlanId: 'monthly', expiryTime: '2026-12-03T00:00:00Z' }] }`, when `confirmPlay { productId: 'pro', purchaseToken: 'tok' }` runs, then `playTokens/<tokenHash('tok')>` holds `{ uid, productId: 'pro' }`, the fake received `acknowledge` once, the entitlement is `{ source: 'play', status: 'active', planKey: 'monthly', expiresAt: 2026-12-03, ref: tokenHash('tok') }`, the claim is on, and the answer is `{ status: 'active' }`.
- Given `SUBSCRIPTION_STATE_IN_GRACE_PERIOD`, then it is accepted the same; given `ON_HOLD`, `PENDING` or `EXPIRED`, then `error: 'unverified'` and nothing changes.
- Given `acknowledged: true`, then `acknowledge` isn't called.
- Given `productId: 'other'`, then `error: 'unverified'` and the fake isn't called.
- Given the token is already tied to another account in `playTokens`, then `error: 'unverified'` and the other account's entitlement and this one's are unchanged; given it is tied to this account, the confirm succeeds again with nothing new written.
- Given the fake throws, then `error: 'unverified'` and nothing changes.
- Given a base plan id `yearly`, then `planKey` is `'yearly'`; an unknown base plan id gives `error: 'unverified'`.
- Given the account has a `manual` entitlement, then the token is tied and acknowledged, and the answer is `{ status: 'manual' }` with the entitlement unchanged.
- Given any confirm, when the function logs, then no line holds the purchase token.
- Given the rules, when the owner creates `confirmPlay` with `{ productId: 'pro', purchaseToken: <200 characters> }`, then it is allowed; with an empty or 201-character token, or an extra key, it is refused.

- [ ] **Step 1: Write the failing tests** for each Acceptance case: the mapping and the handler in `functions/src/payments/play.test.ts` and `functions/src/payments/requests.test.ts`, against the Firestore emulator with a fake `PlayApi`; the rule cases in `tests/rules/firestore.rules.test.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm --prefix functions run test -- src/payments/play.test.ts src/payments/requests.test.ts`
Expected: FAIL on the new assertions; G1's cases pass

Run: `npm run test:rules -- tests/rules/firestore.rules.test.ts`
Expected: FAIL on the new allowed case

- [ ] **Step 3: Write the minimal implementation** to the Interfaces: `play.ts`, the `confirmPlay` handler, the rule for the new kind, and `PLAY_PACKAGE_NAME` and `PLAY_SUBSCRIPTION_ID` in `functions/.env.example` with comments

- [ ] **Step 4: Run them to verify they pass**

Run: `npm --prefix functions run test -- src/payments/play.test.ts src/payments/requests.test.ts`
Expected: PASS

Run: `npm run test:rules -- tests/rules/firestore.rules.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add functions/src/payments/play.ts functions/src/payments/play.test.ts functions/src/payments/requests.ts functions/src/payments/requests.test.ts functions/.env.example firestore.rules tests/rules/firestore.rules.test.ts
git commit -m "feat(payments): confirm Play purchases with the Android Publisher API"
```

---

### Task 3: Play's real-time notifications

**Files:**
- Create: `functions/src/payments/playNotifications.ts`
- Test: `functions/src/payments/playNotifications.test.ts`
- Modify: `functions/src/index.ts`
- Modify: `functions/src/reminders.test.ts` (the `functions entry point` block only)
- Modify: `README.md` (the "Payments" section)

**Interfaces:**
- Consumes: `PlayTokenDoc`, `tokenHash()` (Task 1); `PlayApi`, `playApi()`, `entitlementFromPlay()`, the Play params (Task 2); `applyEntitlement()` (G1).
- Produces:

```ts
// functions/src/payments/playNotifications.ts
export function handlePlayNotification(db: Firestore, auth: ClaimsWriter, play: PlayApi, packageName: string, message: unknown, now: Date): Promise<'applied' | 'ignored'>;
export const onPlayNotification: CloudFunction<...>;   // onMessagePublished(PLAY_RTDN_TOPIC)
export const playRtdnTopic: StringParam;               // PLAY_RTDN_TOPIC, default 'play-billing'
```

**Spec:**
- §4.6: "**`onPlayNotification`**, a Pub/Sub trigger on the topic named by `PLAY_RTDN_TOPIC` (`play-billing`), receives Play's real-time developer notifications, looks the token up in `playTokens`, fetches its current state from the Android Publisher API, and applies it: renewed keeps it active with the new expiry; cancelled makes it `'cancelled'`; expired, revoked or on hold makes it `'expired'`. A notification for an unknown token, or one that fails to parse, is logged by its type only and ignored."
- §7: "Play: the subscription and its base plans (and any trial offer) created in the Play Console; the functions' service account given financial-data access; real-time developer notifications pointed at the Pub/Sub topic `play-billing`; `PLAY_PACKAGE_NAME` and `PLAY_SUBSCRIPTION_ID` set; the new app version released."

**Tags:** security, failure-paths

**Knowledge:** `domain/subscriptions`: how each Play notification and subscription state maps to an entitlement; `apps/functions`: `onPlayNotification`, a Pub/Sub trigger, and still nothing answers HTTP; `operations/deploy`: the Play Console steps.

**Acceptance:**
- Given a token tied to an account with an active Play entitlement, when a notification `{ subscriptionNotification: { notificationType: 2 (renewed), purchaseToken } }` arrives and the fake reports `ACTIVE` with a later expiry, then the entitlement is active with that expiry.
- Given the fake reports `SUBSCRIPTION_STATE_CANCELED` with a future expiry, then the entitlement is `'cancelled'` with that expiry and the claim stays on.
- Given the fake reports `EXPIRED` or `ON_HOLD`, or the notification is a revocation, then the entitlement is `'expired'` and the claim is off.
- Given a notification whose token isn't in `playTokens`, then nothing changes and it returns `'ignored'`; given a message that isn't valid JSON or has no `subscriptionNotification`, the same, and the log names only the notification type, or "unparseable".
- Given a test notification (`testNotification`), then it is ignored and logged as a test.
- Given the account has a `manual` entitlement, then a Play notification leaves it unchanged.
- Given the functions entry point, then `onPlayNotification` is exported with a Pub/Sub trigger on `play-billing`, and no export has an HTTP or callable trigger.

- [ ] **Step 1: Write the failing tests** for each Acceptance case: the handler in `functions/src/payments/playNotifications.test.ts` against the Firestore emulator with a fake `PlayApi` and a fake `ClaimsWriter`; the entry point in `functions/src/reminders.test.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm --prefix functions run test -- src/payments/playNotifications.test.ts src/reminders.test.ts`
Expected: FAIL on the new assertions

- [ ] **Step 3: Write the minimal implementation** to the Interfaces, and export `onPlayNotification` from `functions/src/index.ts`

- [ ] **Step 4: Run them to verify they pass**

Run: `npm --prefix functions run test -- src/payments/playNotifications.test.ts src/reminders.test.ts`
Expected: PASS

- [ ] **Step 5: Complete the README's "Payments" section** with the Play Console steps in the spec's §7, if G1 left any out

- [ ] **Step 6: Commit**

```bash
git add functions/src/payments/playNotifications.ts functions/src/payments/playNotifications.test.ts functions/src/index.ts functions/src/reminders.test.ts README.md
git commit -m "feat(payments): follow Play renewals and cancellations by Pub/Sub"
```

---

### Task 4: Play Billing in the Android app

**Files:**
- Modify: `packages/android/source/app/build.gradle` (the billing dependency and a new `versionCode`)
- Modify: `packages/android/source/app/src/main/AndroidManifest.xml`
- Modify: `packages/android/source/app/src/main/java/app/web/spanion_todo/twa/DelegationService.java`
- Test: `tests/android/billing.test.ts`

**Interfaces:**
- Consumes: existing android-browser-helper `2.5.0` and `DelegationService.java` in the TWA.
- Produces: an app build whose Trusted Web Activity answers the Digital Goods API, which Task 5's `playBilling.ts` uses.

**Spec:**
- §4.6: "**The Android project** (`packages/android/source`) adds android-browser-helper's billing extension (`com.google.androidbrowserhelper:billing`), its delegation service and payment activity, as Google's TWA guide describes, checked against the current guide when it is built, and a new version code."

**Tags:** not security: it adds Google's billing library to the app shell; no secret, account data or payment detail passes through this project's code

**Knowledge:** `apps/android-twa`: the app includes Play Billing through android-browser-helper's billing extension, so the site can sell subscriptions inside it.

**Acceptance:**
- Given `app/build.gradle`, then it depends on `com.google.androidbrowserhelper:billing` at the version Google's current TWA guide names for android-browser-helper `2.5.0`, and its `versionCode` is one more than before.
- Given `AndroidManifest.xml`, then it declares the billing extension's payment activity and its `IS_READY_TO_PAY` service as the guide gives them, and nothing it declared before is removed.
- Given `DelegationService.java`, then its constructor registers the billing extension's Digital Goods request handler, as the guide shows.

- [ ] **Step 1: Read Google's current "Use Play Billing in your Trusted Web Activity" guide**, and note the exact dependency, activity, service and handler names it gives for this android-browser-helper version

- [ ] **Step 2: Write the failing test** for each Acceptance case, in `tests/android/billing.test.ts`, reading `build.gradle`, `AndroidManifest.xml` and `DelegationService.java` as text and checking for the names from Step 1

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test -- tests/android/billing.test.ts`
Expected: FAIL: the names aren't there yet

- [ ] **Step 4: Make the three changes** with the names from Step 1

- [ ] **Step 5: Run it to verify it passes**

Run: `npm test -- tests/android/billing.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/android/source/app/build.gradle packages/android/source/app/src/main/AndroidManifest.xml packages/android/source/app/src/main/java/app/web/spanion_todo/twa/DelegationService.java tests/android/billing.test.ts
git commit -m "feat(android): add Play Billing to the Trusted Web Activity"
```

---

### Task 5: Buying and managing Pro in the app

**Files:**
- Create: `src/lib/playBilling.ts`
- Test: `src/lib/playBilling.test.ts`
- Modify: `src/lib/platform.ts`
- Modify: `src/stores/payments.ts`
- Modify: `src/views/ProView.vue`
- Test: `src/views/ProView.test.ts`
- Modify: `src/components/profile/ProCard.vue`
- Test: `src/components/profile/ProCard.test.ts`
- Modify: `src/i18n/locales/en/pro.json`
- Modify: `src/i18n/locales/hi/pro.json`

**Interfaces:**
- Consumes: `VITE_PLAY_SUBSCRIPTION_ID` (Task 1); the `confirmPlay` kind and its rule (Task 2); existing `isAndroidApp()`, `requestPayment()`, `watchPaymentRequest()`, `usePaymentsStore`, `ProView.vue` and `ProCard.vue` (G1).
- Produces:

```ts
// src/lib/playBilling.ts
export function hasDigitalGoods(): boolean;
export function playPlans(subscriptionId: string): Promise<PlanInfo[]>;   // from the Digital Goods service's details
export function buyOnPlay(subscriptionId: string, planKey: PlanKey): Promise<{ purchaseToken: string } | 'closed' | 'failed'>;
export const PLAY_SUBSCRIPTIONS_URL: (packageName: string, productId: string) => string;
```

**Spec:**
- §3.3: "The plans come from Play through the Digital Goods API (§4.6). "Subscribe" opens Play's purchase sheet."
- §3.3: "After Play reports the purchase, "Confirming your purchase…", then "You're on Pro." as on the web. If the server refuses the token, "We couldn't confirm that purchase. If you were charged, Google Play will refund it.""
- §3.3: "In a browser without the Digital Goods API inside the app (an old Chrome), "Update Chrome to subscribe in the app.""
- §3.4: "**Play**: "Renews on <date>" or "Ends on <date>", and "Manage in Google Play", opening Play's subscriptions page for the app's package."
- §3.4: "An account on Razorpay that opens the Android app sees "Manage on the website" instead of a cancel button, and the reverse for Play on the website."

**Tags:** screen, failure-paths, security

**Knowledge:** `features/pro`: inside the Android app, plans and purchases come from Google Play, and a Play subscription is managed in the Play Store.

**Acceptance:**
- Given a fake Digital Goods service whose details for `pro` give a monthly base plan at "₹129.00", when `/pro` opens inside the app, then it shows that plan and price, and no `listPlans` request is made and Razorpay's script isn't loaded.
- Given "Subscribe" is pressed, then a `PaymentRequest` with the Play billing method and the plan's id is shown; given it returns a purchase token, then a `confirmPlay` request is made with `{ productId: 'pro', purchaseToken }` and "Confirming your purchase…" shows; given its answer `{ status: 'active' }`, "You're on Pro." and the app goes to `/profile`.
- Given the purchase sheet is closed, then nothing more happens; given it fails, then "The payment didn't go through. Nothing was charged."; given the confirm answers `error: 'unverified'`, then "We couldn't confirm that purchase. If you were charged, Google Play will refund it."
- Given the app is the Android app (by its referrer) but `getDigitalGoodsService` is missing, then `/pro` says "Update Chrome to subscribe in the app." and offers no plan.
- Given `VITE_PLAY_SUBSCRIPTION_ID` is empty inside the app, then `/pro` says "Pro isn't available here yet."
- Given a Play entitlement `active` until `2026-12-03` inside the app, then the Pro card says "Renews on 3 Dec 2026" and "Manage in Google Play", which opens Play's subscriptions page for the app's package and product; given `'cancelled'`, "Ends on 3 Dec 2026".
- Given a Play entitlement on the website, then the card says "Manage in the Android app" with no button; given a Razorpay entitlement inside the app, "Manage on the website".
- Given each new string, then `en/pro.json` and `hi/pro.json` have the same keys, and the Hindi says the same as the English.

- [ ] **Step 1: Write the failing tests** for each Acceptance case: `src/lib/playBilling.test.ts` with fake `getDigitalGoodsService` and `PaymentRequest` on `window`; the screen and card cases in `src/views/ProView.test.ts` and `src/components/profile/ProCard.test.ts`, with each answer written into the emulator

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/lib/playBilling.test.ts src/views/ProView.test.ts src/components/profile/ProCard.test.ts`
Expected: FAIL on the new assertions; G1's cases pass

- [ ] **Step 3: Write the minimal implementation** to the Interfaces: `playBilling.ts`, `isAndroidApp()` also true by the TWA's referrer, the store's Play path, the screen's Play plans and messages, the card's Play text and link, and the strings

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/lib/playBilling.test.ts src/views/ProView.test.ts src/components/profile/ProCard.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/playBilling.ts src/lib/playBilling.test.ts src/lib/platform.ts src/stores/payments.ts src/views/ProView.vue src/views/ProView.test.ts src/components/profile/ProCard.vue src/components/profile/ProCard.test.ts src/i18n/locales/en/pro.json src/i18n/locales/hi/pro.json
git commit -m "feat(payments): buy and manage Pro through Google Play in the app"
```
