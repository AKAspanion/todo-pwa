---
type: Decision
title: Ask your tasks reads the tasks into the prompt, on its own screen, one question at a time
description: The function puts up to 500 of the account's tasks into the prompt instead of using embeddings; questions are asked on a new Ask screen, one at a time, with no history kept.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-03T07:30:00Z
---

# Ask your tasks reads the tasks into the prompt, on its own screen, one question at a time

## Context

Part F of the AI features ([decisions/ai-features-roadmap](ai-features-roadmap.md)) answers questions from the
account's own tasks. The app already loads every task of an account at once (`listTasks` in
`src/services/tasks.ts`), so one account's tasks are small. Claude has no embeddings service; embeddings would need
another vendor whichever chat provider runs, against [decisions/ai-provider-switchable](ai-provider-switchable.md),
plus a trigger on every save, a backfill and a store for the vectors.

## Decision

The developer decided on 2026-11-03 that:

- **No embeddings.** The function reads up to 500 of the account's tasks itself and puts them in the prompt, with
  descriptions clipped; the answer cites the tasks it used. Embeddings and vector search were turned down for the
  costs above.
- **Its own screen.** Questions are asked on a new Ask screen, `/ask`, reached from the navigation; home's search
  stays plain text matching. A mode inside home's search was turned down.
- **One question at a time.** Each question is one request with no history, and nothing about past questions is
  kept beyond the request's one-day expiry. A chat with follow-ups was turned down: it costs more per question and
  needs the conversation stored.

## Consequences

- An account with more than 500 tasks is answered from the 500 the function picks, which the screen says.
- Every question sends many of the account's tasks to the provider, which the consent has to say.

## Sources

- `src/services/tasks.ts`
- `src/router/index.ts`
- `src/components/layout/AppNav.vue`
