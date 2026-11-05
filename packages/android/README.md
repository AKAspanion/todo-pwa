# Task Manager for Android

The Play Store app `in.spanion.todo.pwa` is a Trusted Web Activity: it opens
`https://todo.spanion.in/home` full-screen in the user's browser. The Bubblewrap CLI `1.27.0` generates this
Gradle project from [`twa-manifest.json`](twa-manifest.json), and the project targets API `36`, which Play
requires of new apps from 31 August 2026.

Change the app only by editing `twa-manifest.json` and running `bubblewrap update`: Bubblewrap regenerates
every other file here, so a hand edit to a generated file is lost. `fallbackType` stays `customtabs`, never
`webview`, because Google refuses sign-in in a WebView.

The spec is [docs/specs/2026-11-04-play-store-twa.md](../../docs/specs/2026-11-04-play-store-twa.md) (A1–A5).

## Prerequisites

- Node, as for the web app ([README.md](../../README.md), Prerequisites).
- The Bubblewrap CLI, run as `npx @bubblewrap/cli@1.27.0`. It is not in any `package.json`. On its first run it
  installs its own JDK and Android SDK.

Run every command below in `packages/android`.

## Once: the upload keystore

Create the upload key where `twa-manifest.json`'s `signingKey` expects it (`./android.keystore`, alias
`android`), with the JDK's `keytool`:

```bash
keytool -genkeypair -v -keystore android.keystore -alias android -keyalg RSA -keysize 2048 -validity 10000
```

**Or reuse the existing upload key.** The developer already has one, kept outside the repository with its
passwords and alias; its fingerprint (`05:FF:05:24:…:A0:80`) is the one `assetlinks.json` lists. Copy that
keystore here as `android.keystore`, and set `signingKey.alias` in `twa-manifest.json` to its alias, rather than
creating a new key.

The keystore and its passwords never enter the repository or a tool's output: `.gitignore` keeps out
`*.keystore` and `*.jks`, the built `*.apk`, `*.aab` and `*.idsig`, Gradle's build output and
`local.properties`. Keep a copy of the keystore, and its passwords, somewhere safe outside the repository.

## Build

```bash
npx @bubblewrap/cli@1.27.0 build
```

It asks for the keystore's and the key's passwords, and writes `app-release-bundle.aab`, the file Play takes,
and `app-release-signed.apk`, to install on a phone and try.

## Digital Asset Links

The app opens full-screen, without a browser address bar, only when
[`public/.well-known/assetlinks.json`](../../public/.well-known/assetlinks.json) lists the SHA-256
fingerprint of the key that signed the installed app. It lists `in.spanion.todo.pwa` only; fingerprints are
public, so they are committed, and nothing reads the keystore to get them.

1. Read the upload key's fingerprint, the `SHA256:` line of:

   ```bash
   keytool -list -v -keystore android.keystore -alias android
   ```

2. Add it to `sha256_cert_fingerprints` in `assetlinks.json`.
3. After the first upload, Play signs the app with its own app-signing key: in Play Console, App integrity,
   App signing, copy the app-signing key certificate's SHA-256 fingerprint and add it beside the first.
4. Deploy the site, then check `https://todo.spanion.in` with `in.spanion.todo.pwa` and each fingerprint in
   Google's [Statement List Generator and Tester](https://developers.google.com/digital-asset-links/tools/generator).
   Hosting serves the file as `application/json` (`firebase.json`).

## Before the first release: deploy order

Hosting deploys on every push to master and shows Delete account (D8), so `deleteUserData` must already be
deployed: no account is ever deleted without its data. The manual functions run only works from master, so for
this first release the function is deployed by hand, once, before the merge
([decision](../../knowledge/decisions/delete-function-deployed-by-hand-first.md)):

1. Before merging this branch, from a checkout of it, signed in to Firebase with your own account, run
   `pnpm exec firebase deploy --only functions:deleteUserData --project spanion-todo`.
2. Check `deleteUserData` is listed on the Functions page of the Firebase console.
3. Then merge; hosting deploys on the push to master.

This is a one-time step for the first release. Later function changes use the manual functions run as before
([knowledge/operations/deploy](../../knowledge/operations/deploy.md)).

## Each release

1. `npx @bubblewrap/cli@1.27.0 update --appVersionName=<new version>`: raises the version code in
   `twa-manifest.json` by one, sets the version name, and regenerates the project. Commit the result.
2. `npx @bubblewrap/cli@1.27.0 build`.
3. Upload `app-release-bundle.aab` to the release in Play Console.

## Play Console

What to enter:

- **Developer:** name Ankit Kumar Pandit, contact email panditankit1995@gmail.com.
- **Privacy policy:** `https://todo.spanion.in/privacy`.
- **Account deletion:** `https://todo.spanion.in/delete-account`.
- **Data safety:** the data the privacy policy (W3) lists as collected, each for the reason it gives:
  - account: email address, display name, profile photo address (from Google), the sign-in method and an
    account ID, to sign the user in and show their profile;
  - content: tasks, labels and the reminders sent, to run the app;
  - push devices: a push token and the browser's user-agent text, to send reminders.

  None of it is shared; all of it is encrypted in transit; users can delete their account and its data, in the
  app and at the account deletion address. Language and theme stay on the device and are not collected.
- **App access:** sign-in is needed; give a demo account you create for the review.
- **Ads:** the app has no ads.
- **Content rating:** answer the questionnaire.
- **Target audience:** 13–15, 16–17 and 18+. The app is not in the Families programme.
- **Category:** Productivity.

A personal developer account created after 13 November 2023 must run a closed test with at least 12 testers
for 14 days before it can publish to production.
