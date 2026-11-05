---
type: Open Question
title: Should wrong-password and unknown-user sign-in errors share one message?
description: Sign-in words a wrong password and an unknown email differently, which reveals whether an email has an account, unless Firebase's email enumeration protection is on for spanion-todo, which nobody has confirmed.
generated:
  by: agent:after-finish/claude-sonnet-5-5
  at: 2026-11-05T00:00:00Z
---

# Should wrong-password and unknown-user sign-in errors share one message?

## Question

`auth/wrong-password` and `auth/user-not-found` map to different copy (`authErrorKey` in `src/lib/authForm.ts`,
the strings in `src/i18n/locales/en/auth.json`), so anyone can learn whether an email has an account by trying it
on [features/sign-in](../features/sign-in.md). If the live project has Firebase's email enumeration protection on,
Firebase returns `auth/invalid-credential` for both, which is already mapped to one message, and the difference
never shows. Nobody has confirmed whether protection is on for `spanion-todo`. Should the two codes share one
message regardless, so the app doesn't depend on that console setting?

Raised on 2026-11-05 after the sign-in visual fixes; the developer hasn't answered yet.

## Status

Open

## Sources

- `src/lib/authForm.ts`
- `src/i18n/locales/en/auth.json`
- [security/auth](../security/auth.md)
