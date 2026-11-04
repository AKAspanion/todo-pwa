# SDD ledger — plan: docs/plans/2026-11-04-restore-original-design-1.md
Plugin: ga 2.15.0 (e989938)
Policy: git.commit=task; run.checkpoints=none; run.unattended=false; run.on-conflict=stop; run.on-plan-defect=rule; run.max-fix-rounds=2; review.when=off; review.minors=defer; knowledge.update=after-finish
Run base: ec53acd5f89cd2bfb83404d289e284a39c81180d
Pre-flight: Task 1 and Task 2 share no file; Task 3 and Task 4 both change e2e/home.spec.ts and design/modernize/home/compare, and run in turn (Task 4 consumes Task 3)
Pre-flight: Task 2 changes e2e/fixtures/home.ts (adds seedLegacyHomeBoard); Task 3 consumes it, after Task 2 is in
Task 2: Ruling: Task 2 runs npm run e2e (its old-app captures) inside its worktree, not at the end — its deliverable is the captured references, and Task 1 starts no emulator or server, so nothing shares its ports — a port clash would fail the capture, which is re-run after Task 1 is in
Task 1: Ruling: Task 1 runs its test with npx vitest run src/plugins/vuetify.test.ts, without the emulators — the test needs no Firestore, and npm test would start emulators on the ports Task 2's e2e uses — none: the end's checks run the whole suite
Task 1: started 2026-11-04 14:23 (worktree from ec53acd)
Task 2: started 2026-11-04 14:23 (worktree from ec53acd)
Task 1: agent implementer a796c6772ffaed588
Task 2: agent implementer ac6e214fe6f12972e
Task 1: Ruling: The dark theme's accent stays #FF4081, Vuetify 2.6.10's dark preset — the spec's goal is the old app's look, and the plan's 'same secondary to warning values' wrongly implied the light accent — one colour value, changed in src/plugins/vuetify.ts and its test
Task 1: complete (commits ec53acd..b69bcae, not reviewed)
Progress: 1/4 tasks — Task 1 Global look — 1/4 tasks — Task 1 Global look — md2 blueprint, Vuetify 2's light and dark colours, the old app-wide CSS
Task 1: merged (ec53acd..b69bcae)
Task 2: Ruling: The run continues in its own worktree at scratchpad/run-wt, not the main checkout — the main checkout was switched to feat/play-store-twa with another piece of work uncommitted in it; Task 2's merge landed there by mistake and was undone with git reset --keep, leaving that work as it was — none to the run; the developer is told
Task 3: Ruling: Task 3 adds home-dark to design/modernize/home/compare.json and its states; Task 4 keeps it passing — Task 2 captured the -dark references but no compare.json lists them yet — a missing pair would leave the dark theme unchecked
Task 2: complete (commits ec53acd..d6ff3fd, not reviewed)
Task 2: merged (b69bcae..79e5130)
Progress: 2/4 tasks — Task 2 References from the old app — 2/4 tasks — Task 2 References from the old app — 68 captures of the old app at 390 and 1280, three states it can't show listed in old-app-states.md
Checkpoint: old-app references — after Task 2 — after Task 2
Task 3: Ruling: Checkpoint after Task 2 passed: the developer approved the old-app references — the developer's reply 'Approve, continue' — none
Task 3: started 2026-11-04 15:13
Task 3: agent implementer a182773edd168222b
Task 3: Ruling: The run's ledger and briefs moved to the run worktree's .ga/runs — the main checkout changed branch again and no longer holds the plan — none
Task 3: Ruling: The dark theme's primary is #2196F3, as the old app's dark captures show; the light primary and the manifest stay #1976D2 — spec §2's goal is the old app's look, and Vuetify 2's dark preset uses #2196F3; §4.1's 'THEME_COLOR stays' holds for the light theme and the manifest — one colour value in src/plugins/vuetify.ts
Task 3: Ruling: Copy that differs from the old app ('no tasks today', 'To do', the empty-state and load-error text) stays the new app's — spec §3: a string that differs keeps the new app's wording unless the developer says otherwise per screen; the developer decides at the home checkpoint — a few strings, changed in the locale files if the developer asks
Task 4: Ruling: Task 4 also fixes the typecheck errors in src/plugins/vuetify.test.ts (Task 1's test) and runs npm run typecheck once at the end — the end's checks run typecheck, which fails on that file today — one test file outside Task 4's list
Task 4: Ruling: mdi-face doesn't exist in @mdi/font 7: the profile tab uses mdi-face-man; ProfileView still names mdi-face and is fixed with the profile screen in plan 2 — Task 3 found the glyph missing; ProfileView is plan 2's file — a blank icon on the profile screen until plan 2
Task 3: complete (commits 79e5130..721a862, not reviewed)
Progress: 3/4 tasks — Task 3 Shell and home frame — 3/4 tasks — Task 3 Shell and home frame — the old top bar, date strip, bottom nav, menu and snackbar; home-empty and load-error within 3% of the old app
Task 4: started 2026-11-04 15:32
Task 4: agent implementer abde6f3e8f3fca726
Task 4: Ruling: The edit form keeps mdi-card-text on its description field, though the old edit card had no icon there — the plan's acceptance asked for it from spec §4.1's icon mapping; the developer decides at the home checkpoint — one icon, removed in TaskEditForm.vue if the developer asks
Task 4: Ruling: A failed save keeps the in-form alert, not the old snackbar — spec §3: no change to behaviour; the existing failed-save test checks the form — the failure message's look on one state
Task 4: complete (commits 721a862..e00c273, not reviewed)
Progress: 4/4 tasks — Task 4 Task cards — 4/4 tasks — Task 4 Task cards — the old cards, label chips and edit form; home states within 2-8% of the old app at 1280
Checkpoint: home screen approval — after Task 4 — after Task 4
Task 4: Ruling: Home uses the old app's wording and date formats — the developer chose it at the home checkpoint ('Approve, use old wording'); spec §3 lets the developer say otherwise per screen — copy and date-format changes in the home locale strings and their tests
Task 4: Ruling: The visual compare passes on capture, not on match: its 0.1 is a per-pixel tolerance, and visual-compare.mjs exits non-zero only on capture errors — Task 4's follow-up traced it; the repo passes the exit status through — screens are judged from the ratios and diff images, which plan 2's reports must give
Task 4: complete (commits 721a862..34097f1, not reviewed; follow-up round for the old wording)
Run: finished 2026-11-04 17:08 (built head 019f3e2, squashed from the commits cited above; they stay at tag restore-design-pre-squash)
