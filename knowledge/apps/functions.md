---
type: Application
title: Cloud Functions
description: The functions/ package — the five-minute reminder run and the budget kill-switch, on Node 22 with firebase-functions v2; nothing answers HTTP.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
verified: human:panditankit1995@gmail.com
---

# Cloud Functions

## Role

Server-side work the client can't do: sending push reminders on a schedule
([domain/reminder-schedule](../domain/reminder-schedule.md)) and turning billing off when the budget is spent
([integrations/cloud-billing](../integrations/cloud-billing.md)). It also holds the one-off migration of the old
app's data ([domain/legacy-documents](../domain/legacy-documents.md)).

## Stack

TypeScript compiled to `functions/lib/`, firebase-functions (v2 API) and firebase-admin, on the runtime set in
`firebase.json` (`functions.runtime`) and `functions/package.json` (`engines.node`). Tests use Vitest against
the Firestore emulator (`functions/vitest.config.ts`).

## Entry points

- `functions/src/index.ts` initialises the Admin SDK and exports `sendReminders` (`functions/src/reminders.ts`)
  and `stopBillingOnBudget` (`functions/src/budget.ts`). A test in `functions/src/reminders.test.ts` fails on any HTTP or callable export: the old public
  `testFunction` leaked every user's tokens and task titles (spec S1).
- `functions/scripts/migrate-legacy.ts`: the migration, run by hand with `npm --prefix functions run migrate`.
- The one param, `APP_URL`, is defined in `functions/src/reminders.ts` and set in `functions/.env`
  (see `functions/.env.example`).

## Screens and routes

None: no function answers HTTP.

## Depends on

[integrations/firebase](../integrations/firebase.md) (Firestore), [integrations/fcm](../integrations/fcm.md),
[integrations/cloud-billing](../integrations/cloud-billing.md).

## Sources

- `functions/package.json`
- `functions/src/index.ts`
- `functions/src/reminders.ts`
- `functions/src/budget.ts`
- `functions/scripts/migrate-legacy.ts`
- `functions/vitest.config.ts`
- `functions/src/reminders.test.ts`
- `functions/.env.example`
- `firebase.json`
