---
type: Decision
title: AI calls go through a provider layer that switches between Claude and Gemini
description: Every AI feature calls one provider interface, so Claude and Gemini can be swapped without changing the features; it starts on Claude Haiku.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-03T05:05:25Z
---

# AI calls go through a provider layer that switches between Claude and Gemini

## Context

The paid plan adds AI features (quick add from plain words, task assists, digests and more). Tying each feature to
one vendor's SDK would make a change of vendor, for cost or quality, a change to every feature.

## Decision

The developer decided on 2026-11-03 that AI features call one provider interface, never a vendor SDK directly.
Behind it sit a Claude provider and a Gemini provider, and which one runs is configuration, not code. The first
provider is Claude, on the model `claude-haiku-5-5`.

## Consequences

- A feature asks the interface for a result in a shape it defines (for example the fields of a task) and gets the
  same shape back from either provider; each provider maps its own structured-output support to that shape.
- Where the provider runs, and how its key is kept out of the browser, are settled in the first AI sub-project's
  spec.
- Switching providers changes cost and output quality, so each feature's tests run against the interface with a
  fake provider, not against a vendor.

## Sources

- `functions/src/index.ts`
