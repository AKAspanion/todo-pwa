# Play Store TWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:feature-build-team by default, or ga:feature-build. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the app on Google Play as `in.spanion.todo.pwa`, a Bubblewrap-built TWA, with redirect-only Google sign-in, account deletion in the app and on the web, and a public privacy policy.

**Architecture:** The auth service drops the popup and reports which kind of redirect came back; an account service re-confirms and deletes the Auth user, and the session store runs the sign-out hooks around it. Profile gains an Account section and a delete dialog that picks up a Google re-confirmation on load. Two public, English-only pages serve Play's privacy and deletion links. A `firebase-functions/v1` auth-deletion trigger erases the user's documents. `packages/android/` becomes a committed `twa-manifest.json` plus the project Bubblewrap generates from it.

**Tech Stack:** Vue 3.5, Vuetify 4, Pinia (setup-style stores for new code), vue-router 5, vue-i18n 11, Firebase 13 modular SDK (Auth `signInWithRedirect`, `getRedirectResult`, `reauthenticateWithCredential`, `reauthenticateWithRedirect`, `deleteUser`), firebase-functions 7 (`firebase-functions/v1` auth trigger) and firebase-admin 14 on Node 22, Vitest against the Firebase emulators, Bubblewrap CLI 1.27.0 (run with `npx`, never a dependency), Firebase Hosting.

**Spec:** `docs/specs/2026-11-04-play-store-twa.md`

## Global Constraints

- §1: "Developer: **Ankit Kumar Pandit**, **panditankit1995@gmail.com**. Target audience: **13 and over**"
- §2 G1: "there is no popup and no popup fallback." No file imports `signInWithPopup` or `reauthenticateWithPopup`.
- §4: "**No `firestore.rules` change**"
- §4: "**The keystore** never enters the repository or a tool's output; only public fingerprints do." Never create, read or print a keystore.
- §2 A1: Bubblewrap CLI `1.27.0`, run as `npx @bubblewrap/cli@1.27.0`; it is not added to any `package.json`.
- New strings go in `src/i18n/locales/en/<namespace>.json` and `src/i18n/locales/hi/<namespace>.json` with the same keys. The text of `/privacy` and `/delete-account` is English only and lives in their components, not in the locale files ([decisions/legal-pages-english-only](../../knowledge/decisions/legal-pages-english-only.md)).
- Comments cite this spec's ids (`G1`, `D5`, `W3`, `A2`).
- New screens and dialogs use the restored old app's look ([decisions/restore-original-design](../../knowledge/decisions/restore-original-design.md), `knowledge/design-system/components.md`, `knowledge/design-system/tokens.md`): its cards, buttons and type, and no new colours or sizes.
- Each `screen` task adds an end-to-end test of its flow in `e2e/`, with `resetEmulators`, `createUser` and `signInAs` from `e2e/support/emulator.ts`, so the merge request's video has the flow to record.

## Checkpoints

None (`run.checkpoints: none`). The run stops only where the developer names a stop.

## Review Focus

- A hostile `redirect` query that survives a Google round trip (`/signin?redirect=//evil.example`): the user lands on `/home`, never off the app (Task 1).
- A Google re-confirmation that comes back stale, or a Profile reloaded after the pickup: Delete asks to confirm again (`auth/requires-recent-login`), and a second load opens nothing; nothing is deleted silently (Task 3).
- The network failing during Delete: "Couldn't delete your account. Try again.", the account and its data untouched, the dialog still open (Task 3).
- `deleteUserData` failing part-way through a large account: the platform's retry deletes the rest, and a finished retry deletes nothing more (Task 4).
- A visitor whose app language is Hindi opening `/privacy` or `/delete-account`: the English text, marked `lang="en"` (Task 2).

---

### Task 1: Redirect-only Google sign-in, the account service and account deletion in the session store

**Files:**
- Modify: `src/services/auth.ts`
- Create: `src/services/auth.test.ts`
- Create: `src/services/account.ts`
- Create: `src/services/account.test.ts`
- Modify: `src/stores/session.ts`
- Modify: `src/stores/session.test.ts`
- Modify: `src/views/SignInView.vue`
- Modify: `src/views/SignUpView.vue`
- Modify: `src/i18n/locales/en/auth.json`
- Modify: `src/i18n/locales/hi/auth.json`

