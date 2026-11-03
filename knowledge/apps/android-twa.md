---
type: Application
title: Android app (TWA)
description: The Play Store app app.web.spanion_todo.twa, a Trusted Web Activity that opens the live site full-screen.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
verified: human:panditankit1995@gmail.com
---

# Android app (TWA)

## Role

Puts the web app on the Play Store as `app.web.spanion_todo.twa`. It holds no app logic: it opens the site
in a Trusted Web Activity.

## Stack

A Gradle Android project generated for TWAs, in `packages/android/source`. How to build and sign it is in
`packages/android/Readme.html`; its build outputs and signing keys are git-ignored.

## Entry points

- `packages/android/source/app/build.gradle`: `twaManifest.hostName` and `launchUrl` say which site it opens.
- `packages/android/source/app/src/main/java/app/web/spanion_todo/twa/LauncherActivity.java`.
- The site proves it owns the app through `public/.well-known/assetlinks.json` (the signing-key fingerprints),
  served as `application/json` by `firebase.json`. Without it the TWA shows a URL bar (spec W1).

## Screens and routes

The web app's: [apps/web](web.md).

## Depends on

[apps/web](web.md), on the Hosting domain named in `build.gradle`.

## Sources

- `packages/android/Readme.html`
- `packages/android/source/app/build.gradle`
- `packages/android/source/app/src/main/java/app/web/spanion_todo/twa/LauncherActivity.java`
- `public/.well-known/assetlinks.json`
- `firebase.json`
