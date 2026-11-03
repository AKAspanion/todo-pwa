---
type: Integration
title: Firebase Cloud Messaging
description: Web push for reminders — tokens from the browser with the VAPID key, sends from the function over the HTTP v1 API.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
verified: human:panditankit1995@gmail.com
---

# Firebase Cloud Messaging

## What it is used for

Delivering reminder pushes ([domain/reminder-schedule](../domain/reminder-schedule.md)) to each device a user
switched them on for ([features/notifications](../features/notifications.md)).

## Configuration

- The browser gets its token with `VITE_FIREBASE_VAPID_KEY` (`src/pwa/useMessaging.ts`). Without it the site
  works but push doesn't; the deploy warns when it is unset (`.github/workflows/deploy.yml`).
- Background messages are handled in the app's own service worker on the app's Firebase major (`src/sw.ts`,
  spec P4); there is no separate messaging worker.
- The function sends through the Admin SDK (`getMessaging` in `functions/src/reminders.ts`), which uses the
  HTTP v1 API; the legacy API the old function used was shut down in 2024 (spec P5). The push icon is
  `<APP_URL>/img/icons/android-chrome-192x192.png`.

## Failure modes

- A dead token (`DEAD_TOKEN_CODES` in `functions/src/reminders.ts`) deletes its device document.
- Any other send failure is logged by code; if no device got the reminder the task is tried again next run.
- Browsers without `Notification` or service workers, such as iOS Safari, can't switch push on.

## Sources

- `src/pwa/useMessaging.ts`
- `src/sw.ts`
- `src/services/devices.ts`
- `functions/src/reminders.ts`
- `.github/workflows/deploy.yml`
