---
type: Decision
title: Voice capture uses the browser's speech recognition, feeding Fill from text
description: Dictation types into the Fill from text box through the browser's own speech recognition, so no audio reaches the AI provider; the site's Permissions-Policy allows the microphone for itself.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-03T06:05:00Z
---

# Voice capture uses the browser's speech recognition, feeding Fill from text

## Context

Part C of the AI features ([decisions/ai-features-roadmap](ai-features-roadmap.md)) adds voice to task. Of the two
providers, only Gemini accepts audio, so sending recordings to the provider would break the switch between Claude
and Gemini ([decisions/ai-provider-switchable](ai-provider-switchable.md)). The site sends
`Permissions-Policy: camera=(), microphone=(), geolocation=()` (`firebase.json`), which blocks the microphone.

## Decision

The developer decided on 2026-11-03 that voice is dictation by the browser's own speech recognition, typing into
the Fill from text box; the person then presses Fill as for typed text. No audio is sent to the AI provider, and
dictating spends no request. The `Permissions-Policy` header's `microphone` becomes `(self)`; `camera` and
`geolocation` stay `()`.

## Consequences

- The audio goes to the browser's own speech service (Google's on Chrome and Android, Apple's on Safari), which the
  privacy policy has to say.
- Where the browser has no speech recognition, the microphone button isn't shown.
- Recorded audio sent to a provider was turned down; it would work with Gemini only.

## Sources

- `firebase.json`
