# Local dev environment on its own port block

## Goal

A developer runs the whole app locally with one command, beside other projects, without a port clash and
without a real Firebase project. Every port this project opens on the machine is in one block, `2120`–`2130`,
so another project's servers and the defaults (Vite's 5173, Firebase's 4400, 9099, 8080, 5000…) never collide
with it.

## What the developer asked for

- Every local port starts at 2120 and they are assigned one by one: 2120 the dev server, 2121 the emulator hub,
  2122 Auth, and so on.
- `pnpm dev` starts the emulators and the app together.
- Emulator data (accounts, tasks) is kept between runs.
- The Emulator UI is on.

## Port block

| Port | What | Set in |
|---|---|---|
| `2120` | Vite dev server (`pnpm dev`, `pnpm dev:app`) | `vite.config.ts` (`server`) |
| `2121` | Emulator hub | `firebase.json` (`emulators.hub`) |
| `2122` | Auth emulator | `firebase.json` (`emulators.auth`) |
| `2123` | Firestore emulator | `firebase.json` (`emulators.firestore`) |
| `2124` | Firestore WebSocket (the UI's live view) | `firebase.json` (`emulators.firestore.websocketPort`) |
| `2125` | Functions emulator | `firebase.json` (`emulators.functions`) |
| `2126` | Emulator logging | `firebase.json` (`emulators.logging`) |
| `2127` | Emulator UI | `firebase.json` (`emulators.ui`) |
| `2128` | Hosting emulator (serves `dist/` under `emulators:start`) | `firebase.json` (`emulators.hosting`) |
| `2129` | `vite preview` | `vite.config.ts` (`preview`) |
| `2130` | Vite server for the e2e run (`E2E_PORT` still overrides it) | `playwright.config.ts` |

Vite's dev and preview servers use `strictPort`: if their port is taken they fail, instead of moving to the
next port, which is the hub's or Auth's. The emulator ports stay in `firebase.json` only, as
`decisions/non-default-emulator-ports` already requires; the app, the tests and the scripts keep reading them
from there.

## `pnpm dev`

- `dev` runs `firebase emulators:exec --project demo-todo --only auth,firestore --ui
  --import=./.emulator-data --export-on-exit=./.emulator-data "vite --mode emulators"`. One Ctrl+C stops Vite
  and the emulators, and the emulators export their data first. `emulators:exec` sets
  `FIREBASE_AUTH_EMULATOR_HOST` and `FIRESTORE_EMULATOR_HOST`, which `vite.config.ts` already prefers.
- In mode `emulators`, `vite.config.ts` puts the demo values from `.env.ci` into the environment before Vite
  reads the `.env` files, so they win over `.env.local`, as Playwright's server already does. Whatever
  `.env.local` holds, `pnpm dev` talks to the emulators as project `demo-todo`, never to a real project.
- The `=` forms are needed: `--export-on-exit [dir]` would otherwise take the script as its folder.
- A missing `.emulator-data/` is fine: the first run starts empty and creates it on exit.
- `.emulator-data/` is gitignored and ignored by Prettier. Deleting it resets the local data.
- The Functions emulator stays out of `dev`: it needs `functions/lib` built, its schedule never fires in the
  emulator, and the budget trigger needs Pub/Sub. `firebase emulators:start --project demo-todo` still starts
  every configured emulator (Functions and Hosting included) on its block port.
- `dev:app` runs Vite alone, for a real project (`VITE_USE_EMULATORS=false`) or emulators started separately.
- `test`, `test:rules` and `e2e` are unchanged: they start their own emulators, with no import and no UI, on the
  same ports. So they can't run while `pnpm dev` is up; stop it first (this was already true).

## Files

- `firebase.json`: the emulator ports above, `ui.enabled: true`.
- `vite.config.ts`: `server` and `preview` ports with `strictPort`; mode `emulators` applies `.env.ci`.
- `playwright.config.ts`: default `E2E_PORT` 2130.
- `package.json`: `dev`, `dev:app`.
- `.gitignore`, `.prettierignore`: `.emulator-data/`.
- `e2e/shell.spec.ts`: the "emulator ports" test expects 2122 and 2123. `e2e/support/emulator.ts`: its comment.
- `README.md`: the run section, the port table, the scripts table.
- `.claude/launch.json` (local, gitignored): `pnpm run dev` on 2120, `pnpm run preview` on 2129.

## Testing

The e2e "emulator ports" test is changed first to expect 2122 and 2123, watched failing, then passing once
`firebase.json` changes. Then `pnpm dev` is run for real: the app answers on 2120 and the UI on 2127, the app
in a browser calls the Auth emulator on 2122 with no `[firebase] config missing` error, an account signed up
survives a restart, and Ctrl+C leaves no process on the block.

## Out of scope

Running tests while `pnpm dev` is up (they would need a second port block), seed data, and the iOS and Android
wrappers, which load the live site.