**Interfaces:**
- Consumes: existing `auth` from `src/lib/firebase.ts`, `safeRedirect`, `authErrorKey`, the session store's sign-out hooks and `clearPerUserState`.
- Produces:

```ts
// src/services/auth.ts
export type RedirectOperation = 'signIn' | 'reauthenticate' | 'link';
export interface RedirectOutcome { user: User; operation: RedirectOperation }
/** G1: always a redirect; the page leaves for Google. */
export function signInWithGoogle(): Promise<void>;
/** G2, D4: the redirect that brought this page load back, or null. Rejects with the redirect's Firebase error. */
export function consumeRedirectResult(): Promise<RedirectOutcome | null>;

// src/services/account.ts
export type AccountProvider = 'password' | 'google.com';
/** The signed-in user's providers among the two the app offers, in that order. */
export function accountProviders(): AccountProvider[];
/** D3: re-authenticates the signed-in user with their password; rejects with Firebase's error. */
export function confirmWithPassword(password: string): Promise<void>;
/** D4: leaves for Google to re-authenticate the signed-in user (reauthenticateWithRedirect). */
export function confirmWithGoogle(): Promise<void>;
/** D5 step 2: deletes the signed-in Firebase Auth user; rejects with Firebase's error. */
export function deleteCurrentUser(): Promise<void>;

// src/stores/session.ts (added to what the store returns)
/** Runs every sign-out hook in turn; a failing hook is logged by code and doesn't stop the rest. */
runSignOutHooks(): Promise<void>;
/** D5: hooks, then deleteCurrentUser, then clears every per-user store and the user. On a failed delete, clears nothing and rethrows. */
deleteAccount(): Promise<void>;
```

`signOut` keeps its behaviour and calls `runSignOutHooks`. A call with no signed-in user to any `account.ts` function rejects with `auth/not-signed-in`.

New key in `auth.json`:

| Key | en | hi |
|---|---|---|
| `privacyLink` | `Privacy policy` | `गोपनीयता नीति` |

**Spec:**
- §2 G1: ""Continue with Google" on `/signin` and `/signup` always leaves for Google by redirect (`signInWithRedirect`); there is no popup and no popup fallback. The page keeps its URL, `redirect` query included, so it comes back to the same screen."
- §2 G2: "Both `/signin` and `/signup` read the redirect's result when they load (`consumeRedirectResult`). A user who came back signed in goes where sign-in already sends them (`safeRedirect`); an error is shown from its code, as today."
- §2 D5: "Delete: (1) runs the session's sign-out hooks, which turn push off for this browser (its device document and token); (2) deletes the Firebase Auth user (`deleteUser`); (3) clears every per-user store"
- §2 W2: "`/signin` and `/signup` show "Privacy policy" below their buttons"

**Tags:** `security`, `failure-paths`

**Knowledge:** (written after the finish)
- `features/sign-in`: Google sign-in and sign-up always redirect, and both screens pick the result up on load.
- `security/auth`: no popup; re-authentication before deletion is by password or a Google redirect.

