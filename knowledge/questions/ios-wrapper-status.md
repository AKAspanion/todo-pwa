---
type: Open Question
title: Is the iOS wrapper still shipped?
description: packages/ios is a WKWebView wrapper with a placeholder push id, untouched since it was added and absent from the README.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
verified: human:panditankit1995@gmail.com
---

# Is the iOS wrapper still shipped?

## Question

Is `packages/ios` a live App Store app to maintain, an experiment to leave alone, or something to remove?

## Why it matters

Its `rootUrl` (`packages/ios/src/Task Manager/Settings.swift`) opens one fixed Hosting address, the old domain's `index.html`, its `gcmMessageIDKey` is a placeholder, and the 2026
rebuild didn't touch it, so changes to the site's routes, domains or auth may break it unseen.

## Status

Answered: it isn't shipped; it stays in the repository and isn't maintained. See [ios-wrapper-unmaintained](../decisions/ios-wrapper-unmaintained.md).

## Sources

- `packages/ios/src/Task Manager/Settings.swift`
- `README.md`
