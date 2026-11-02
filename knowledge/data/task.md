---
type: Data Model
status: draft
title: Task
description: A task document's fields, which of them the user enters and which are derived on every save, and the limits the rules enforce.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
---

# Task

## Fields

`Task` in `src/types/models.ts`; the stored set is `taskFields()` in `firestore.rules`.

- Entered by the user (`TaskInput`): `title`, `description` (Markdown), `indefinite`, `date` (`'YYYY-MM-DD'`),
  `time` (`'HH:mm'`) and `labelIds`. `status` is `'todo'` or `'done'`.
- Derived by `src/services/tasks.ts` on every save, never taken from the caller (spec P6):
  - `timeZone`: the device's IANA zone when the task is created, or when its date, time or `indefinite` flag
    changes; otherwise it keeps the zone it had.
  - `remindAt`: the due instant in UTC (`computeRemindAt` in `src/lib/dates.ts`), or `null` for an indefinite
    or done task.
  - `reminded`: `false` on create and whenever the schedule changes; `sendReminders` sets it to `true`.
- `uid` is set on create and can never change. `id` is the document id, never stored (spec D7).

## Rules

- `firestore.rules` checks each field it is given: `title` 1–200 characters, `description` up to 5,000,
  `labelIds` a list of at most 100, `date` and `time` matching their patterns or `null`, `timeZone` 1–64
  characters. The add screen checks the same title and description limits before sending
  (`src/views/TaskAddView.vue`); the edit form (`src/components/tasks/TaskEditForm.vue`) doesn't, so an edit
  past them is refused by the rules and shown as a failed save.
- A create must carry every field and nothing else. An update may change only task fields, and may remove the
  old app's `type` and `id` fields but never set them, so editing an old task moves it to the new shape.
- An indefinite task has `date` and `time` `null`; label ids are made distinct (`normalise` in
  `src/services/tasks.ts`).
- Dates and times are wall-clock values: [domain/local-dates](../domain/local-dates.md).

## Sources

- `src/types/models.ts`
- `firestore.rules`
- `src/services/tasks.ts`
- `src/lib/dates.ts`
- `src/views/TaskAddView.vue`
- `src/components/tasks/TaskEditForm.vue`
