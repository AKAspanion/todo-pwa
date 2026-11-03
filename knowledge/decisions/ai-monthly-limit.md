---
type: Decision
title: Each Pro account gets 300 AI requests a month
description: The function counts each account's AI requests per calendar month and refuses any past the limit, because AI spend shares the budget whose kill-switch also stops reminders.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-03T05:14:00Z
---

# Each Pro account gets 300 AI requests a month

## Context

Every AI request costs money on the Blaze plan, and spend is capped only by the budget kill-switch, which unlinks
billing for the whole project and so stops push reminders for everyone too
([integrations/cloud-billing](../integrations/cloud-billing.md)). One account sending requests in a loop could
reach the budget.

## Decision

The developer decided on 2026-11-03 on a hard limit of `AI_MONTHLY_LIMIT = 300` requests per account per calendar
month. The function counts a request before calling the provider and refuses any request past the limit without
calling it.

## Consequences

- A refused request costs a function run and a Firestore write, but no AI spend.
- The limit is the same for every Pro account until payments bring plans of different sizes.

## Sources

- `functions/src/budget.ts`
