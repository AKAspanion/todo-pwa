---
type: Integration
title: Cloud Billing budget kill-switch
description: A budget publishes to billing-budget-alerts; once the month's actual cost reaches the budget, stopBillingOnBudget unlinks the project's billing account.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
verified: human:panditankit1995@gmail.com
---

# Cloud Billing budget kill-switch

## What it is used for

Blaze has no spending cap, so `stopBillingOnBudget` (`functions/src/budget.ts`) caps it: a Cloud Billing budget
publishes notifications to the `BUDGET_TOPIC` Pub/Sub topic, and when a notification's `costAmount` reaches its
`budgetAmount`, the function unlinks the project's billing account through the Cloud Billing API. Forecasts
never set it off; only spend already incurred does.

## Configuration

- It runs as the `budget-kill-switch@` service account, which holds Project Billing Manager and nothing else.
- The budget must be connected to the topic in the console; any budget connected to it can turn billing off.
  The one-time setup, the safe test message and how to turn billing back on are in `README.md`,
  "Budget kill-switch".

## Failure modes

- Once billing is unlinked, every paid service stops, the reminders and this function included, until someone
  links the account again. If the budget still counts the month as over, the next notification unlinks it
  again: raise the budget first.
- A message that isn't a budget notification is logged and ignored (`'ignored'`); a failed unlink throws, and
  the next notification, which billing sends several times a day, tries again.

## Sources

- `functions/src/budget.ts`
- `functions/src/index.ts`
- `README.md`
