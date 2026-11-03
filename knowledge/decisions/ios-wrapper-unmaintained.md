---
type: Decision
title: The iOS wrapper isn't shipped or maintained
description: packages/ios stays in the repository as it is, but nothing ships it, and changes to the site needn't keep it working.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-03T04:18:47Z
verified: human:panditankit1995@gmail.com
---

# The iOS wrapper isn't shipped or maintained

## Context

`packages/ios` is a WKWebView wrapper added with the Play Store work, untouched since, with a placeholder push
id and no mention in the README ([apps/ios-webview](../apps/ios-webview.md)).

## Decision

The developer said on 2026-11-03 that it isn't shipped: it stays in the repository as it is, and isn't
maintained.

## Consequences

- Changes to the site's routes, domains or sign-in don't need to keep `packages/ios` working, and reviews
  don't check it.
- The Android TWA is the only app-store build ([apps/android-twa](../apps/android-twa.md)).

## Sources

- `packages/ios/src/Task Manager/Settings.swift`
- `README.md`
