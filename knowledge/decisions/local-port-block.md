---
type: Decision
title: Every local port is in the 2120 block
description: Every port the project opens on a developer's machine — the Vite servers and every emulator — is one of 2120–2130, assigned in order, so it runs beside other projects without a clash.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-05T04:14:14Z
---

# Every local port is in the 2120 block

## Context

The developer runs other projects on the same machine. Ports chosen one at a time (the emulators' own ports,
then Vite's default 5173, the hub's default 4400, the Hosting emulator's default 5000, which macOS AirPlay also
holds) still collided with them. The developer asked for one block, starting at `2120`, assigned one by one.

## Decision

Every port this project opens locally is in `2120`–`2130`: the dev server first (`2120`), then the emulator hub,
Auth, Firestore, the Firestore WebSocket, Functions, logging, the Emulator UI and Hosting, then `vite preview` and
the e2e run's Vite server (`2130`). The full table is in the spec,
[2026-11-05-local-dev-ports](../../docs/specs/2026-11-05-local-dev-ports.md).

- The emulator ports stay in `firebase.json` only, which the app, tests and scripts read
  ([non-default-emulator-ports](non-default-emulator-ports.md)).
- The Vite ports are in `vite.config.ts` (`server`, `preview`) and the e2e one in `playwright.config.ts`
  (`E2E_PORT` overrides it).
- Vite uses `strictPort`, so a busy port fails loudly instead of Vite moving to the next one, which belongs to
  the hub or Auth.

## Consequences

A new local server takes the next free port in the block, `2131` onward. The tests and `pnpm dev` share the
emulator ports, so tests can't run while `pnpm dev` is up.

## Sources

- `firebase.json`
- `vite.config.ts`
- `playwright.config.ts`
- `docs/specs/2026-11-05-local-dev-ports.md`
