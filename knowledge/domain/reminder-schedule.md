---
type: Business Rule
status: draft
title: Reminder schedule
description: A dated, not-done task gets one push in the hour before it is due, from a run every five minutes with per-run and per-owner limits.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
---

# Reminder schedule

## Rule

- A task is due for a reminder when `reminded` is `false` and `remindAt`, its due instant, is in
  `(now, now + 60 min]` (`dueWindow` in `functions/src/dueTasks.ts`). The lower bound is open, so a reminder
  whose moment has passed is never sent late. Indefinite and done tasks have `remindAt: null` and are never read.
- `sendReminders` runs `every 5 minutes`. Each run reads at most `MAX_REMINDERS_PER_RUN` due tasks, earliest
  first, sends at most `MAX_REMINDERS_PER_OWNER` per owner, and handles `REMINDER_CONCURRENCY` tasks at once
  (`functions/src/dueTasks.ts`). The limits exist so one account flooding `remindAt` can't stall everyone's
  reminders (review I7); tasks over a limit keep `reminded: false` and go first in the next run.
- Each reminder is one FCM message to every device the owner has, titled `REMINDER_TITLE`, with the body
  `reminderBody` builds from the title (clipped to `MAX_TITLE_LENGTH`) and the task's time.
- When at least one device got it, the run writes a `notifications` document and sets `reminded: true` in one
  batch. When the owner has no devices, it sets `reminded: true` and writes nothing. When every send failed for
  a reason other than a dead token, the task stays `reminded: false` for the next run.
- A token FCM reports dead (`messaging/registration-token-not-registered`, `messaging/invalid-registration-token`)
  has its device document deleted. One task's or one device's failure never stops the others.
- Changing a task's date, time or `indefinite` flag resets `reminded` ([data/task](../data/task.md)).

## Where it is enforced

- `functions/src/reminders.ts`: `runReminders` and `remindTask`; `sendReminders` is the scheduled trigger.
- `functions/src/dueTasks.ts`: the window, the limits, the message text and the concurrency helper.
- `src/services/tasks.ts` and `computeRemindAt` in `src/lib/dates.ts`: `remindAt` and `reminded` on save.
- `firestore.indexes.json`: the `(reminded, remindAt)` index the query needs.

## Sources

- `functions/src/reminders.ts`
- `functions/src/dueTasks.ts`
- `src/services/tasks.ts`
- `src/lib/dates.ts`
- `firestore.indexes.json`
