---
type: Application
title: Cloud Functions
description: The functions/ package — the five-minute reminder run, the budget kill-switch and the deletion of a deleted user's data; nothing answers HTTP.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
verified: human:panditankit1995@gmail.com
---

# Cloud Functions

## Role

Server-side work the client can't do: sending push reminders on a schedule
([domain/reminder-schedule](../domain/reminder-schedule.md)) and turning billing off when the budget is spent
([integrations/cloud-billing](../integrations/cloud-billing.md)), and erasing a user's data when their account is
deleted ([features/account-deletion](../features/account-deletion.md)). It also holds the one-off migration of the old
app's data ([domain/legacy-documents](../domain/legacy-documents.md)).

## Stack

TypeScript compiled to `functions/lib/`, firebase-functions (v2 API, except `deleteUserData`, which uses `firebase-functions/v1` because only v1 has an Auth user-deletion trigger) and firebase-admin, on the runtime set in
`firebase.json` (`functions.runtime`) and `functions/package.json` (`engines.node`). Tests use Vitest against
the Firestore emulator (`functions/vitest.config.ts`). `@google-cloud/functions-framework` is a dependency though no
code imports it: Google's Cloud Build refuses a pnpm functions package without it ("This project is using pnpm but you
have not included the Functions Framework"), which the first deploy after the switch to pnpm hit on 2026-11-05.

## Entry points

- `functions/src/index.ts` initialises the Admin SDK and exports `sendReminders` (`functions/src/reminders.ts`),
  `stopBillingOnBudget` (`functions/src/budget.ts`) and `deleteUserData` (`functions/src/deleteUserData.ts`). A test in `functions/src/reminders.test.ts` fails on any HTTP or callable export: the old public
  `testFunction` leaked every user's tokens and task titles (spec S1).
- `deleteUserData` is an Auth user-deletion trigger with a `failurePolicy`, so a failed run is retried; it answers no
  HTTP. It erases the user's `tasks`, `types` and `notifications`, `users/{uid}/devices`, `users/{uid}` and
  `fcm/{uid}`, in batches of `DELETE_BATCH` (`500`), so a run that fails part-way leaves only what it hadn't reached.
  A uid that can't be a document id is logged once by code and dropped, not retried, since no retry can fix it and
  the guard keeps a crafted uid from reaching another user's paths. Its first deploy is by hand
  ([decisions/delete-function-deployed-by-hand-first](../decisions/delete-function-deployed-by-hand-first.md)).
  `errorCode` and `isOwnerId` are copied from `reminders.ts`
  ([findings/functions-helpers-duplicated](../findings/functions-helpers-duplicated.md)).
- `functions/scripts/migrate-legacy.ts`: the migration, run by hand with `pnpm --dir functions run migrate`.
- The one param, `APP_URL`, is defined in `functions/src/reminders.ts` and set in `functions/.env`
  (see `functions/.env.example`).

## Screens and routes

None: no function answers HTTP.

## Depends on

[integrations/firebase](../integrations/firebase.md) (Firestore), [integrations/fcm](../integrations/fcm.md),
[integrations/cloud-billing](../integrations/cloud-billing.md).

## History

- 2026-11-05: two functions; now three, adding `deleteUserData`, because Play requires deleting an account to delete its data. See [decisions/account-deletion-for-play](../decisions/account-deletion-for-play.md).

## Sources

- `functions/package.json`
- `functions/src/index.ts`
- `functions/src/reminders.ts`
- `functions/src/budget.ts`
- `functions/src/deleteUserData.ts`
- `functions/scripts/migrate-legacy.ts`
- `functions/vitest.config.ts`
- `functions/src/reminders.test.ts`
- `functions/.env.example`
- `firebase.json`
