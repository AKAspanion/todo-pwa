---
type: Architecture
status: draft
title: Architecture
description: A Vue SPA that talks straight to Firebase Auth and Firestore, guarded by security rules, plus two Cloud Functions and one service worker.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
---

# Architecture

## Services

- **The web app** (`src/`) is a static SPA built by Vite to `dist/` and served by Firebase Hosting, which
  rewrites every path to `/index.html` (`firebase.json`, `hosting.rewrites`).
- **There is no API server.** The app calls Firebase Auth and Cloud Firestore through the modular client SDK,
  set up once in `src/lib/firebase.ts`. `firestore.rules` is therefore the only server-side check on what a
  client may read or write ([security/roles](../security/roles.md)).
- **Cloud Functions** (`functions/src/index.ts`) export exactly two functions, neither answering HTTP:
  `sendReminders` and `stopBillingOnBudget` ([apps/functions](../apps/functions.md)). They use the Admin SDK,
  which the rules don't govern.
- **One service worker**, `src/sw.ts`, built by vite-plugin-pwa (`injectManifest`): the precached app shell,
  the update handshake and background push ([features/offline-and-updates](../features/offline-and-updates.md)).

## Jobs and queues

- `sendReminders`: Cloud Scheduler, `every 5 minutes` in UTC (`functions/src/reminders.ts`); see
  [domain/reminder-schedule](../domain/reminder-schedule.md).
- `stopBillingOnBudget`: a Pub/Sub trigger on the `billing-budget-alerts` topic (`functions/src/budget.ts`);
  see [integrations/cloud-billing](../integrations/cloud-billing.md).

## Data flow

A screen in `src/views/` reads and changes data only through a Pinia store in `src/stores/`; each store calls
a service in `src/services/`, which is the only code that touches Firestore and maps documents to the types in
`src/types/models.ts` (reading old shapes through `src/services/legacy.ts`). The session store
(`src/stores/session.ts`) follows Firebase's signed-in user and clears every per-user store when the user
changes or signs out.

Reminders flow the other way: a saved task carries `remindAt`; `sendReminders` finds due tasks, pushes through
FCM to each device under `users/{uid}/devices`, writes a `notifications` document and sets `reminded`. The
service worker shows the push; the notifications screen lists the documents
([features/notifications](../features/notifications.md)).

## Sources

- `firebase.json`
- `firestore.rules`
- `src/lib/firebase.ts`
- `src/main.ts`
- `src/stores/session.ts`
- `src/services/legacy.ts`
- `src/types/models.ts`
- `src/sw.ts`
- `functions/src/index.ts`
- `functions/src/reminders.ts`
- `functions/src/budget.ts`
