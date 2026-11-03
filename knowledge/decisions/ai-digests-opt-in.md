---
type: Decision
title: Digests are opt-in, count against the monthly limit, and fall back to plain text
description: The morning plan and weekly review are off until the person turns them on; each AI digest is one of the 300 monthly requests, and when none are left or the AI fails a plain digest written by code goes instead; the AI sees at most 30 tasks' titles, dates, times and labels.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-03T06:40:00Z
---

# Digests are opt-in, count against the monthly limit, and fall back to plain text

## Context

Part D of the AI features ([decisions/ai-features-roadmap](ai-features-roadmap.md)) sends a morning plan and a
weekly review by push. It is the first AI work that runs on a schedule rather than when the person presses
something ([decisions/ai-assists-on-request](ai-assists-on-request.md)), and it sends task data each time.

## Decision

The developer decided on 2026-11-03 that:

- **Opt-in.** Both digests are off until the person turns them on in the notifications screen. The morning plan
  defaults to `07:30` and the weekly review to Sunday at `18:00`, each changeable, in the device's time zone. Turning
  one on needs push enabled and AI consent given. On for every Pro account was turned down: it sends task data on
  a schedule the person didn't choose.
- **Counting.** An AI-written digest is one of the account's `AI_MONTHLY_LIMIT = 300` requests
  ([decisions/ai-monthly-limit](ai-monthly-limit.md)). When none are left, or the provider fails, a plain digest
  written by code goes instead and counts nothing, so a digest that was turned on never silently goes missing. A
  separate allowance was turned down as a second number to explain.
- **What the AI sees.** Titles, dates, times and labels only, of at most 30 tasks: today's and overdue tasks for the
  morning plan, the week's done and open tasks for the weekly review. Descriptions are never sent.

## Consequences

- A digest needs a per-account time, weekday, zone and language, kept in a settings document of its own, since the
  consent document is write-once.
- With no tasks to report, no digest is sent.

## Sources

- `functions/src/reminders.ts`
- `src/views/NotificationsView.vue`
