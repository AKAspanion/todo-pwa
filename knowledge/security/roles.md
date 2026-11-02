---
type: Security
status: draft
title: Who may do what
description: One role, the owner — every document is readable and writable only by the user whose uid it carries; notifications are written only by the functions.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
---

# Who may do what

## Roles

- **Owner:** a signed-in user, for the documents whose `uid` is theirs. There are no admin, shared or public
  roles in the app.
- **Cloud Functions:** run with the Admin SDK, which `firestore.rules` doesn't govern.

## What each may do

Checked rule by rule in `firestore.rules`; anything not matched there is denied, including the old `fcm/{uid}`
documents.

| Collection | Read, delete | Create | Update |
|---|---|---|---|
| `tasks/{taskId}` | owner | owner, with every task field and nothing else, each valid | owner; `uid` can't change; only task fields, each valid; old `type`/`id` may be removed |
| `types/{labelId}` | owner | owner, with `uid`, `label`, `color`, each valid | owner; `uid` can't change |
| `notifications/{id}` | owner | nobody (functions only) | nobody |
| `users/{uid}/devices/{token}` | owner of the path | owner, exactly `uid`, `token`, `userAgent`, `updatedAt`, with `uid` and `token` matching the path | same as create |

- A client's list query must filter on its own `uid` for the rules to allow it; every service does
  (`where('uid', '==', uid)` in `src/services/tasks.ts`, `labels.ts`, `notifications.ts`).
- The functions trust nothing a client wrote about another user: `sendReminders` reads tokens only from the
  task owner's own path, so a task can't reach another user's device (spec S4, `functions/src/reminders.ts`).
- An owner can set `remindAt` on their own tasks to any instant; the per-owner limit in
  [domain/reminder-schedule](../domain/reminder-schedule.md) bounds what that costs.
- The rules are tested in `tests/rules/firestore.rules.test.ts`.

## Sources

- `firestore.rules`
- `tests/rules/firestore.rules.test.ts`
- `src/services/tasks.ts`
- `src/services/labels.ts`
- `src/services/notifications.ts`
- `functions/src/reminders.ts`
