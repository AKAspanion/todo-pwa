---
type: Decision
title: Push reminders are kept, on the Blaze plan
description: Reminders stay, which needs scheduled functions and so the pay-as-you-go Blaze plan, capped by the budget kill-switch.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
verified: human:panditankit1995@gmail.com
---

# Push reminders are kept, on the Blaze plan

## Context

The old reminder function was broken in many ways (spec P5) and scheduled functions need the Blaze plan, which
has no spending cap.

## Decision

Push reminders are kept (spec §11.2), rebuilt as `sendReminders`, and the project moves to Blaze. Spend is
capped by the budget kill-switch added later (`functions/src/budget.ts`).

## Consequences

- [domain/reminder-schedule](../domain/reminder-schedule.md) and [integrations/fcm](../integrations/fcm.md).
- [integrations/cloud-billing](../integrations/cloud-billing.md): reaching the budget stops the reminders too.

## Sources

- `docs/specs/2026-11-02-modernize-and-fix.md`
- `functions/src/reminders.ts`
- `functions/src/budget.ts`
- `README.md`
