---
type: Test Strategy
title: Testing
description: Vitest unit tests and Firestore rules tests against the emulators, functions tests, and Playwright e2e in Chromium and WebKit with local-only visual comparison.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
verified: human:panditankit1995@gmail.com
---

# Testing

## What is tested

- **Unit** (Vitest, jsdom): services, stores, libraries, the guard, plugins and some components, as
  `src/**/*.test.ts` beside their files (`test` in `vite.config.ts`). They run inside
  `firebase emulators:exec` with Auth and Firestore, on the demo values in `.env.ci`, never a real project.
- **Security rules:** `tests/rules/firestore.rules.test.ts`, with `@firebase/rules-unit-testing`, against the
  Firestore emulator.
- **Functions:** `functions/src/*.test.ts` and `functions/scripts/*.test.ts` (`functions/vitest.config.ts`),
  against the Firestore emulator, with FCM and Cloud Billing faked.
- **End to end:** Playwright specs in `e2e/`, one per screen plus `smoke`, `shell` and `pwa`, in Chromium and
  WebKit (`playwright.config.ts`). They share one set of emulators and reset them, so they run one at a time,
  against their own Vite server. `e2e/auth.spec.ts` also checks accessibility with `@axe-core/playwright`.
  Resetting deletes the accounts and documents but not the Auth emulator's recorded reset codes, so a spec that
  reads codes compares them with a snapshot taken before its action (`newResetCodes` in
  `e2e/support/emulator.ts`); counting all of them failed once the same spec ran in a second browser.
  `createUser` makes accounts verified unless given `verified: false`, so the verify-email banner shows only in
  `e2e/verify-email.spec.ts`.
- **Visual:** each screen's spec has one visual test (Chromium) that captures its states at 390 and 1280 px into
  `design/modernize/<screen>/` and compares them with the references in `refs/`. The references are captures
  of the old app (`b8af93e^`), taken by `e2e/old-app-refs.spec.ts` against a worktree that
  `e2e/support/old-app.mjs` builds; the states the old app can't show are listed in
  `design/modernize/old-app-states.md`. The compare script exits non-zero only when a capture fails, and its
  `0.1` is a per-pixel tolerance, so a pass doesn't mean the screens match: judge a screen from the diff ratios
  and the diff images. It runs only where
  `VISUAL_COMPARE_SCRIPT`'s script exists and never on CI, because the references were captured on macOS and
  Linux renders fonts differently (`e2e/support/visual.ts`).

## How to run it

The policy's `checks.commands.test` and `checks.commands.e2e`, plus `pnpm run test:rules` and the functions'
`pnpm --dir functions run test`. Running some files, and the visual tests only, is in `README.md` ("Scripts").

## History

- 2026-11-04: was references captured from the rewrite; now captures of the old app, because the app is restored to the old look. See [decisions/restore-original-design](../decisions/restore-original-design.md).

## Sources

- `vite.config.ts`
- `.env.ci`
- `package.json`
- `tests/rules/firestore.rules.test.ts`
- `functions/vitest.config.ts`
- `playwright.config.ts`
- `e2e/support/visual.ts`
- `e2e/old-app-refs.spec.ts`
- `e2e/support/old-app.mjs`
- `design/modernize/old-app-states.md`
- `e2e/support/emulator.ts`
- `e2e/verify-email.spec.ts`
- `e2e/auth.spec.ts`
- `README.md`
