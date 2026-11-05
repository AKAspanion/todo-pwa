# Local dev ports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:implement-with-subagents by default, or ga:implement. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** complete

**Goal:** Put every local port in the 2120–2130 block, and make `pnpm dev` start the Auth and Firestore emulators, the Emulator UI and Vite together, with data kept between runs.

**Architecture:** Configuration only. The emulator ports stay in `firebase.json`, which the app, the tests and the scripts already read. The Vite ports go in `vite.config.ts` and `playwright.config.ts`. The `dev` script wraps Vite in `firebase emulators:exec`.

**Tech Stack:** Vue 3 + Vite 8, Firebase CLI (`firebase-tools`, Emulator Suite), Playwright, pnpm; CI is GitHub Actions (`.github/workflows/ci.yml`), which reads the ports from `firebase.json` and needs no change.

**Spec:** [docs/specs/2026-11-05-local-dev-ports.md](../specs/2026-11-05-local-dev-ports.md)

## Global Constraints

- Ports, one each, in this order: `2120` Vite dev, `2121` hub, `2122` Auth, `2123` Firestore, `2124` Firestore WebSocket, `2125` Functions, `2126` logging, `2127` Emulator UI, `2128` Hosting, `2129` `vite preview`, `2130` e2e Vite.
- The emulator ports are set only in `firebase.json` (`decisions/non-default-emulator-ports`).
- Vite's dev and preview servers use `strictPort`.

## Checkpoints

None (`run.checkpoints: none`).

---

### Task 1: Port block and one-command dev

**Files:**
- Modify: `firebase.json` (`emulators`)
- Modify: `vite.config.ts` (add `server`, `preview`)
- Modify: `playwright.config.ts` (default `E2E_PORT`)
- Modify: `package.json` (`scripts.dev`, add `scripts.dev:app`)
- Modify: `.gitignore`, `.prettierignore` (add `.emulator-data/`)
- Modify: `e2e/support/emulator.ts` (header comment's port numbers)
- Modify: `README.md` (run section, port table, scripts table)
- Test: `e2e/shell.spec.ts` (the `emulator ports` describe)

**Interfaces:**
- Consumes: existing `emulatorHosts()` in `vite.config.ts`, existing `AUTH_EMULATOR_HOST` / `FIRESTORE_EMULATOR_HOST` in `e2e/support/emulator.ts`.
- Produces: these `package.json` scripts.

```json
{
  "dev": "firebase emulators:exec --project demo-todo --only auth,firestore --ui --import=./.emulator-data --export-on-exit=./.emulator-data vite",
  "dev:app": "vite"
}
```

**Spec:**
- Port block: "Vite's dev and preview servers use `strictPort`: if their port is taken they fail, instead of moving to the next port, which is the hub's or Auth's."
- `pnpm dev`: "The `=` forms are needed: `--export-on-exit [dir]` would otherwise take the script as its folder."
- `pnpm dev`: "`.emulator-data/` is gitignored and ignored by Prettier. Deleting it resets the local data."
- `pnpm dev`: "`test`, `test:rules` and `e2e` are unchanged: they start their own emulators, with no import and no UI, on the same ports."
- Testing: "watched failing, then passing once `firebase.json` changes."

**Tags:** `security` (it changes the Auth emulator's port, though no sign-in, session or permission code)

**Knowledge:** `operations/run-locally`: one `pnpm dev` starts the emulators, the UI and the app, and `.emulator-data/` keeps the data. `integrations/firebase`: the Emulator UI is on, and `pnpm dev` keeps the data between runs. Written by the after-finish job.

**Acceptance:**
- Given `firebase.json`, when the e2e `emulator ports` test reads the hosts, then Auth ends in `:2122` and Firestore in `:2123`.
- Given `firebase.json`, then `emulators` sets hub `2121`, auth `2122`, firestore `2123` with `websocketPort` `2124`, functions `2125`, logging `2126`, ui `2127` with `enabled: true`, hosting `2128`.
- Given `vite.config.ts`, then `server.port` is `2120` and `preview.port` is `2129`, both with `strictPort: true`; and `playwright.config.ts` defaults `E2E_PORT` to `2130`.
- Given `.emulator-data/` exists, then `git status` doesn't list it and `pnpm run format:check` doesn't read it.

- [x] **Step 1: Write the failing test**: in `e2e/shell.spec.ts`, the `emulator ports` test expects `/:2122$/` and `/:2123$/`

- [x] **Step 2: Run it to verify it fails**

Run: `npm run e2e -- e2e/shell.spec.ts -g "emulator ports" --project chromium`
Expected: FAIL, received `127.0.0.1:9199`

- [x] **Step 3: Write the configuration**: `firebase.json`, `vite.config.ts`, `playwright.config.ts`, `package.json`, `.gitignore`, `.prettierignore`, the comment in `e2e/support/emulator.ts` and `README.md`, to the Global Constraints and the Interfaces

- [x] **Step 4: Run it to verify it passes**

Run: `npm run e2e -- e2e/shell.spec.ts -g "emulator ports" --project chromium`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add firebase.json vite.config.ts playwright.config.ts package.json .gitignore .prettierignore e2e/support/emulator.ts e2e/shell.spec.ts README.md
git commit -m "feat(dev): local ports on the 2120 block and one-command pnpm dev"
```
