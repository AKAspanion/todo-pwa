---
type: Business Rule
title: Old documents stay readable
description: Documents the 2019 app wrote are read defensively and moved to the new shape on edit; a one-off migration fills in the reminder fields.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
verified: human:panditankit1995@gmail.com
---

# Old documents stay readable

## Rule

- Data written by the old app stays readable (spec §10), and a malformed field never breaks the list it is in
  (spec D6). Every Firestore document is read field by field in `src/services/legacy.ts`.
- Old task shapes: `date` or `time` of `'NA'` (read as indefinite), labels in `type` as a list of `types/{id}`
  references (read as `labelIds`), no `description`, `timeZone`, `remindAt` or `reminded`. An old time zone is
  `LEGACY_TIME_ZONE`.
- Old notifications carry `timestamp` as India-time `toLocaleString()` text instead of `createdAt`; it is
  parsed, and one that can't be is shown with no time.
- Editing an old task writes the new shape and deletes its `type` and `id` fields (`updateTask` in
  `src/services/tasks.ts`); the rules allow removing those fields, never setting them.
- The one-off migration, `functions/scripts/migrate-legacy.ts`, adds the missing `timeZone`, `remindAt` and
  `reminded` to tasks and a `createdAt` to notifications, and changes nothing else. It doesn't copy the old
  push tokens (`fcm/{uid}`): they belong to the old FCM worker, which the site now removes, and one browser's
  token could sit under several accounts. Users switch push on again once. Running it again changes nothing.

## Where it is enforced

`src/services/legacy.ts` (reads), `src/services/tasks.ts` (writes), `firestore.rules` (`legacyTaskFields`),
and `functions/scripts/migrate-legacy.ts`.

## Sources

- `src/services/legacy.ts`
- `src/services/tasks.ts`
- `firestore.rules`
- `functions/scripts/migrate-legacy.ts`
- `docs/specs/2026-11-02-modernize-and-fix.md`
