---
type: Decision
title: Payments reach the server without an HTTP function
description: The app hands each payment result to the function through a request document to verify; Play's renewals arrive by Pub/Sub, and Razorpay subscriptions are checked once a day, so the no-HTTP rule stands.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-03T08:00:00Z
---

# Payments reach the server without an HTTP function

## Context

Payment providers usually report renewals, cancellations and refunds to an HTTP webhook. No function here answers HTTP
or callable requests, and a test fails on any such export, because the old public `testFunction` leaked every user's
tokens and task titles ([apps/functions](../apps/functions.md)). Google Play can send its real-time notifications to
a Pub/Sub topic; Razorpay sends them only to webhooks.

## Decision

The developer decided on 2026-11-03 that:

- After a purchase, the app writes the provider's result (Razorpay's payment id, subscription id and signature, or
  Play's purchase token) to a request document. A Firestore-triggered function verifies it with the provider itself
  and only then grants Pro, as AI requests do ([decisions/ai-requests-via-firestore](ai-requests-via-firestore.md)).
- Play's renewals, cancellations and refunds arrive on a Pub/Sub topic, handled by an event-triggered function.
- Razorpay subscriptions are checked once a day through Razorpay's API, so a cancellation, failed renewal or refund
  there takes effect within a day.
- The no-HTTP rule and its test stand. One HTTP webhook for Razorpay was turned down: it would replace a reviewed
  rule to save at most a day.

## Consequences

- A Razorpay subscriber whose renewal fails keeps Pro for up to a day longer than a webhook would allow.
- The function makes outbound calls to Razorpay's and Google's APIs, with credentials held as secrets or by its service
  account.

## Sources

- `functions/src/index.ts`
- `functions/src/reminders.test.ts`
- `functions/src/budget.ts`
