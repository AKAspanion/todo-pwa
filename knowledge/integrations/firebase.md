---
type: Integration
status: draft
title: Firebase (Auth, Firestore, Hosting, emulators)
description: The whole backend — Auth for sign-in, Firestore for data, Hosting for the site — with the Emulator Suite on the project's own ports for development and tests.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
---

# Firebase (Auth, Firestore, Hosting, emulators)

## What it is used for

- **Auth:** sign-in ([security/auth](../security/auth.md)).
- **Firestore:** all data ([data/model](../data/model.md)), guarded by `firestore.rules`, with the indexes in
  `firestore.indexes.json`.
- **Hosting:** serves `dist/`, rewrites every path to `/index.html`, and sets the headers in `firebase.json`.
- The live project is `spanion-todo` (`.firebaserc`); scheduled functions need the Blaze plan
  ([decisions/push-reminders-on-blaze](../decisions/push-reminders-on-blaze.md)).

## Configuration

- The web app's config is the `VITE_FIREBASE_*` variables ([operations/environment](../operations/environment.md)),
  read once in `src/lib/firebase.ts`.
- With `VITE_USE_EMULATORS=true`, the app connects to the Auth and Firestore emulators and uses the demo project
  `demo-todo`, never a real one. The emulator ports are set only in `firebase.json` (`emulators`); `vite.config.ts`
  reads them at build time, and `FIREBASE_AUTH_EMULATOR_HOST` / `FIRESTORE_EMULATOR_HOST` win when
  `firebase emulators:exec` sets them. Why the ports aren't Firebase's defaults:
  [decisions/non-default-emulator-ports](../decisions/non-default-emulator-ports.md).

## Failure modes

- A missing `VITE_FIREBASE_API_KEY` outside emulator mode logs `[firebase] config missing` and the app can't
  reach Firebase (`src/lib/firebase.ts`).
- A failed load keeps what is shown and offers Retry; a failed save keeps the form
  ([project/conventions](../project/conventions.md)).
- If billing is unlinked by the kill-switch, Firestore and Hosting fall to the no-cost limits
  ([integrations/cloud-billing](cloud-billing.md)).

## Sources

- `src/lib/firebase.ts`
- `firebase.json`
- `.firebaserc`
- `firestore.rules`
- `firestore.indexes.json`
- `vite.config.ts`
