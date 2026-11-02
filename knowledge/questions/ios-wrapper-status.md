---
type: Open Question
status: draft
title: Is the iOS wrapper still shipped?
description: packages/ios is a WKWebView wrapper with a placeholder push id, untouched since it was added and absent from the README.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
---

# Is the iOS wrapper still shipped?

## Question

Is `packages/ios` a live App Store app to maintain, an experiment to leave alone, or something to remove?

## Why it matters

Its `rootUrl` opens `/index.html` on one Hosting domain, its `gcmMessageIDKey` is a placeholder, and the 2026
rebuild didn't touch it, so changes to the site's routes, domains or auth may break it unseen.

## Status

Open

## Sources

- `packages/ios/src/Task Manager/Settings.swift`
- `README.md`
