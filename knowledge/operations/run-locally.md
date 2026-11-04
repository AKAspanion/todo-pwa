---
type: Runbook
title: Run locally
description: Node from .nvmrc, Java for the emulators, then the emulators and the Vite dev server against the demo project.
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
2. `cp .env.example .env.local`, keeping `VITE_USE_EMULATORS=true`; the Firebase values can stay empty.
3. Start the emulators for the demo project: `pnpm exec firebase emulators:start --project demo-todo`. Their ports
   are in `firebase.json` (`emulators`); they start empty, so sign up in the app first.
4. Start the app: `pnpm run dev`. The app's other scripts are in `package.json` and explained in `README.md`
   ("Scripts"); `test`, `test:rules` and `e2e` start and stop the emulators themselves.

## History

- 2026-11-04: was npm commands (`npm install`, `npx`); now pnpm, because the project moved to pnpm (`packageManager` in `package.json`).

## Sources

- `.nvmrc`
- `.env.example`
- `firebase.json`
- `package.json`
- `README.md`
