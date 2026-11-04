---
type: Runbook
title: CI
description: Four parallel CI jobs before every deploy — checks, functions, e2e and a gitleaks scan — of which e2e is skipped on pull requests; plus CodeQL and Dependabot.
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
- `.github/dependabot.yml`: weekly, grouped update PRs for the npm-registry packages (`package-ecosystem: npm`, which also reads pnpm
  lockfiles) and for the actions.

## Gates

`ci.yml` runs four jobs in parallel before every deploy, and three of them (not `e2e`) on every pull request; each
loads `.env.ci` into its environment first. The jobs that install
dependencies set up pnpm with `pnpm/action-setup`, which reads the version from `packageManager` in `package.json`,
and install with `pnpm install --frozen-lockfile`.

- `checks`: lint, typecheck, format check, the unit tests under `src`, the rules tests, the production build,
  and `pnpm audit --prod --audit-level moderate` (only shipped dependencies fail it). pnpm ignores npm's `overrides`
  key in `package.json`, so the dependency overrides that keep that audit clean live under `overrides:` in
  `pnpm-workspace.yaml` and `functions/pnpm-workspace.yaml`.
- `functions`: the functions' build, lint and tests.
- `e2e`: Playwright in Chromium and WebKit (visual tests skip on CI). It is skipped on pull requests and runs only
  when `deploy.yml` calls `ci.yml`, so `deploy`'s `needs: ci` still waits for it
  ([decisions/e2e-before-deploy-only](../decisions/e2e-before-deploy-only.md)). It runs on `ubuntu-24.04`, not
  `ubuntu-latest`: on Ubuntu 26.04 Playwright's WebKit can't start (it needs `libicudata.so.74`). The browser
  cache is keyed by the runner image (`ImageOS`), so browsers built for one Ubuntu release are never restored
  on another.
- `secrets`: a gitleaks scan, configured in `.gitleaks.toml`.

Workflows run with a read-only token, every action is pinned to a commit SHA, and checkouts don't keep the
token (`docs/SECURITY.md`).

## History

- 2026-11-04: was the `e2e` job running on every pull request as well as before deploy; now it runs only before deploy,
  because the developer asked for it. See [decisions/e2e-before-deploy-only](../decisions/e2e-before-deploy-only.md).
- 2026-11-04: was CI installing with npm (`npm ci`, `npm audit --omit=dev`) and the overrides in `package.json`; now
  pnpm installs and audits, and the overrides sit in the `pnpm-workspace.yaml` files, because the project moved to
  pnpm and pnpm doesn't read npm's `overrides`.

## Sources

- `.github/workflows/ci.yml`
- `.github/workflows/codeql.yml`
- `.github/workflows/deploy.yml`
- `.github/codeql/codeql-config.yml`
- `.github/dependabot.yml`
- `pnpm-workspace.yaml`
- `functions/pnpm-workspace.yaml`
- `.gitleaks.toml`
- `docs/SECURITY.md`
