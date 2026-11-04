---
type: Feature
title: Notifications and push reminders
description: The notifications screen — a per-device push toggle and the list of reminders received, newest first.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
verified: human:panditankit1995@gmail.com
---

# Notifications and push reminders

## What it does

The user switches push reminders on or off for this device, and sees the reminders sent to them, newest first,
each deletable. When a reminder arrives while the app is open, the snackbar shows it with a View action;
when it arrives in the background the service worker shows it, and clicking it opens the notifications
screen. When reminders are sent is [domain/reminder-schedule](../domain/reminder-schedule.md).

## Screens and routes

- `/notification`: `src/views/NotificationsView.vue`, drawn and worded like the old Notification (the delete
  icon is white on the card; the push switch and newest-first order are the rewrite's), with `src/stores/notifications.ts` and
  `src/services/notifications.ts`.
- Push on the client: `src/pwa/useMessaging.ts`; in the background: `src/sw.ts`.

## Rules

- Permission is asked for only by the toggle, from a click, and only where Firebase messaging is supported and
  the browser has `Notification` and service workers (iOS Safari has no `Notification`); elsewhere the toggle
  is disabled with a message (spec P1).
- One foreground `onMessage` handler per page session, however often users sign in and out (spec P2).
- Each device is one document, `users/{uid}/devices/{token}` (spec P3). It is deleted when the toggle goes
  off, before sign-out, and when the browser's permission is found revoked. If another account's token is
  still on this browser, it is revoked so FCM reports it dead and the server deletes it. Which user a token was
  saved for is kept in local storage under `DEVICE_STORAGE_KEY`.
- The list is sorted on the client, not by the query, so old notifications without `createdAt` still appear
  (`listNotifications` in `src/services/notifications.ts`). Times are shown in the browser's zone (spec D5).
- The client can only read and delete notifications; only the function writes them
  ([security/roles](../security/roles.md)).

## History

- 2026-11-04: was the rewrite's layout and text; now the old Notification's, because the app is restored to the old look. See [decisions/restore-original-design](../decisions/restore-original-design.md).

## Sources

- `src/views/NotificationsView.vue`
- `src/stores/notifications.ts`
- `src/services/notifications.ts`
- `src/services/devices.ts`
- `src/pwa/useMessaging.ts`
- `src/sw.ts`
