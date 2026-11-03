---
type: Data Model
title: Data model
description: Four Firestore collections — tasks, types (labels), notifications and users/{uid}/devices — each owned by the uid it carries.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
verified: human:panditankit1995@gmail.com
---

# Data model

## Entities

The client-side types are in `src/types/models.ts`; the stored fields and their limits are in `firestore.rules`.

- **Task**, collection `tasks`: a title, a Markdown description, a status, a local date and time or none,
  labels, and the reminder fields. Details: [data/task](task.md).
- **Label**, collection `types`: `uid`, `label` (the name) and `color`. The collection keeps the name the first
  version of the app gave it, so old data stays readable without a move (`src/services/labels.ts`). A name is
  1–30 characters after trimming (`LABEL_NAME_MAX`), a colour 1–32 (`LABEL_COLOR_MAX`).
- **Notification**, collection `notifications`: `uid`, `title`, `body`, `taskId` and `createdAt`, written only by
  `sendReminders` (`functions/src/reminders.ts`). Old ones carry a `timestamp` text instead of `createdAt`
  ([domain/legacy-documents](../domain/legacy-documents.md)).
- **Device**, `users/{uid}/devices/{token}`: one document per FCM registration token, holding exactly `uid`,
  `token`, `userAgent` and `updatedAt` (`src/services/devices.ts`). The token is the document id.
- The old app's `fcm/{uid}` documents are still in the live database but nothing reads them, and the rules
  deny them (no `match` covers them).

## Relations

- Every document carries its owner's `uid`; devices also live under the owner's path. The rules allow access
  only when `uid` is the caller's ([security/roles](../security/roles.md)).
- `Task.labelIds` holds `types` document ids. The join happens in `src/stores/labels.ts`: an id with no label
  is not shown, and nothing stored changes (spec D6).
- `Notification.taskId` names the task it reminded about; the task may since have been deleted.
- `sendReminders` finds due tasks through the one composite index, `tasks (reminded, remindAt)`, in
  `firestore.indexes.json`.

## Sources

- `src/types/models.ts`
- `firestore.rules`
- `firestore.indexes.json`
- `src/services/labels.ts`
- `src/services/devices.ts`
- `src/stores/labels.ts`
- `functions/src/reminders.ts`
