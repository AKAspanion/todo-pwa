# Spec: Play Store app — Bubblewrap TWA, redirect-only Google sign-in, account deletion, privacy policy

_2026-11-04 · status: draft · decisions: [decisions/android-app-bubblewrap](../../knowledge/decisions/android-app-bubblewrap.md), [decisions/google-sign-in-redirect-only](../../knowledge/decisions/google-sign-in-redirect-only.md), [decisions/account-deletion-for-play](../../knowledge/decisions/account-deletion-for-play.md), [decisions/legal-pages-english-only](../../knowledge/decisions/legal-pages-english-only.md) · takes Delete account (D1–D5) out of [part 8](2026-11-03-data-and-account.md)_

## §1 Goal

The app goes on Google Play as `in.spanion.todo.pwa`, a Trusted Web Activity built with the Bubblewrap CLI, and
meets Play's rules on the first review: target API level, verified Digital Asset Links, account deletion in the app
and on the web, and a public privacy policy. Google sign-in works inside the TWA because it never opens a popup.

Developer: **Ankit Kumar Pandit**, **panditankit1995@gmail.com**. Target audience: **13 and over**; the app is not
in the Families programme.

## §2 Behaviour

### Google sign-in, redirect only

**G1 Sign in and sign up.** "Continue with Google" on `/signin` and `/signup` always leaves for Google by redirect
(`signInWithRedirect`); there is no popup and no popup fallback. The page keeps its URL, `redirect` query included,
so it comes back to the same screen.

**G2 Coming back.** Both `/signin` and `/signup` read the redirect's result when they load (`consumeRedirectResult`).
A user who came back signed in goes where sign-in already sends them (`safeRedirect`); an error is shown from its
code, as today. Until now `/signup` didn't read it.

**G3 Same origin.** The auth domain stays as `pickAuthDomain` chooses it: the page's own host on each of the app's
Hosting domains, `VITE_FIREBASE_AUTH_DOMAIN` elsewhere. Nothing about it changes here.

### Delete account (in the app)

**D1 Where.** Profile gains an "Account" section, below the labels, with "Privacy policy" (a link to `/privacy`) and
"Delete account". Part 8 later adds its export and import beside them.

**D2 The dialog.** Delete account opens a dialog that says every task, label, reminder and push device of the
account will be deleted and can't be brought back, with a link "How deletion works" to `/delete-account`. It asks
the user to confirm who they are:

- an account with the `password` provider shows a password field and a "Confirm" button;
- an account with the `google.com` provider shows "Continue with Google";
- an account with both shows both; either one confirms.

After confirming, the user types `DELETE` (exactly, upper case); the Delete button is enabled only when the account
is confirmed and the word matches.

**D3 Confirming by password** re-authenticates in place (`reauthenticateWithCredential`). A wrong password says so
and the dialog stays open, unconfirmed.

**D4 Confirming with Google** leaves for Google by redirect (`reauthenticateWithRedirect`) from `/profile`. When
Profile loads and the redirect's result is a re-authentication of the signed-in user, the dialog opens already
confirmed, waiting for `DELETE`. A result for another Google account (`auth/user-mismatch`) opens the dialog
unconfirmed, saying "That Google account isn't the one you're signed in with."; any other error is shown in the
dialog the same way.

**D5 Deleting.** Delete: (1) runs the session's sign-out hooks, which turn push off for this browser (its device
document and token); (2) deletes the Firebase Auth user (`deleteUser`); (3) clears every per-user store, goes to
`/signin`, and the snackbar says "Your account was deleted.". If step 2 fails with `auth/requires-recent-login`,
the dialog returns to unconfirmed and says "Please confirm it's you again."; any other failure says "Couldn't
delete your account. Try again." and nothing more happens.

**D6 The function.** As part 8 D3: `deleteUserData`, on Firebase Auth's user-deletion event
(`firebase-functions/v1` `auth.user().onDelete`; not HTTP, not callable), deletes with the Admin SDK every document
whose `uid` is the deleted user's in `tasks`, `types` and `notifications`, every document under
`users/{uid}/devices`, `users/{uid}` itself, and the old app's `fcm/{uid}`, in batches of `500`. It takes the uid
only from the event. Running it again for the same uid deletes nothing more and succeeds. A failure is logged by
error code, and the platform retries it.

**D7 The export test.** `functions/src/reminders.test.ts`'s entry-point test lists `deleteUserData` on purpose, and
still fails on any HTTP or callable export.

**D8 Release together.** The function deploys by the manual functions run
([operations/deploy](../../knowledge/operations/deploy.md)) before the web change that shows Delete account, so no
account is ever deleted without its data.

### Public pages (English only)

**W1 Routes.** `/privacy` (`PrivacyView.vue`) and `/delete-account` (`DeleteAccountInfoView.vue`) open for anyone,
signed in or not: no `requireAuth` and no `nav`, so neither the menu nor the bottom bar shows. Each has a back
button (to the previous page, or `/home` when there is none), its `<h1>`, and `lang="en"` on its root, since the
text is English whatever the app's language is. A signed-in visit is not redirected.

