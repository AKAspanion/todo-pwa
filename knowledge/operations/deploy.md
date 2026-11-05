---
type: Runbook
title: Deploy
description: Every push to master runs CI, then deploys hosting; the Firestore rules and indexes deploy by hand; the functions deploy only from a manual run; one-time setup steps before the first deploy.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
verified: human:panditankit1995@gmail.com
---

# Deploy

## Steps

- **On every push to `master`**, `.github/workflows/deploy.yml` runs the CI workflow first and, only if every job
  passes, builds with the live config and deploys hosting. One deploy runs at a time and a running one is never
  cancelled.
- **The Firestore rules and indexes** deploy by hand (`README.md`, "Deploy & CI setup"), before merging a change
  that needs them, so the app never goes live without the rules it was tested against. The developer took them
  out of the Deploy workflow on 2026-11-04; the deploy service account no longer needs the rules or index roles.
- **The functions** deploy only from a manual run (Actions > Deploy > Run workflow) with `deploy_functions`
  ticked; the run deploys the functions first and hosting last.
- **By hand:** `README.md`, "Deployment": build with the live `.env.local`, then deploy rules and indexes,
  functions, and hosting, in that order.
- A "Check deploy configuration" step stops the deploy and names any missing repository variable or the
  missing `FIREBASE_SERVICE_ACCOUNT` secret, without printing values.
- The deploy key is written to a temporary file only inside the functions step; every `pnpm install` runs
  earlier, without it and with `--frozen-lockfile --ignore-scripts`, so no install script runs while the key is on the runner.

- **`deleteUserData`'s first deploy** is by hand, from the Play Store branch, before it merges, because hosting ships
  Delete account on the merge but functions deploy only from a manual run:
  [decisions/delete-function-deployed-by-hand-first](../decisions/delete-function-deployed-by-hand-first.md),
  [operations/play-store-release](play-store-release.md).

## Before the first deploy

The one-time steps are in `README.md`, "Deploy & CI setup", section 3: delete the old public `testFunction`
and `testSchedule` first, move the project to Blaze, authorise both domains for Google sign-in, deploy, then
run the data migration once ([domain/legacy-documents](../domain/legacy-documents.md)). The developer said on
2026-11-03 that all of these are done on `spanion-todo`. The kill-switch's own setup is in
[integrations/cloud-billing](../integrations/cloud-billing.md).

## History

- 2026-11-05: the functions deployed only from a manual run on master; now `deleteUserData` is deployed by hand once, before the Play Store branch merges, because merging would otherwise ship Delete account before the function exists. See [decisions/delete-function-deployed-by-hand-first](../decisions/delete-function-deployed-by-hand-first.md).

- 2026-11-04: was every install an `npm ci`; now `pnpm install --frozen-lockfile --ignore-scripts`, because the
  project moved to pnpm; the rule that installs run before the key is unchanged.

- 2026-11-04: was the Deploy workflow deploying the Firestore rules and indexes before hosting on every push; now
  they deploy by hand and the workflow deploys hosting only, because the developer chose it after the deploy
  service account's missing index permission blocked the first deploy.

- 2026-11-03: whether the first-deploy steps were done wasn't recorded; now done, per the developer.

## Sources

- `.github/workflows/deploy.yml`
- `.github/workflows/ci.yml`
- `README.md`
- `docs/SECURITY.md`
