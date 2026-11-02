---
type: Runbook
status: draft
title: Deploy
description: Every push to master runs CI, then deploys the Firestore rules and indexes and then hosting; the functions deploy only from a manual run; one-time setup steps before the first deploy.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
---

# Deploy

## Steps

- **On every push to `master`**, `.github/workflows/deploy.yml` runs the CI workflow first and, only if every job
  passes, builds with the live config, deploys the Firestore rules and indexes, then hosting. The rules go first
  so the app never goes live without the rules it was tested against. One deploy runs at a time and a running
  one is never cancelled.
- **The functions** deploy only from a manual run (Actions > Deploy > Run workflow) with `deploy_functions`
  ticked; the run deploys rules first and hosting last, as a push does.
- **By hand:** `README.md`, "Deployment": build with the live `.env.local`, then deploy rules and indexes,
  functions, and hosting, in that order.
- A "Check deploy configuration" step stops the deploy and names any missing repository variable or the
  missing `FIREBASE_SERVICE_ACCOUNT` secret, without printing values.
- The deploy key is written to a temporary file only inside the rules and functions steps; every `npm ci` runs
  earlier, without it and with `--ignore-scripts`, so no install script runs while the key is on the runner.

## Before the first deploy

The one-time steps are in `README.md`, "Deploy & CI setup", section 3: delete the old public `testFunction`
and `testSchedule` first, move the project to Blaze, authorise both domains for Google sign-in, deploy, then
run the data migration once ([domain/legacy-documents](../domain/legacy-documents.md)). The kill-switch's own
setup is in [integrations/cloud-billing](../integrations/cloud-billing.md). Which of these are done is not
recorded here: [risks/debt](../risks/debt.md).

## Sources

- `.github/workflows/deploy.yml`
- `.github/workflows/ci.yml`
- `README.md`
- `docs/SECURITY.md`
