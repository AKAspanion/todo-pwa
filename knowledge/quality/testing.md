---
type: Test Strategy
status: draft
title: Testing
description: Vitest unit tests and Firestore rules tests against the emulators, functions tests, and Playwright e2e in Chromium and WebKit with local-only visual comparison.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
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
- **Visual:** each screen's spec has one visual test (Chromium) that captures its states at 390 and 1280 px into
  `design/modernize/<screen>/` and compares them with the references in `refs/`. It runs only where
  `VISUAL_COMPARE_SCRIPT`'s script exists and never on CI, because the references were captured on macOS and
  Linux renders fonts differently (`e2e/support/visual.ts`).

## How to run it

The policy's `checks.commands.test` and `checks.commands.e2e`, plus `npm run test:rules` and the functions'
`npm --prefix functions run test`. Running some files, and the visual tests only, is in `README.md` ("Scripts").

## Sources

- `vite.config.ts`
- `.env.ci`
- `package.json`
- `tests/rules/firestore.rules.test.ts`
- `functions/vitest.config.ts`
- `playwright.config.ts`
- `e2e/support/visual.ts`
- `e2e/support/emulator.ts`
- `e2e/auth.spec.ts`
- `README.md`
