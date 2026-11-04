---
type: Runbook
title: CI
description: Four parallel CI jobs on every pull request and before every deploy — checks, functions, e2e and a gitleaks scan — plus CodeQL and Dependabot.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
verified: human:panditankit1995@gmail.com
---

# CI

## Pipelines

- `.github/workflows/ci.yml`: on every pull request, and called first by the deploy workflow on every push to
  `master`.
- `.github/workflows/codeql.yml`: CodeQL over JavaScript/TypeScript and the workflows, on pull requests, pushes
  to `master` and weekly (config in `.github/codeql/codeql-config.yml`).
- `.github/workflows/deploy.yml`: [operations/deploy](../operations/deploy.md).
- `.github/dependabot.yml`: weekly, grouped update PRs for npm packages and for the actions.

## Gates

`ci.yml` runs four jobs in parallel; each loads `.env.ci` into its environment first.

- `checks`: lint, typecheck, format check, the unit tests under `src`, the rules tests, the production build,
  and `npm audit --omit=dev --audit-level=moderate` (only shipped dependencies fail it).
- `functions`: the functions' build, lint and tests.
- `e2e`: Playwright in Chromium and WebKit (visual tests skip on CI). It runs on `ubuntu-24.04`, not
  `ubuntu-latest`: on Ubuntu 26.04 Playwright's WebKit can't start (it needs `libicudata.so.74`). The browser
  cache is keyed by the runner image (`ImageOS`), so browsers built for one Ubuntu release are never restored
  on another.
- `secrets`: a gitleaks scan, configured in `.gitleaks.toml`.

Workflows run with a read-only token, every action is pinned to a commit SHA, and checkouts don't keep the
token (`docs/SECURITY.md`).

## Sources

- `.github/workflows/ci.yml`
- `.github/workflows/codeql.yml`
- `.github/workflows/deploy.yml`
- `.github/codeql/codeql-config.yml`
- `.github/dependabot.yml`
- `.gitleaks.toml`
- `docs/SECURITY.md`