**Acceptance:**
- `signInWithGoogle` calls `signInWithRedirect` with a `GoogleAuthProvider` and never `signInWithPopup` (Firebase's `firebase/auth` mocked).
- `consumeRedirectResult` returns `{ user, operation: 'reauthenticate' }` when `getRedirectResult` gives `operationType: 'reauthenticate'`, `'signIn'` for `'signIn'`, and `null` when it gives `null`; a rejection with `auth/user-mismatch` reaches the caller with that code.
- Against the auth emulator: a user made with email `del@example.com` and password `Passw0rd!` gives `accountProviders()` `['password']`; `confirmWithPassword('wrong-1')` rejects with `auth/wrong-password` or `auth/invalid-credential`; `confirmWithPassword('Passw0rd!')` resolves; `deleteCurrentUser()` resolves and signing in again with that email rejects with `auth/user-not-found` or `auth/invalid-credential`.
- `confirmWithPassword`, `confirmWithGoogle` and `deleteCurrentUser` with nobody signed in reject with `auth/not-signed-in`.
- `deleteAccount` runs each registered hook before `deleteCurrentUser`, then the tasks store and the ui store's snack are cleared and `user` is null.
- A hook that throws is logged by code and `deleteAccount` still deletes.
- When `deleteCurrentUser` rejects with `auth/requires-recent-login`, `deleteAccount` rejects with that code, and the tasks store and `user` are unchanged.
- `signOut` still runs the hooks, then signs out, then clears (the existing session tests pass unchanged).
- `/signup` reads the redirect result on load: a `signIn` outcome sends the user to `safeRedirect` of the `redirect` query, as `/signin` does; a rejected result shows its translated error.
- `/signin` and `/signup` each show a "Privacy policy" link to `/privacy`.
- Back from Google on `/signin?redirect=//evil.example`, a `signIn` outcome goes to `/home`.
- `/signup` loaded with no redirect result (`null`) stays on sign-up and shows no error.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `src/services/auth.test.ts`, `src/services/account.test.ts` and `src/stores/session.test.ts`. Create `src/services/account.ts` and the new store functions with their real signatures first.

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/services/auth.test.ts src/services/account.test.ts src/stores/session.test.ts`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation** to the Interfaces: remove the popup path and `POPUP_UNAVAILABLE` from `auth.ts`; update `SignInView.vue` and `SignUpView.vue` to the new return types, add the result pickup to `SignUpView.vue`, and add the privacy link and its strings

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/services/auth.test.ts src/services/account.test.ts src/stores/session.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/auth.ts src/services/auth.test.ts src/services/account.ts src/services/account.test.ts src/stores/session.ts src/stores/session.test.ts src/views/SignInView.vue src/views/SignUpView.vue src/i18n/locales/en/auth.json src/i18n/locales/hi/auth.json
git commit -m "feat(auth): redirect-only Google sign-in and account deletion service"
```

### Task 2: The public privacy and account-deletion pages

**Files:**
- Create: `src/components/layout/LegalPage.vue`
- Create: `src/views/PrivacyView.vue`
- Create: `src/views/PrivacyView.test.ts`
- Create: `src/views/DeleteAccountInfoView.vue`
- Create: `src/views/DeleteAccountInfoView.test.ts`
- Modify: `src/router/index.ts`
- Modify: `src/router/guard.test.ts`
- Create: `e2e/legal.spec.ts`

**Interfaces:**
- Consumes: existing `authGuard`; nothing from other tasks.
- Produces:

```ts
// src/router/index.ts — two routes with no meta (no requireAuth, no nav)
{ path: '/privacy', name: 'privacy', component: () => import('@/views/PrivacyView.vue') }
{ path: '/delete-account', name: 'delete-account', component: () => import('@/views/DeleteAccountInfoView.vue') }

// src/components/layout/LegalPage.vue
defineProps<{ title: string }>(); // default slot: the page's text
```

`LegalPage` renders a back button (`router.back()` when `window.history.state?.back` is set, else `/home`), the `<h1>` from `title`, and the slot, inside a root carrying `lang="en"`. The effective date is the constant `PRIVACY_EFFECTIVE = '4 November 2026'` in `PrivacyView.vue`. The email deletion link is `mailto:panditankit1995@gmail.com?subject=Delete%20my%20Task%20Manager%20account`.

**Spec:**
- §2 W1: "`/privacy` (`PrivacyView.vue`) and `/delete-account` (`DeleteAccountInfoView.vue`) open for anyone, signed in or not: no `requireAuth` and no `nav`, so neither the menu nor the bottom bar shows. Each has a back button (to the previous page, or `/home` when there is none), its `<h1>`, and `lang="en"` on its root"
- §2 W3, all of it, writing exactly its facts in plain English and no others: "Task Manager is made by Ankit Kumar Pandit, an individual developer"
- §2 W3: "Google Cloud's server logs, which may hold the account ID, are kept for up to 30 days."
- §2 W3: "the app is not directed at children under 13; an account found to belong to one is deleted."
- §2 W4: "write to panditankit1995@gmail.com from the account's email address with the subject "Delete my Task Manager account"; the account and its data are deleted within 30 days and the reply confirms it."
- §2 W4: "**What is kept:** nothing, except Google Cloud's server logs holding the account ID, for up to 30 days."

**Tags:** `screen`, `security`

**Knowledge:** (written after the finish)
- `features/legal-pages` (new): what `/privacy` and `/delete-account` say, that they're public and English only, and where they're linked from.

**Acceptance:**
- `authGuard` lets a signed-out visit to `/privacy` and to `/delete-account` through, and a signed-in visit too (no redirect either way).
- `PrivacyView` renders an `<h1>` "Privacy policy", "Effective 4 November 2026", the name "Ankit Kumar Pandit", a `mailto:panditankit1995@gmail.com` link, each of W3's headings (Who, What we collect and why, Who processes it, What we don't do, Security, Keeping and deleting your data, Children, Changes), "under 13", "30 days", and a link to `/delete-account`; its root has `lang="en"`.
- `PrivacyView` names Firebase Authentication, Cloud Firestore, Hosting, Cloud Functions and Cloud Messaging, and says no ads and no analytics.
- `DeleteAccountInfoView` renders the `<h1>` "Delete your Task Manager account", the words "Task Manager by Ankit Kumar Pandit", the in-app steps ending in typing `DELETE`, a "Go to Profile" link to `/profile`, the `mailto:` link above with its subject, "within 30 days", what is deleted (account, tasks, labels, reminders, push devices) and what is kept; its root has `lang="en"`.
- With Hindi as the app language, both pages still render the English text.
- The back button goes to `/home` when there is no previous page.
- `e2e/legal.spec.ts`, signed out: from `/signin`, the "Privacy policy" link opens `/privacy` with no menu and no bottom bar, its "delete" link opens `/delete-account`, and "Go to Profile" leads to sign-in and, after `signInAs`, to `/profile`.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `src/router/guard.test.ts`, `src/views/PrivacyView.test.ts`, `src/views/DeleteAccountInfoView.test.ts` and `e2e/legal.spec.ts`. Create the two views and `LegalPage.vue` as empty components with their real props first.

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/router/guard.test.ts src/views/PrivacyView.test.ts src/views/DeleteAccountInfoView.test.ts` and `npm run e2e -- e2e/legal.spec.ts`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation**: the routes, `LegalPage.vue`, and the two pages' text from W3 and W4

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/router/guard.test.ts src/views/PrivacyView.test.ts src/views/DeleteAccountInfoView.test.ts` and `npm run e2e -- e2e/legal.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/LegalPage.vue src/views/PrivacyView.vue src/views/PrivacyView.test.ts src/views/DeleteAccountInfoView.vue src/views/DeleteAccountInfoView.test.ts src/router/index.ts src/router/guard.test.ts e2e/legal.spec.ts
git commit -m "feat(legal): public privacy policy and account deletion pages"
```

