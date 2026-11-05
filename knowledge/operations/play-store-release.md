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

- **Build and signing:** Bubblewrap `1.27.0` from `packages/android/twa-manifest.json`, with an upload keystore the
  developer creates and keeps outside the repository.
- **Fingerprints:** the SHA-256 of the upload key and of Play's app-signing key go into `public/.well-known/assetlinks.json`
  and `twa-manifest.json`; until they are there the app shows a URL bar.
- **Play Console answers:** the README lists them (privacy policy `/privacy`, account deletion `/delete-account`,
  see [features/legal-pages](../features/legal-pages.md)).
- **Closed test:** a new personal developer account needs a closed test with 12 testers for 14 days before it can
  publish to production.
- **Before the first merge:** deploy `deleteUserData` by hand from the branch, because hosting deploys on every
  push to `master` and functions only by a manual run: [decisions/delete-function-deployed-by-hand-first](../decisions/delete-function-deployed-by-hand-first.md).
  See also [operations/deploy](deploy.md).

## Sources

- `packages/android/README.md`
- `packages/android/twa-manifest.json`
- `public/.well-known/assetlinks.json`
- `.github/workflows/deploy.yml`
