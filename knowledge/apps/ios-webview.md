---
type: Application
title: iOS wrapper
description: An Xcode project, "Task Manager", that shows the live site in a WKWebView; kept in the repository, not shipped or maintained.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
verified: human:panditankit1995@gmail.com
---

# iOS wrapper

## Role

Shows the web app inside a native iOS shell (a WKWebView), with the site's origin as its only allowed origin.
It isn't shipped or maintained, and site changes needn't keep it working
([decisions/ios-wrapper-unmaintained](../decisions/ios-wrapper-unmaintained.md)).

## Stack

Swift and UIKit with CocoaPods (`packages/ios/src/Podfile`), in `packages/ios/src/Task Manager.xcworkspace`.
`packages/ios/Readme.html` comes with it.

## Entry points

- `packages/ios/src/Task Manager/Settings.swift`: `rootUrl` (the page it opens first), `allowedOrigins`,
  display and pull-to-refresh options, and `gcmMessageIDKey`, which is still a placeholder.
- `packages/ios/src/Task Manager/WebView.swift`, `ViewController.swift`, `PushNotifications.swift`.
- `packages/ios/src/Task Manager/GoogleService-Info.plist` is the iOS Firebase config; the scan withheld it
  ([findings/committed-secret-candidates](../findings/committed-secret-candidates.md)).

## Screens and routes

The web app's: [apps/web](web.md).

## Depends on

[apps/web](web.md), at the host in `Settings.swift`.

## Sources

- `packages/ios/Readme.html`
- `packages/ios/src/Podfile`
- `packages/ios/src/Task Manager/Settings.swift`
- `packages/ios/src/Task Manager/WebView.swift`
- `packages/ios/src/Task Manager/ViewController.swift`
- `packages/ios/src/Task Manager/PushNotifications.swift`
- `packages/ios/src/Task Manager/GoogleService-Info.plist`
