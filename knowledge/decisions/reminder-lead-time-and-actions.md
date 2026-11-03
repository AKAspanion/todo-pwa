---
type: Decision
title: Reminders go at a lead time each task chooses, with Mark done and Snooze that open the app
description: Each task picks how long before it is due to be reminded (stored as remindBefore and notifyAt); the push carries Mark done and Snooze buttons that open the app to act; snooze is 15 minutes or 1 hour.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-03T05:47:15Z
---

# Reminders go at a lead time each task chooses, with Mark done and Snooze that open the app

## Context

A dated todo task got one push somewhere in the hour before it was due, from a run every five minutes whose window
was `(now, now + 60 min]` over `remindAt`, the due instant ([domain/reminder-schedule](../domain/reminder-schedule.md)).
The push carried a `notification` part, which Firebase shows by itself, so it could carry no buttons, and clicking it
opened the notifications screen ([features/notifications](../features/notifications.md)). The service worker has no
signed-in session, and no function may answer HTTP ([apps/functions](../apps/functions.md)). Part 6 of
[decisions/usability-roadmap](usability-roadmap.md) adds lead times, actions, snooze and a badge.

## Decision

The developer decided on 2026-11-03:

- **Lead time per task:** at the due time, or `5`, `15`, `30`, `60` (the default) or `1440` minutes before, stored as
  `remindBefore`. `notifyAt` is the moment to send; `remindAt` keeps meaning the due instant. The run looks for
  `notifyAt` in `(now, now + 5 min]`, so a reminder arrives up to five minutes early and never late. A one-off
  migration gives existing tasks `remindBefore: 60`.
- **Actions open the app:** the push becomes data-only and the service worker shows it with **Mark done** and
  **Snooze 15 min**. Either opens or focuses the app, which acts and offers Undo. A service worker with its own
  Firebase sign-in and Firestore was turned down: a larger worker and a second place that writes data.
- **Snooze** is `15` minutes or `1` hour: both on the notifications screen, 15 minutes on the push (browsers show at
  most two buttons).
- A reminder opens its task on Home (`/home?task=<id>`), not the notifications screen.

## Consequences

- The reminder rule in [domain/reminder-schedule](../domain/reminder-schedule.md) changes when this is built: its
  window, the field it reads and the index it needs.
- Deploy order matters: the rules and client first (as every push to `master` does), then the migration, then the
  functions ([operations/deploy](../operations/deploy.md)).
- The behaviour is specified in `docs/specs/2026-11-03-reminder-lead-time-and-actions.md`.

## Sources

- `docs/specs/2026-11-03-reminder-lead-time-and-actions.md`
- `functions/src/reminders.ts`
- `functions/src/dueTasks.ts`
- `functions/scripts/migrate-legacy.ts`
- `src/sw.ts`
- `firestore.indexes.json`
