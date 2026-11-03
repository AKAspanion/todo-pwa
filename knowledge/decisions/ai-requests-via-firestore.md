---
type: Decision
title: AI requests travel as Firestore documents, not callable functions
description: The app writes an aiRequests document, a Firestore-triggered function calls the AI and writes the answer back, so no function answers HTTP or callable requests.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-03T05:14:00Z
---

# AI requests travel as Firestore documents, not callable functions

## Context

The AI provider's key must stay on the server ([decisions/ai-provider-switchable](ai-provider-switchable.md)), so
the browser can't call the AI itself. A callable function is the usual way in, but no function here answers HTTP or
callable requests: a test in `functions/src/reminders.test.ts` fails on any such export, because the old public
`testFunction` leaked every user's tokens and task titles ([apps/functions](../apps/functions.md)).

## Decision

The developer decided on 2026-11-03 that an AI request is a document the app writes to `aiRequests`. A function
triggered by its creation checks the account, calls the provider and writes the answer onto the same document,
which the app is listening to. The no-HTTP, no-callable rule and its test stand.

## Consequences

- `firestore.rules` can refuse a request from an account without Pro before any function runs
  ([decisions/pro-granted-by-admin-script](pro-granted-by-admin-script.md)).
- A request made offline waits in Firestore's queue and runs when the device is back online.
- An answer takes about a second longer than a direct call would.
- Firestore triggers can run more than once for one document, so the function claims a request before calling the
  provider, and a request is answered and counted once.

## Sources

- `functions/src/index.ts`
- `functions/src/reminders.test.ts`
- `firestore.rules`