### Task 3: Delete account on Profile

**Files:**
- Create: `src/components/profile/AccountSection.vue`
- Create: `src/components/profile/DeleteAccountDialog.vue`
- Create: `src/components/profile/DeleteAccountDialog.test.ts`
- Create: `src/views/ProfileView.test.ts`
- Modify: `src/views/ProfileView.vue`
- Create: `e2e/delete-account.spec.ts`
- Modify: `src/i18n/locales/en/profile.json`
- Modify: `src/i18n/locales/hi/profile.json`

**Interfaces:**
- Consumes: `consumeRedirectResult`, `RedirectOutcome` (Task 1); `accountProviders`, `confirmWithPassword`, `confirmWithGoogle`, `AccountProvider` (Task 1); the session store's `deleteAccount` (Task 1); existing `authErrorKey`, `useUiStore().showSnack`, the session store's `user`.
- Produces:

```ts
// src/components/profile/DeleteAccountDialog.vue
defineProps<{ open: boolean; confirmed: boolean; message: string | null }>();
defineEmits<{ close: [] }>();

// src/components/profile/AccountSection.vue — the "Account" card: Privacy policy link and Delete account button;
// it owns the dialog and exposes openDialog(confirmed: boolean, message: string | null) for ProfileView's pickup
```

New keys in `profile.json`:

