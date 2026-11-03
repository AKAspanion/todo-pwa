---
type: Decision
title: New Pinia stores use the setup style
description: A new store is written as a setup store, like the session store; the four options stores stay as they are until they are changed for another reason.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-03T04:18:47Z
verified: human:panditankit1995@gmail.com
---

# New Pinia stores use the setup style

## Context

Four stores use Pinia's options style and `src/stores/session.ts` the setup style
([questions/store-style](../questions/store-style.md)).

## Decision

The developer chose on 2026-11-03: new stores use the setup style, `defineStore('<name>', () => { ... })`, as
`src/stores/session.ts` does.

## Consequences

- [project/conventions](../project/conventions.md) states the rule for new code.
- `src/stores/tasks.ts`, `labels.ts`, `notifications.ts` and `ui.ts` stay options stores; nothing decided
  that they must be rewritten.

## Sources

- `src/stores/session.ts`
- `src/stores/tasks.ts`
