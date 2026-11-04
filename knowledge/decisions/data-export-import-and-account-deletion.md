---
type: Decision
title: Data exports as JSON, CSV and .ics, imports from JSON as new, and account deletion is finished by a function
description: Profile exports tasks as JSON (complete), CSV and .ics; import accepts only the app's JSON and adds everything as new; deleting the account re-confirms the user, deletes the Auth user, and an auth-deletion trigger erases the data.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-03T07:01:21Z
---

# Data exports as JSON, CSV and .ics, imports from JSON as new, and account deletion is finished by a function

## Context

Users could neither take their tasks elsewhere nor delete their account; Play Store apps that let people create an
account must let them delete it ([apps/android-twa](../apps/android-twa.md)). Part 8 of
[decisions/usability-roadmap](usability-roadmap.md) adds both. Calendar export is a browser-made file
([decisions/ics-export-client-side](ics-export-client-side.md)), and no function answers HTTP
([apps/functions](../apps/functions.md)).

## Decision

The developer decided on 2026-11-03:

- **Delete account** (moved out of part 8 on 2026-11-04 to the Play Store work, with Google re-confirmation by
  redirect: [decisions/account-deletion-for-play](account-deletion-for-play.md)): the user re-confirms (password,
  or Google) and types `DELETE`; the app deletes the Firebase
  Auth user; a new function on Auth's user-deletion event, not HTTP, erases the user's tasks, labels,
  notifications, devices and old `fcm/{uid}` document with the Admin SDK. Deleting from the browser alone was
  turned down: a tab closed halfway would leave half the data, or an account without data.
- **Export:** JSON (every task and label, the format import reads), CSV (tasks, for spreadsheets) and .ics (dated
  todo tasks, repeating ones with an `RRULE`).
- **Import:** only the app's own JSON, previewed, and added as new tasks and labels; never merged or overwritten.

## Consequences

- The functions' export test (spec S1 of 2026-11-02) gains the new trigger on purpose; still no HTTP or callable
  export.
- Importing the same file twice adds everything twice; the preview says so.
- Export and import are specified in `docs/specs/2026-11-03-data-and-account.md`; deleting the account in
  `docs/specs/2026-11-04-play-store-twa.md`.

## History

- 2026-11-04: deleting the account was part 8, with Google re-confirmation by popup or redirect; now it is built
  with the Play Store app and re-confirms by redirect only, because Play requires deletion and popups fail in the
  TWA. See [Account deletion for Play](account-deletion-for-play.md).

## Sources

- `docs/specs/2026-11-03-data-and-account.md`
- `docs/specs/2026-11-04-play-store-twa.md`
- `functions/src/index.ts`
- `functions/src/reminders.test.ts`
- `src/views/ProfileView.vue`
- `src/services/auth.ts`
