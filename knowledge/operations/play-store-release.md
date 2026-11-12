---
type: Runbook
title: Releasing the Android app to Google Play
description: Where the Android build, signing, Digital Asset Links fingerprints, Play Console answers and the closed test are written down, and the one-time by-hand deploy of deleteUserData before the first merge.
status: draft
generated:
  by: claude-code/claude-sonnet-5-5
  at: 2026-11-05T09:30:00Z
---

# Releasing the Android app to Google Play

## Steps

The steps live in `packages/android/README.md`, which is the runbook; this concept only says where each part is,
so the two don't drift:

- **Build and signing:** the same pattern as the developer's flashcards app. The upload keystore, its password file
  and the signed release files live outside the repository in `~/keys/task-manager/`; `twa-manifest.json`'s
  `signingKey.path` names the keystore by absolute path, since Bubblewrap doesn't expand `~`. `npm run twa:update`
  regenerates the project. A release is built either with `npm run twa:build`, or with Gradle (`bundleRelease
  assembleRelease`) then signed by `jarsigner` and `apksigner` reading the password from its file, and saved as
  `~/keys/task-manager/app-release-<version>-<code>.aab` and `.apk`. The Gradle route is the one that works here:
  Bubblewrap's build refuses the Android Studio SDK at `~/Library/Android/sdk`, which has no `tools/` or `bin/`.
- **Fingerprints:** the SHA-256 of the upload key and of every certificate Play signs the installed app with go into
  `public/.well-known/assetlinks.json`; until they are there a Play install shows a URL bar. Play's are read from
  an install, since Android 17 checks a post-quantum signer the App signing page doesn't show
  ([apps/android-twa](../apps/android-twa.md)).
- **Play Console answers:** the README lists them (privacy policy `/privacy`, account deletion `/delete-account`,
  see [features/legal-pages](../features/legal-pages.md)).
- **Closed test:** a new personal developer account needs a closed test with 12 testers for 14 days before it can
  publish to production.
- **Before the first merge:** deploy `deleteUserData` by hand from the branch, because hosting deploys on every
  push to `master` and functions only by a manual run: [decisions/delete-function-deployed-by-hand-first](../decisions/delete-function-deployed-by-hand-first.md).
  See also [operations/deploy](deploy.md).

## History

- 2026-11-12: the fingerprints were to go into `assetlinks.json` and `twa-manifest.json`, Play's being the App signing page's key; now only `assetlinks.json`, with every certificate read from a Play install, because a Play install still showed a URL bar on Android 17.
- 2026-11-05: the developer was to create a new upload key and build with `bubblewrap build`; now the existing key in
  `~/keys/task-manager/` is reused and releases follow the flashcards pattern (Gradle, then `jarsigner` and
  `apksigner` with a password file), because the developer asked for that pattern and Bubblewrap's SDK check fails
  on this machine.

## Sources

- `package.json`
- `packages/android/README.md`
- `packages/android/twa-manifest.json`
- `public/.well-known/assetlinks.json`
- `.github/workflows/deploy.yml`