**W2 Links to them.** `/signin` and `/signup` show "Privacy policy" below their buttons; Profile's Account section
(D1) and the delete dialog (D2) link as said. The link texts are translated like any other string.

**W3 Privacy policy** (`/privacy`), headed with its effective date `4 November 2026`, says, in plain English:

- **Who:** Task Manager is made by Ankit Kumar Pandit, an individual developer; contact
  panditankit1995@gmail.com.
- **What is collected, and why:**
  - account: email address, display name, profile photo address (from Google, when signing in with Google), the
    sign-in method, and an account ID — to sign the user in and show their profile;
  - content: tasks (title, description, date, time, time zone, status, labels), labels, and the reminders sent —
    to run the app;
  - push devices: for each browser or phone with reminders turned on, a push token and the browser's user-agent
    text — to send reminders there;
  - on the device only: language and theme preferences, never sent anywhere.
- **Who processes it:** Google, through Firebase (Authentication, Cloud Firestore, Hosting, Cloud Functions and
  Cloud Messaging), on Google's servers. Nothing else.
- **What isn't done:** no ads, no analytics or tracking, no selling or sharing of data, no access to contacts,
  location, camera or files.
- **Security:** sent over HTTPS only; each account's data can be read and changed only by that account.
- **Keeping and deleting:** data is kept until the account is deleted. Deleting erases the account at once and its
  data within minutes; Google Cloud's server logs, which may hold the account ID, are kept for up to 30 days.
  How to delete: a link to `/delete-account`.
- **Children:** the app is not directed at children under 13; an account found to belong to one is deleted.
- **Changes:** a change to this policy updates the date at the top.

**W4 Delete-account page** (`/delete-account`), titled "Delete your Task Manager account", says it is for Task
Manager by Ankit Kumar Pandit and gives:

- **In the app or on the web:** sign in, open Profile, choose Delete account, confirm it's you, type `DELETE`
  (a "Go to Profile" button leads to `/profile`, through sign-in when signed out).
- **By email, when you can't sign in:** write to panditankit1995@gmail.com from the account's email address with
  the subject "Delete my Task Manager account"; the account and its data are deleted within 30 days and the reply
  confirms it.
- **What is deleted:** the account, every task, label, reminder and push device.
- **What is kept:** nothing, except Google Cloud's server logs holding the account ID, for up to 30 days.

### Android app

**A1 The project.** `packages/android/` is replaced: the PWABuilder project (`Readme.html`, `source/`) and the
package `app.web.spanion_todo.twa` are removed. In their place, a committed `packages/android/twa-manifest.json`
and the Gradle project Bubblewrap CLI `1.27.0` generates from it. The project is changed only by editing
`twa-manifest.json` and running `bubblewrap update`; hand edits to the generated files are lost.

**A2 `twa-manifest.json`:**

