---
type: Runbook
title: Environment variables
description: Where each setting is declared and read — the VITE_FIREBASE_* web config, the emulator switch, the functions' APP_URL, and the test-only variables.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
verified: human:panditankit1995@gmail.com
---

# Environment variables

## Variables

- **Web app:** every key is listed, with where its value comes from, in `.env.example`; copy it to `.env.local`
  (git-ignored). `README.md` ("Environment") explains each. All start with `VITE_`, so Vite bakes them into the
  bundle: none may hold a secret.
- **Tests and CI:** `.env.ci` holds the demo values (project `demo-todo`) that unit tests, e2e and CI always use,
  whatever `.env.local` holds. The scan withheld it as a secret-shaped file
  ([findings/committed-secret-candidates](../findings/committed-secret-candidates.md)).
- **Functions:** `APP_URL`, a firebase-functions param, in `functions/.env` (from `functions/.env.example`);
  the deploy workflow writes that file from the `APP_URL` repository variable.
- **Deploy:** the repository variables and the one secret are listed in `README.md`, "Deploy & CI setup"
  ([operations/deploy](deploy.md)).
- **Test-only:** `E2E_PORT` and `E2E_PREVIEW_PORT` (Playwright's servers), `VISUAL_COMPARE_SCRIPT` (the visual
  tests' compare script), `CI`, and the emulator hosts `FIREBASE_AUTH_EMULATOR_HOST` / `FIRESTORE_EMULATOR_HOST`,
  which `firebase emulators:exec` sets.

## Where each is read

- `VITE_FIREBASE_*` and `VITE_USE_EMULATORS`: `src/lib/firebase.ts`; `VITE_FIREBASE_VAPID_KEY`:
  `src/pwa/useMessaging.ts`; the service worker's copy of the config: `src/sw.ts`.
- `APP_URL`: `functions/src/reminders.ts`. `GOOGLE_CLOUD_PROJECT`: `functions/scripts/migrate-legacy.ts`.
- `E2E_PORT` and `CI`: `playwright.config.ts`; `E2E_PREVIEW_PORT`: `e2e/pwa.spec.ts`; `VISUAL_COMPARE_SCRIPT`:
  `e2e/support/visual.ts`; the emulator hosts: `vite.config.ts` and `e2e/support/emulator.ts`.

## Sources

- `.env.example`
- `.env.ci`
- `functions/.env.example`
- `src/lib/firebase.ts`
- `src/pwa/useMessaging.ts`
- `src/sw.ts`
- `functions/src/reminders.ts`
- `functions/scripts/migrate-legacy.ts`
- `playwright.config.ts`
- `e2e/pwa.spec.ts`
- `e2e/support/visual.ts`
- `e2e/support/emulator.ts`
- `vite.config.ts`
- `README.md`