| Key | en | hi |
|---|---|---|
| `account.title` | `Account` | `खाता` |
| `account.privacy` | `Privacy policy` | `गोपनीयता नीति` |
| `delete.button` | `Delete account` | `खाता हटाएँ` |
| `delete.title` | `Delete your account?` | `अपना खाता हटाएँ?` |
| `delete.body` | `Every task, label, reminder and push device of this account will be deleted. This can't be undone.` | `इस खाते के सभी कार्य, लेबल, रिमाइंडर और पुश डिवाइस हटा दिए जाएँगे। इसे वापस नहीं किया जा सकता।` |
| `delete.howItWorks` | `How deletion works` | `खाता हटाना कैसे काम करता है` |
| `delete.password` | `Password` | `पासवर्ड` |
| `delete.confirmPassword` | `Confirm` | `पुष्टि करें` |
| `delete.google` | `Continue with Google` | `Google के साथ जारी रखें` |
| `delete.confirmed` | `Confirmed. Now type DELETE.` | `पुष्टि हो गई। अब DELETE लिखें।` |
| `delete.type` | `Type DELETE to confirm` | `पुष्टि के लिए DELETE लिखें` |
| `delete.confirm` | `Delete account` | `खाता हटाएँ` |
| `delete.cancel` | `Cancel` | `रद्द करें` |
| `delete.wrongPassword` | `That password is wrong.` | `यह पासवर्ड गलत है।` |
| `delete.userMismatch` | `That Google account isn't the one you're signed in with.` | `यह Google खाता वह नहीं है जिससे आपने साइन इन किया है।` |
| `delete.again` | `Please confirm it's you again.` | `कृपया फिर से पुष्टि करें कि यह आप ही हैं।` |
| `delete.failed` | `Couldn't delete your account. Try again.` | `आपका खाता हटाया नहीं जा सका। फिर से कोशिश करें।` |
| `delete.done` | `Your account was deleted.` | `आपका खाता हटा दिया गया।` |

**Spec:**
- §2 D1: "Profile gains an "Account" section, below the labels, with "Privacy policy" (a link to `/privacy`) and "Delete account"."
- §2 D2: "an account with the `password` provider shows a password field and a "Confirm" button;"
- §2 D2: "an account with the `google.com` provider shows "Continue with Google";"
- §2 D2: "an account with both shows both; either one confirms."
- §2 D2: "After confirming, the user types `DELETE` (exactly, upper case); the Delete button is enabled only when the account is confirmed and the word matches."
- §2 D3: "A wrong password says so and the dialog stays open, unconfirmed."
- §2 D4: "When Profile loads and the redirect's result is a re-authentication of the signed-in user, the dialog opens already confirmed, waiting for `DELETE`. A result for another Google account (`auth/user-mismatch`) opens the dialog unconfirmed, saying "That Google account isn't the one you're signed in with."; any other error is shown in the dialog the same way."
- §2 D5: "goes to `/signin`, and the snackbar says "Your account was deleted.". If step 2 fails with `auth/requires-recent-login`, the dialog returns to unconfirmed and says "Please confirm it's you again."; any other failure says "Couldn't delete your account. Try again." and nothing more happens."

**Tags:** `security`, `failure-paths`, `screen`

**Knowledge:** (written after the finish)
- `features/profile-and-labels`: Profile has an Account section with the privacy link and Delete account.
- `features/account-deletion` (new): how the dialog confirms the user, the Google redirect pickup, and what deleting does.

