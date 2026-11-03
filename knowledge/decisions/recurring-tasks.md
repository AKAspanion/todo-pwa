---
type: Decision
title: A repeating task creates its next occurrence when it is done
description: Each occurrence is an ordinary task; finishing one creates the next on the first pattern date after both its date and today, copying it with the checklist unticked; edits carry forward and done history stays.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-03T06:52:43Z
---

# A repeating task creates its next occurrence when it is done

## Context

Part 7 of [decisions/usability-roadmap](usability-roadmap.md) adds recurring tasks, the riskiest part. The developer
was grilled on it on 2026-11-03 before any spec; these are the answers.

## Decision

- **Model:** each occurrence is an ordinary task document. Marking one done keeps it in Done and creates the next
  as a new todo task, linked by `seriesId`. Rolling one document forward and computing virtual occurrences were
  turned down: the first loses history, the second needs new machinery for reminders, done state and edits.
- **Patterns:** every N days; every N weeks on chosen weekdays; every N months on the start date's day (29th–31st
  fall on the last day of shorter months); every N years (29 Feb falls on 28 Feb). N is 1–`99`.
- **Next date:** the first pattern date after both the finished occurrence's date and today, so missed days don't
  pile up as overdue copies.
- **A date is required**; the time is optional.
- **Ends** never, or on an end date; no occurrence count.
- **The next occurrence copies** the finished one, the checklist unticked and the reminder reset.
- **Undo** of done reopens the occurrence and deletes the occurrence it created. Reopening later creates nothing
  more when it is done again.
- **Edits** change only that occurrence and so carry forward; done history is never changed in bulk. Changing the
  Repeat setting restarts the schedule from that occurrence's date.
- **Moving one occurrence** (calendar, a new date, Skip, snooze) doesn't move the schedule.
- **Skip** moves the occurrence to its next date; **Delete** ends the series and keeps done history; both with
  Undo.
- **The calendar** shows real occurrences only, with a repeat icon.
- **Quick add** reads `every …` and `हर …` phrases.
- **The Repeat control** offers presets (Never, Every day, week, month, year) and Custom.

## Consequences

- The reminder function and the views need no change: each occurrence is a task with its own `notifyAt`.
- The behaviour is specified in `docs/specs/2026-11-03-recurring-tasks.md`.

## Sources

- `docs/specs/2026-11-03-recurring-tasks.md`
- `src/services/tasks.ts`
- `src/stores/tasks.ts`
- `firestore.rules`
