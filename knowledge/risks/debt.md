---
type: Technical Debt
status: draft
title: Technical debt and open owner tasks
description: What the code and docs leave open — live-project tasks for the owner, unpatched dev-only advisories, a stale fix-report warning, and small gaps in the code.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
---

# Technical debt and open owner tasks

## Items

- **Live-project tasks for the owner** (`docs/SECURITY.md`, "Left for the owner"): restrict the browser API key
  by referrer and API; consider App Check; give the deploy service account only the roles it needs; rotate its
  key; and delete the old public `testFunction` and `testSchedule`, which stay live until someone deletes them.
  Whether each is done isn't recorded in the repository.
- **Dependency advisories left:** a `minimatch` advisory in `firebase-tools` and `superstatic`, and `deepmerge`
  under `workbox-build`, all dev-only, waiting on upstream releases. The `overrides` in `package.json` and
  `functions/package.json` should be dropped when they ship (`docs/SECURITY.md`, "Dependency audit").
- **`docs/FIXES_REPORT.md` opens with "nothing has been run yet"**: every item was implemented with tests but
  unverified at the time. Later commits add CI, approved visual baselines and fixes, so the warning may be
  stale: [questions/fixes-report-verification](../questions/fixes-report-verification.md).
- **The edit form doesn't check the title and description limits** that the add screen checks, so an over-long
  edit fails at the rules instead of in the form ([data/task](../data/task.md)).
- **Two store styles** ([questions/store-style](../questions/store-style.md)).
- **The iOS wrapper** has a placeholder `gcmMessageIDKey` and isn't mentioned in the README
  ([questions/ios-wrapper-status](../questions/ios-wrapper-status.md)).

## Sources

- `docs/SECURITY.md`
- `docs/FIXES_REPORT.md`
- `package.json`
- `functions/package.json`
- `src/components/tasks/TaskEditForm.vue`
- `src/views/TaskAddView.vue`
- `packages/ios/src/Task Manager/Settings.swift`
