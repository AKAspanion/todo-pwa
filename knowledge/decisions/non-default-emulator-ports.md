---
type: Decision
title: The emulators run on their own ports
description: Auth, Firestore and Functions emulators use ports other than Firebase's defaults, set once in firebase.json, because another local project uses the defaults.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
verified: human:panditankit1995@gmail.com
---

# The emulators run on their own ports

## Context

Firebase's emulators default to well-known ports, and another project on the developer's machine already uses
them (`README.md`, "Run the app against the emulators").

## Decision

The emulator ports are not Firebase's defaults. They are set only in `firebase.json` (`emulators`), and the
app, the tests and the scripts all read them from there; change them there if needed.

## Consequences

`vite.config.ts` reads the ports from `firebase.json` at build time, and `firebase emulators:exec`'s host
variables win when set ([integrations/firebase](../integrations/firebase.md)).

## Sources

- `firebase.json`
- `vite.config.ts`
- `README.md`
