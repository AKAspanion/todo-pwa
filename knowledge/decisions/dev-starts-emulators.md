---
type: Decision
title: pnpm dev starts the emulators with the app
description: One command runs the Auth and Firestore emulators, the Emulator UI and the Vite app, and keeps the emulator data between runs in a gitignored folder.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-05T04:14:14Z
---

# pnpm dev starts the emulators with the app

## Context

Local development needed two terminals, one for the emulators and one for Vite. The emulators started empty
every time, so the developer signed up again on every run, and their data couldn't be browsed. The developer
asked for one command, data kept between runs, and the Emulator UI.

## Decision

- `dev` (in `package.json`) wraps Vite in `firebase emulators:exec` for project `demo-todo`, with the Auth and
  Firestore emulators and `--ui`. One Ctrl+C stops all of them.
- The emulators import from `.emulator-data/` and export to it on exit. The folder is gitignored, and a missing
  one starts empty. Deleting it resets the local data. The flags use the `=` form, because
  `--export-on-exit [dir]` would otherwise take the script as its folder.
- The Functions emulator stays out of `dev`: it needs `functions/lib` built, its schedule never fires in the
  emulator, and the budget trigger needs Pub/Sub. `firebase emulators:start` still runs every configured emulator.
- `dev` runs Vite in mode `emulators`, in which `vite.config.ts` applies the demo values from `.env.ci`, so
  `.env.local` can never point it at a real project.
- `dev:app` runs Vite alone with `.env.local`, for a real project or emulators started separately.

## Consequences

`ga.mjs run dev`, which runs the `dev` script, gives a working app. The test scripts still start their own
empty emulators, with no UI.

## History

- 2026-11-05: was Vite reading `.env.local` under the emulators; now mode `emulators` forces `.env.ci`, because
  a `.env.local` without `VITE_USE_EMULATORS=true` left the app off the emulators. See
  [the spec](../../docs/specs/2026-11-05-local-dev-ports.md).

## Sources

- `vite.config.ts`
- `.env.ci`
- `package.json`
- `firebase.json`
- `.gitignore`
- `docs/specs/2026-11-05-local-dev-ports.md`