| Field | Value |
| --- | --- |
| `packageId` | `in.spanion.todo.pwa` |
| `host` | `todo.spanion.in` |
| `name` / `launcherName` | `Task Manager` |
| `startUrl` | `/home` |
| `webManifestUrl` | `https://todo.spanion.in/manifest.webmanifest` |
| `iconUrl` / `maskableIconUrl` | the manifest's 512 px icon and maskable icon |
| `themeColor`, `navigationColor` | `#1976D2` (the manifest's `theme_color`) |
| `backgroundColor` | `#FAFAFA` (the manifest's `background_color`) |
| `display` / `orientation` | `standalone` / `default` |
| `fallbackType` | `customtabs` (never `webview`: Google refuses sign-in in a WebView) |
| `enableNotifications` | `true` (notification delegation, so reminders reach Android) |
| `signingKey` | `{ path: "./android.keystore", alias: "android" }` |
| `appVersionCode` / `appVersionName` | `1` / `1.0.0` |

The generated project targets API `36`, which Play requires of new apps from 31 August 2026.

**A3 What stays out of git:** the keystore (`*.keystore`, `*.jks`), `*.apk`, `*.aab`, `*.idsig`, Gradle build
output and `local.properties`, by `.gitignore`.

**A4 Digital Asset Links.** `public/.well-known/assetlinks.json` lists only `in.spanion.todo.pwa`, with the SHA-256
fingerprints of the developer's upload key and, once Play has made it, Play's app-signing key. The old package's
entry goes. Hosting keeps serving it as `application/json` (`firebase.json`). The developer gives the fingerprints;
they're public, and nothing reads the keystore.

**A5 Release notes.** `packages/android/README.md` says how to build, sign and release, and what to enter in Play
Console:

- prerequisites (Node, `npx @bubblewrap/cli@1.27.0`, which installs its own JDK and Android SDK on first run);
  creating the upload keystore; `bubblewrap build`; reading a fingerprint with `keytool`; adding Play's signing-key
  fingerprint to `assetlinks.json` after the first upload, and checking it with Google's Statement List tester;
- each release: `bubblewrap update` (raises the version code), `bubblewrap build`, upload the `.aab`;
- Play Console: developer name and contact email (§1); privacy policy `https://todo.spanion.in/privacy`;
  account deletion `https://todo.spanion.in/delete-account`; Data safety answers (W3's data; none shared; all
  encrypted in transit; deletion offered); App access with a demo account the developer creates; no ads; content
  rating questionnaire; target audience 13–15, 16–17 and 18+; category Productivity;
- for a personal developer account created after 13 November 2023: a closed test with at least 12 testers for 14
  days before production.

## §3 Design

- `src/services/auth.ts`: `signInWithGoogle(): Promise<void>` (redirect only); `consumeRedirectResult()` returns
  `{ user, operation: 'signIn' | 'reauthenticate' | 'link' } | null`. The popup code and `POPUP_UNAVAILABLE` go.
- `src/services/account.ts`: `accountProviders(user)`, `confirmWithPassword(password)`,
  `confirmWithGoogle(): Promise<void>` (redirect), `deleteCurrentUser()`.
- `src/stores/session.ts`: `runSignOutHooks()`, shared by `signOut` and deletion; `deleteAccount()` runs D5.
- `src/components/profile/AccountSection.vue`, `DeleteAccountDialog.vue`; `ProfileView.vue` places the section and
  reads the redirect's result on load (D4).
- `src/views/PrivacyView.vue`, `src/views/DeleteAccountInfoView.vue`, `src/components/layout/LegalPage.vue` (the
  shared back button, heading and `lang="en"` wrapper); routes in `src/router/index.ts`.
- New strings in `src/i18n/locales/{en,hi}/auth.json` and `profile.json` with the same keys; the two pages' text
  is in their components, English only.
- `functions/src/deleteUserData.ts`, exported from `functions/src/index.ts`.
- `packages/android/` as A1–A5; `public/.well-known/assetlinks.json`; `.gitignore`.

## §4 Security and hostile input

- **Deletion** needs a fresh re-authentication of the signed-in user and the typed word. Firebase refuses a
  re-authentication by another account (`auth/user-mismatch`), and a stale one (`auth/requires-recent-login`).
- **The function** deletes only by the uid in the Auth event, only in that user's own documents and paths; no
  client names a uid to it, and it answers no request.
- **Redirects** add no new destination: the Google redirect comes back to the page that started it, and sign-in
  still goes only where `safeRedirect` allows.
- **The public pages** take no input and render only fixed text; they show nothing about the visitor.
- **The keystore** never enters the repository or a tool's output; only public fingerprints do.
- **No `firestore.rules` change:** deleting is done by the Admin SDK in the function, and the client deletes only its
  own device document, which the rules already allow.

## §5 Tests

Written first where the behaviour is new, each run alone:

- `src/services/auth.test.ts`: `signInWithGoogle` calls `signInWithRedirect` and never a popup;
  `consumeRedirectResult` reports the operation, and null when there is none.
- `src/services/account.test.ts` against the auth emulator: a wrong password leaves the user unconfirmed; a right
  one confirms; `deleteCurrentUser` deletes the user.
- `src/stores/session.test.ts`: `deleteAccount` runs the hooks before deleting, clears the stores after, and on
  failure clears nothing.
- `src/components/profile/DeleteAccountDialog.test.ts`: which confirmations show for each provider set; Delete is
  enabled only when confirmed and `DELETE` is typed (not `delete`, not ` DELETE`); `requires-recent-login` returns
  it to unconfirmed.
- `src/views/ProfileView.test.ts`: a `reauthenticate` result for the signed-in user opens the dialog confirmed;
  `auth/user-mismatch` opens it unconfirmed with its message.
- `src/router/guard.test.ts`: `/privacy` and `/delete-account` open signed out and signed in.
- `functions/src/deleteUserData.test.ts` against the emulator: only the deleted user's documents go, in every
  collection, across more than `500`; a second run succeeds and deletes nothing more.
- `functions/src/reminders.test.ts`: D7.

## §6 Out of scope

Export and import (part 8); a password reset ([questions/password-reset](../../knowledge/questions/password-reset.md));
translating the legal pages; the Play Store listing's text, icon, feature graphic and screenshots; publishing the
app; the iOS wrapper ([decisions/ios-wrapper-unmaintained](../../knowledge/decisions/ios-wrapper-unmaintained.md)).

## §7 For the developer to confirm at review

- The project has no Firestore backups or point-in-time recovery turned on. If it has, W3 and W4 must say how long
  a deleted account's data stays in them.
- Email deletion requests are answered within 30 days, and only from the account's own address (W4).
- The upload key's SHA-256 fingerprint, if the keystore exists already; otherwise A4 waits for it, and the plan
  leaves that step to you.
