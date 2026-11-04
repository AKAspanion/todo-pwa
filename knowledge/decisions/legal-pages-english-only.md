---
type: Decision
title: The privacy policy and account-deletion pages are in English only
description: /privacy and /delete-account are public pages written in English only, even in Hindi, because a translated legal text could say something the English doesn't.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-04T09:20:07Z
---

# The privacy policy and account-deletion pages are in English only

## Context

The app is in English and Hindi ([features/language-and-theme](../features/language-and-theme.md)). The Play
listing needs a public privacy policy and an account-deletion page
([decisions/account-deletion-for-play](account-deletion-for-play.md)).

## Decision

The developer decided on 2026-11-04: `/privacy` and `/delete-account` are written in English only, whatever language
the app is set to, because a translation nobody has checked could promise something the English doesn't. The links
that lead to them are translated like any other string.

## Consequences

- A Hindi reader sees these two pages in English.
- Translating them later needs someone who can check the Hindi against the English.

## Sources

- `docs/specs/2026-11-04-play-store-twa.md`