**Acceptance:**
- Profile shows the Account card below the labels, with a "Privacy policy" link to `/privacy` and a "Delete account" button.
- Providers `['password']` show the password field and "Confirm" and no Google button; `['google.com']` show "Continue with Google" and no password field; both show both.
- Before confirming, the `DELETE` field is disabled; Delete is disabled.
- `confirmWithPassword` rejecting with `auth/invalid-credential` (or `auth/wrong-password`) shows "That password is wrong." and leaves the dialog open and unconfirmed.
- After confirming, typing `delete`, ` DELETE` or `DELET` leaves Delete disabled; `DELETE` enables it.
- "Continue with Google" calls `confirmWithGoogle`.
- On Profile load, an outcome `{ operation: 'reauthenticate' }` whose user uid is the signed-in uid opens the dialog confirmed, showing "Confirmed. Now type DELETE."; an outcome for another uid, or `operation: 'signIn'`, opens nothing.
- On Profile load, a redirect rejected with `auth/user-mismatch` opens the dialog unconfirmed with "That Google account isn't the one you're signed in with."; one rejected with `auth/network-request-failed` opens it with that code's translated message.
- On Profile load with no redirect (`null`), no dialog opens.
- Delete calls the store's `deleteAccount`; on success the app is at `/signin` and the snack says "Your account was deleted."
- `deleteAccount` rejecting with `auth/requires-recent-login` returns the dialog to unconfirmed with "Please confirm it's you again."; rejecting with anything else shows "Couldn't delete your account. Try again." and the dialog stays, still confirmed.
- While deleting, Delete shows its loading state and a second click does nothing.
- "How deletion works" links to `/delete-account`.
- A second Profile load after a pickup (the redirect result is now `null`) opens no dialog.
- `e2e/delete-account.spec.ts`: a user made with `createUser` and signed in with `signInAs` opens Profile, chooses Delete account, enters the wrong password and sees "That password is wrong.", enters the right one, types `DELETE`, deletes, and lands on `/signin` with "Your account was deleted."; signing in again with that email and password fails.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `src/components/profile/DeleteAccountDialog.test.ts`, `src/views/ProfileView.test.ts` and `e2e/delete-account.spec.ts`, with `@/services/auth` and `@/services/account` mocked. Create both components with their real props first.

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/components/profile/DeleteAccountDialog.test.ts src/views/ProfileView.test.ts` and `npm run e2e -- e2e/delete-account.spec.ts`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation**: the two components, the pickup in `ProfileView.vue`'s mount, and the strings

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/components/profile/DeleteAccountDialog.test.ts src/views/ProfileView.test.ts` and `npm run e2e -- e2e/delete-account.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/profile/AccountSection.vue src/components/profile/DeleteAccountDialog.vue src/components/profile/DeleteAccountDialog.test.ts src/views/ProfileView.test.ts src/views/ProfileView.vue e2e/delete-account.spec.ts src/i18n/locales/en/profile.json src/i18n/locales/hi/profile.json
git commit -m "feat(profile): delete account with re-confirmation"
```

### Task 4: The `deleteUserData` function

**Files:**
- Create: `functions/src/deleteUserData.ts`
- Create: `functions/src/deleteUserData.test.ts`
- Modify: `functions/src/index.ts`
- Modify: `functions/src/reminders.test.ts` (the entry-point test, `describe('functions entry point')`)

**Interfaces:**
- Consumes: existing `firebase-admin` default app from `functions/src/index.ts`, `errorCode` style of `functions/src/reminders.ts`.
- Produces:

```ts
// functions/src/deleteUserData.ts
export const DELETE_BATCH = 500;
/** D6: deletes every document of `uid` in tasks, types, notifications, users/{uid}/devices, users/{uid} and fcm/{uid}, in batches of DELETE_BATCH. Returns how many it deleted. */
export function deleteUserDocuments(db: Firestore, uid: string): Promise<number>;
/** D6: Firebase Auth user-deletion trigger, firebase-functions/v1, runWith({ failurePolicy: true }) so the platform retries a failure. */
export const deleteUserData: CloudFunction<UserRecord>;
```

The trigger takes the uid only from the event's `UserRecord`, logs a failure by its error code (never its message), and rethrows so it is retried. It uses the same default region as the other functions.

**Spec:**
- §2 D6: "deletes with the Admin SDK every document whose `uid` is the deleted user's in `tasks`, `types` and `notifications`, every document under `users/{uid}/devices`, `users/{uid}` itself, and the old app's `fcm/{uid}`, in batches of `500`. It takes the uid only from the event. Running it again for the same uid deletes nothing more and succeeds. A failure is logged by error code, and the platform retries it."
- §2 D7: "`functions/src/reminders.test.ts`'s entry-point test lists `deleteUserData` on purpose, and still fails on any HTTP or callable export."

**Tags:** `security`, `failure-paths`

**Knowledge:** (written after the finish)
- `apps/functions`: three functions; `deleteUserData` runs on Auth user deletion and answers no HTTP.
- `data/` concepts for tasks, labels, notifications and devices: deleted with their account by `deleteUserData`.

