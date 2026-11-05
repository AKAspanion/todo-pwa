---
type: Runbook
title: Run locally
description: Node from .nvmrc, Java for the emulators, then one `pnpm dev` for the emulators, the Emulator UI and the app against the demo project.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
verified: human:panditankit1995@gmail.com
---

# Run locally

## Prerequisites

- Node at the version in `.nvmrc` (the functions run on Node 22 in production, but their tests and build run
  on the local Node).
- Java 21 or later, for the Firebase emulators.
- The Firebase CLI comes with the dev dependencies (`pnpm exec firebase`).

## Steps

1. Install: `pnpm install`, `pnpm --dir functions install`, and once `pnpm exec playwright install chromium webkit`.
2. `cp .env.example .env.local`; only `pnpm dev:app` reads it, so the Firebase values can stay empty for `pnpm dev`.
3. Start everything: `pnpm dev`. It runs the Auth and Firestore emulators, the Emulator UI and the app (Vite in
   mode `emulators`, which forces the demo values from `.env.ci` over `.env.local`), and one Ctrl+C stops them all.
   `.emulator-data/` keeps the emulator data between runs; delete it to reset
   ([decisions/dev-starts-emulators](../decisions/dev-starts-emulators.md)). The ports are in `firebase.json` and
   `vite.config.ts` ([decisions/local-port-block](../decisions/local-port-block.md)).
4. `pnpm dev:app` runs Vite alone with `.env.local`, for a real project or emulators started separately. The
   app's other scripts are in `package.json` and explained in `README.md` ("Scripts"). `test`, `test:rules` and
   `e2e` start and stop their own emulators on the same ports, so they can't run while `pnpm dev` is up.

## History

- 2026-11-05: was two terminals (`firebase emulators:start`, then `pnpm run dev`) with empty emulator data each run; now one `pnpm dev` with data kept in `.emulator-data/`, because the developer asked for one command. See [decisions/dev-starts-emulators](../decisions/dev-starts-emulators.md).
- 2026-11-04: was npm commands (`npm install`, `npx`); now pnpm, because the project moved to pnpm (`packageManager` in `package.json`).

## Sources

- `.nvmrc`
- `.env.example`
- `firebase.json`
- `package.json`
- `README.md`
- `vite.config.ts`
- `.gitignore`
