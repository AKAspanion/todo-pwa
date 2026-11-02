---
type: Decision
status: draft
title: Old tasks are taken to be in Asia/Kolkata
description: Tasks the old app saved, which carry no time zone, are read and migrated as India time, the zone the old app and its reminder assumed.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
---

# Old tasks are taken to be in Asia/Kolkata

## Context

The old app stored a task's date and time with no time zone, and its reminder function hard-coded India time.
The new reminder needs an instant, so each task needs a zone.

## Decision

Existing tasks are taken to be in `Asia/Kolkata` (spec §11.3): `LEGACY_TIME_ZONE` in
`src/services/legacy.ts` when reading, and `--tz Asia/Kolkata` when running the migration.

## Consequences

A user elsewhere whose old tasks were entered in another zone gets their reminders at the India-time instant
until they edit the task, which takes the device's zone ([domain/local-dates](../domain/local-dates.md)).

## Sources

- `docs/specs/2026-11-02-modernize-and-fix.md`
- `src/services/legacy.ts`
- `functions/scripts/migrate-legacy.ts`