**Acceptance:**
- Against the Firestore emulator: user `alice` has 501 tasks, 2 `types`, 2 `notifications`, 2 documents under `users/alice/devices`, `users/alice` and `fcm/alice`; user `bob` has 3 tasks, 1 type, 1 notification, 1 device, `users/bob` and `fcm/bob`. `deleteUserDocuments(db, 'alice')` returns `510`; afterwards none of alice's documents exist and every one of bob's still does.
- A second `deleteUserDocuments(db, 'alice')` resolves to `0`.
- `deleteUserDocuments` for a uid with no documents resolves to `0`.
- A run stopped after its first batch (a faked commit failure on the second) leaves the rest; a second run deletes the rest, and alice has no documents left.
- When a batch commit rejects (a faked `Firestore` whose batch commit rejects with code `unavailable`), the trigger's handler logs `unavailable` and nothing of the error's message, and rejects.
- The entry-point test lists `sendReminders`, `stopBillingOnBudget` and `deleteUserData`, and still fails when any export is an HTTP or callable function.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `functions/src/deleteUserData.test.ts` and the entry-point test in `functions/src/reminders.test.ts`. Create `deleteUserData.ts` with its real exports first.

- [ ] **Step 2: Run them to verify they fail**

Run: `npm --prefix functions run test -- src/deleteUserData.test.ts src/reminders.test.ts`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation** to the Interfaces, and export `deleteUserData` from `functions/src/index.ts` (update its doc comment to say three functions)

- [ ] **Step 4: Run them to verify they pass**

Run: `npm --prefix functions run test -- src/deleteUserData.test.ts src/reminders.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add functions/src/deleteUserData.ts functions/src/deleteUserData.test.ts functions/src/index.ts functions/src/reminders.test.ts
git commit -m "feat(functions): delete a user's data when their account is deleted"
```

### Task 5: The Bubblewrap Android project and Digital Asset Links

**Files:**
- Delete: `packages/android/Readme.html`
- Delete: every file under `packages/android/source/` (the PWABuilder project)
- Create: `packages/android/twa-manifest.json`
- Create: the project Bubblewrap generates beside it in `packages/android/` (`build.gradle`, `settings.gradle`, `gradle.properties`, `gradlew`, `gradlew.bat`, `gradle/wrapper/*`, `app/**`, `manifest-checksum.txt`, `store_icon.png`)
- Create: `packages/android/README.md`
- Create: `tests/android/twa-manifest.test.ts`
- Modify: `public/.well-known/assetlinks.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: existing `VitePWA` manifest in `vite.config.ts` (its icons and colours); nothing from other tasks.
- Produces: `packages/android/twa-manifest.json` with exactly the A2 values below; every other field Bubblewrap 1.27.0 requires takes Bubblewrap's default (read them from `@bubblewrap/core`'s `TwaManifest`), with `fullScopeUrl` `https://todo.spanion.in/`, `generatorApp` `bubblewrap-cli`, `shortcuts` `[]`.

| Field | Value |
| --- | --- |
| `packageId` | `in.spanion.todo.pwa` |
| `host` | `todo.spanion.in` |
| `name` / `launcherName` | `Task Manager` |
| `startUrl` | `/home` |
| `webManifestUrl` | `https://todo.spanion.in/manifest.webmanifest` |
| `iconUrl` | `https://todo.spanion.in/img/icons/android-chrome-512x512.png` |
| `maskableIconUrl` | `https://todo.spanion.in/img/icons/maskable-icon-512x512.png` |
| `themeColor`, `themeColorDark`, `navigationColor`, `navigationColorDark` | `#1976D2` |
| `backgroundColor` | `#FAFAFA` |
| `display` / `orientation` | `standalone` / `default` |
| `fallbackType` | `customtabs` |
| `enableNotifications` | `true` |
| `signingKey` | `{ "path": "./android.keystore", "alias": "android" }` |
| `appVersionCode` / `appVersionName` | `1` / `1.0.0` |

`public/.well-known/assetlinks.json` becomes one statement, `delegate_permission/common.handle_all_urls` for `android_app` `in.spanion.todo.pwa`, with `sha256_cert_fingerprints: []`: the developer adds their upload key's and Play's signing key's fingerprints (A4, and the README says how). `.gitignore` gains `*.keystore`, `*.jks`, `*.apk`, `*.aab`, `*.idsig`, `packages/android/app/build/`, `packages/android/build/`, `packages/android/.gradle/`, `packages/android/local.properties`.

