---
type: Technical Debt
title: Technical debt and open owner tasks
description: What the code and docs leave open — live-project tasks for the owner, unpatched dev-only advisories, a stale fix-report warning, and small gaps in the code.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
verified: human:panditankit1995@gmail.com
---

# Technical debt and open owner tasks

## Items

- **Live-project tasks for the owner** (`docs/SECURITY.md`, "Left for the owner"): restrict the browser API key
  by referrer and API; consider App Check; give the deploy service account only the roles it needs; rotate its
  key. Whether these are done isn't recorded. The first-deploy steps, deleting the old `testFunction` and
  `testSchedule` among them, are done ([operations/deploy](../operations/deploy.md)).
- **Dependency advisories left:** a `minimatch` advisory in `firebase-tools` and `superstatic`, and `deepmerge`
  under `workbox-build`, all dev-only, waiting on upstream releases. The `overrides` in `package.json` and
  `functions/package.json` should be dropped when they ship (`docs/SECURITY.md`, "Dependency audit").
- **`docs/FIXES_REPORT.md` still opens with "nothing has been run yet"**, though the gates now pass
  ([decisions/modernisation-verified](../decisions/modernisation-verified.md)): the warning is out of date.
- **The edit form doesn't check the title and description limits** that the add screen checks, so an over-long
  edit fails at the rules instead of in the form ([data/task](../data/task.md)).
- **Two store styles:** new stores use the setup style; the four options stores stay until changed for another
  reason ([decisions/setup-style-stores](../decisions/setup-style-stores.md)).
- **The iOS wrapper** has a placeholder `gcmMessageIDKey`; it isn't shipped or maintained
  ([decisions/ios-wrapper-unmaintained](../decisions/ios-wrapper-unmaintained.md)).

## Sources

- `docs/SECURITY.md`
- `docs/FIXES_REPORT.md`
- `package.json`
- `functions/package.json`
- `src/components/tasks/TaskEditForm.vue`
- `src/views/TaskAddView.vue`
- `packages/ios/src/Task Manager/Settings.swift`
