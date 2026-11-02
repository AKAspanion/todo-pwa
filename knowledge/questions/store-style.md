---
type: Open Question
status: draft
title: Which Pinia store style does new code use?
description: Four stores use the options style and the session store the setup style.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
---

# Which Pinia store style does new code use?

## Question

`src/stores/tasks.ts`, `labels.ts`, `notifications.ts` and `ui.ts` are options stores; `src/stores/session.ts`
is a setup store. Which should a new store follow?

## Why it matters

Reviewers check new code against [project/conventions](../project/conventions.md), which can't state a rule
until this is decided.

## Status

Open

## Sources

- `src/stores/tasks.ts`
- `src/stores/session.ts`
