---
type: Conventions
status: draft
title: Conventions
description: How code is written in todo-pwa — where each kind of file goes, how errors travel, where tests live, and which tools and policy keys enforce the rest.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
---

# Conventions

## Naming

- A screen is `src/views/<Name>View.vue`, lazily imported by its route in `src/router/index.ts` (e.g. `src/views/HomeView.vue`).
- A store is `src/stores/<name>.ts` exporting `use<Name>Store` (e.g. `src/stores/tasks.ts`); a service is `src/services/<collection or area>.ts` (e.g. `src/services/tasks.ts`).
- Error codes thrown by app code are `'<area>/<code>'`, like Firebase's: `label/invalid-name`, `device/invalid-token`, `auth/not-signed-in` (`src/services/labels.ts`).
- Comments cite the spec item they implement (`D7`, `P6`, `S2`, from `docs/specs/2026-11-02-modernize-and-fix.md`); services, `src/lib/` and `src/pwa/` modules open with a doc comment saying what the module is (`src/services/tasks.ts`). Stores and plugins don't.

## Folder layout

- Only `src/services/` touches Firestore and Auth; `src/lib/firebase.ts` creates the one app. Views and components go through a store (`src/views/HomeView.vue`).
- Shared components are grouped by area under `src/components/<area>/` (`tasks`, `fields`, `layout`, `calendar`).
- Every visible string lives in `src/i18n/locales/<lang>/<feature>.json`, with the same keys in `en` and `hi`; each file is the `<feature>` namespace (`src/plugins/i18n.ts`).
- Imports from `src/` use the `@/` alias (`vite.config.ts`). Components use `<script setup lang="ts">`.
- In `functions/`, rules with no Firebase in them go in their own module so they are cheap to test (`functions/src/dueTasks.ts`).
- Stores split two ways: four use the options style (`src/stores/tasks.ts`), `src/stores/session.ts` the setup style. Which new code follows: [questions/store-style](../questions/store-style.md).

## Error handling

- A log names an error by its code or class name only, never its message: `errorCode` in `src/stores/session.ts` (and its twin in `functions/src/reminders.ts`).
- A failed load keeps what is already shown and sets the store's `error` to `'load-failed'`; the screen offers Retry (`src/stores/tasks.ts`).
- A result that arrives after the user changed is dropped: stores compare `currentUid()` before and after the call (`src/stores/tasks.ts`).
- Saves never time out and are never retried: [decisions/saves-never-time-out](../decisions/saves-never-time-out.md).
- A store changes only after its save succeeds; the failure reaches the caller, whose form keeps the input (`src/stores/tasks.ts`).

## Tests

- Unit tests sit beside the file they test as `<file>.test.ts` (`src/services/tasks.test.ts`) and run against the emulators.
- Security-rules tests are in `tests/rules/` (`tests/rules/firestore.rules.test.ts`); Playwright specs are `e2e/<screen>.spec.ts`, with helpers in `e2e/support/`.
- Functions tests sit beside their module in `functions/src/` (`functions/src/reminders.test.ts`). More in [quality/testing](../quality/testing.md).

## Lint and format

- ESLint: `./eslint.config.js` for the app (it forbids `any` and `@ts-ignore`), `functions/eslint.config.js` for the functions.
- Prettier: `./.prettierrc.json`, with `./.prettierignore`. Types: vue-tsc over `./tsconfig.app.json`; functions use `functions/tsconfig.json`.

## Git

- Messages: conventional in the 50 most recent non-merge commits before ga was set up; the older history is free-form (50 of the last 100 overall). Policy key `git.message`; no ticket key (`git.ticket`).
- Base branch: every one of 41 merges went into `master`, the default branch (`git.base`). Branch names: too few to say (`git.branch`). 40 of 41 changes landed squashed (`git.squash`).

## Commands

- The root checks are policy keys: `checks.commands.typecheck`, `checks.commands.lint`, `checks.commands.lint-fix`, `checks.commands.format-check`, `checks.commands.test`, `checks.commands.e2e`. `test` and `e2e` start the emulators themselves and need Java 21+.
- The functions have their own: `npm --prefix functions run build`, `lint` and `test` (`functions/package.json`).

## Sources

- `./eslint.config.js`
- `./.prettierrc.json`
- `./.prettierignore`
- `./tsconfig.app.json`
- `functions/eslint.config.js`
- `functions/tsconfig.json`
- `functions/package.json`
- `package.json`
- `vite.config.ts`
- `src/router/index.ts`
- `src/views/HomeView.vue`
- `src/stores/tasks.ts`
- `src/stores/session.ts`
- `src/services/tasks.ts`
- `src/services/tasks.test.ts`
- `src/services/labels.ts`
- `src/plugins/i18n.ts`
- `src/lib/firebase.ts`
- `functions/src/dueTasks.ts`
- `functions/src/reminders.ts`
- `functions/src/reminders.test.ts`
- `tests/rules/firestore.rules.test.ts`
- `docs/specs/2026-11-02-modernize-and-fix.md`
