---
type: Decision
title: E2E runs only before deploy, not on pull requests
description: The Playwright e2e CI job runs when the Deploy workflow calls CI (a push to master, or a manual run), and is skipped on pull requests.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-04T17:47:55Z
---

# E2E runs only before deploy, not on pull requests

## Context

`.github/workflows/ci.yml` runs on every pull request, and the Deploy workflow (`.github/workflows/deploy.yml`) calls it
before every deploy. Until this decision, its `e2e` job (Playwright in Chromium and WebKit, against the emulators) ran
in both cases. On 2026-11-04 the developer asked for e2e to run only before deploy, not on pull requests. They gave no
reason, and none is recorded here.

## Decision

The `e2e` job in `ci.yml` is skipped when the run's event is `pull_request`. It runs when `deploy.yml` calls `ci.yml`,
on a push to `master` or a manual run. A called workflow sees its caller's event, so the job keeps the same name and
place, and `deploy`'s `needs: ci` still waits for it. The other CI jobs (`checks`, `functions`, `secrets`) still run on
every pull request.

## Consequences

- A pull request can merge with an e2e failure. That failure stops the deploy on `master` instead, so a failing
  e2e is fixed on `master` before anything goes live.
- Run `npm run e2e` locally before merging a change that touches a screen or a flow.
- On a pull request, the e2e check shows as skipped. GitHub counts a skipped job as passing for a required check.

## Sources

- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
