---
type: Finding
title: The developer's device received no push reminders
description: With the notifications toggle on, no reminder reached the developer's device; the production function ran every 5 minutes for two days with 233 runs, all sending nothing and failing nothing, so the gap is before the send.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-06T07:49:55Z
---

# The developer's device received no push reminders

## Finding

On 2026-11-06 the developer reported no reminder notifications on their device, with the toggle on. The production
`sendReminders` ([apps/functions](../apps/functions.md)) is deployed and runs every 5 minutes, and in the two days
before the report every run finished with `sent: 0`, `failed: 0` and `removedTokens: 0`, and logged no warning. So
no send failed: either no task was due in a run while a device was saved, or no device document reached the server.

Two behaviours make a reminder silently not happen (`remindTask` and `dueWindow` in `functions/src/`):

- A task whose owner has no device document when its `remindAt` comes into the window is marked `reminded: true`
  and never tried again, with no log line.
- A task is only considered while its `remindAt` is in `(now, now + 60 min]`; one created or edited closer to
  its time than the next run is never sent.

## Evidence

Cloud Logging for the `sendreminders` service, 2026-11-04 to 2026-11-06: 233 "reminders: run finished" entries, all
zero, and no other message.

## Not checked

Whether the developer's account has a device document in production, whether the production build has
`VITE_FIREBASE_VAPID_KEY` set, and whether the device's browser holds a token: reading production Firestore and the
env files was not allowed in that session. The example notification on enabling
([features/notifications](../features/notifications.md)) now shows whether the device can display one at all.

## Status

Open: needs the developer to check the device document and the production build's VAPID key.

## Sources

- `functions/src/reminders.ts`
- `functions/src/dueTasks.ts`
- `src/pwa/useMessaging.ts`