**Spec:**
- §2 A1: "`packages/android/` is replaced: the PWABuilder project (`Readme.html`, `source/`) and the package `app.web.spanion_todo.twa` are removed. In their place, a committed `packages/android/twa-manifest.json` and the Gradle project Bubblewrap CLI `1.27.0` generates from it."
- §2 A2: "The generated project targets API `36`, which Play requires of new apps from 31 August 2026."
- §2 A2: "`fallbackType` | `customtabs` (never `webview`: Google refuses sign-in in a WebView)"
- §2 A3: "the keystore (`*.keystore`, `*.jks`), `*.apk`, `*.aab`, `*.idsig`, Gradle build output and `local.properties`, by `.gitignore`."
- §2 A4: "`public/.well-known/assetlinks.json` lists only `in.spanion.todo.pwa`, with the SHA-256 fingerprints of the developer's upload key and, once Play has made it, Play's app-signing key. The old package's entry goes."
- §2 A5, all of it: "`packages/android/README.md` says how to build, sign and release, and what to enter in Play"
- §2 A5: "a closed test with at least 12 testers for 14
  days before production."
- §2 D8: "The function deploys by the manual functions run
  ([operations/deploy](../../knowledge/operations/deploy.md)) before the web change that shows Delete account, so no
  account is ever deleted without its data."

**Tags:** `security` (signing keys and Digital Asset Links)

**Knowledge:** (written after the finish)
- `apps/android-twa`: `in.spanion.todo.pwa`, generated by Bubblewrap from `packages/android/twa-manifest.json`, opening `todo.spanion.in`, targeting API 36.
- `operations/play-store-release` (new): the release steps and Play Console answers, pointing at `packages/android/README.md`.

**Acceptance:**
- `tests/android/twa-manifest.test.ts` (run by the root Vitest) reads `twa-manifest.json` and finds each A2 value above, and `fallbackType` is not `webview`.
- The same test reads `packages/android/app/build.gradle` and finds `targetSdkVersion 36`, `applicationId "in.spanion.todo.pwa"` and the host `todo.spanion.in`; and finds no file under `packages/android` naming `app.web.spanion_todo`.
- The same test reads `public/.well-known/assetlinks.json`: exactly one statement, for `in.spanion.todo.pwa`, and no `app.web.spanion_todo.twa`.
- `git check-ignore packages/android/android.keystore packages/android/app-release-signed.apk packages/android/app-release-bundle.aab` prints all three.
- `packages/android/README.md` names Ankit Kumar Pandit, panditankit1995@gmail.com, `https://todo.spanion.in/privacy`, `https://todo.spanion.in/delete-account`, `npx @bubblewrap/cli@1.27.0`, the target audience 13–15, 16–17 and 18+, and the 12 testers for 14 days rule, and says to deploy the functions (with `deleteUserData`) by the manual run before the first hosting deploy of this branch (D8).
- No keystore file exists in the repository or was created by this task.

- [ ] **Step 1: Write the failing test** for the Acceptance cases in `tests/android/twa-manifest.test.ts`

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- tests/android/twa-manifest.test.ts`
Expected: FAIL on the assertions

- [ ] **Step 3: Remove the old project and write `twa-manifest.json`**: `git rm -r -q packages/android/source packages/android/Readme.html`, then the manifest with the A2 values

- [ ] **Step 4: Generate the project** in `packages/android`: `npx @bubblewrap/cli@1.27.0 update --skipVersionUpgrade --directory packages/android`. If Bubblewrap stops to ask a question, stop and report it; never answer a keystore or password prompt

- [ ] **Step 5: Write `assetlinks.json`, `.gitignore` and `packages/android/README.md`** as the Interfaces and A5 say

- [ ] **Step 6: Run it to verify it passes**

Run: `npm test -- tests/android/twa-manifest.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**: stage `packages/android/twa-manifest.json`, `tests/android/twa-manifest.test.ts`, `packages/android/README.md`, `public/.well-known/assetlinks.json`, `.gitignore`, and each file Bubblewrap wrote that `git status --short --untracked-files=all packages/android` lists, by name; the removals are already staged by `git rm`

```bash
git commit -m "feat(android): Bubblewrap TWA in.spanion.todo.pwa"
```
