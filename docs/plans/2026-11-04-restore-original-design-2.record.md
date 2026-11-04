# SDD ledger — plan: docs/plans/2026-11-04-restore-original-design-2.md
Plugin: ga 2.15.0 (e989938)
Policy: git.commit=task; run.checkpoints=none; run.unattended=false; run.on-conflict=stop; run.on-plan-defect=rule; run.max-fix-rounds=2; review.when=off; review.minors=defer; knowledge.update=after-finish
Run base: 56b7b1949e5a9018f314eefe75641933ca9b4465
Pre-flight: The five tasks share no file; each changes its own view, locale files, e2e spec and compare.json. Task 1 alone changes DateField and TimeField, which the home edit form also uses
Task 1: Ruling: The five tasks run one at a time, in place in the run worktree, not side by side — each task's acceptance is its visual comparison, which needs npm run e2e: the emulators (9199, 8180) and the test app server use fixed ports, so two worktrees running it at once collide — about an hour longer than side by side; nothing to undo
Task 1: Ruling: Every task reports each visual state's diff ratio at 390 and 1280; the compare script's pass only means the captures succeeded — plan 1's Task 4 found visual-compare.mjs exits non-zero only on capture errors — none
Task 1: started 2026-11-04 16:02
Task 1: agent implementer ae27f69cf5b358ed4
Task 1: Ruling: Task 1 also builds the old app's per-route top bar (back arrow and title chip on every route but home) in src/components/layout/AppMenu.vue and src/i18n/locales/{en,hi}/common.json; Task 3, Task 4 and Task 5 build on it and don't change it — the old app's non-home routes all show that bar, and it is about 9% of every non-home capture; one shell change now beats three — home's bar must stay as it is: e2e/home.spec.ts guards it
Task 1: Ruling: The add screen's save button keeps the new app's enabling rule; only its look follows the old app — spec §3: no change to behaviour; the restyle made it disable only after a failed save — a small look difference if the old button looked disabled at other times
Task 1: Ruling: A failed add shows in the snackbar, as the old app did; the form keeps its values — where the message shows is presentation, and the form still keeps the input as the existing case requires — the message's place on one state
Task 1: Ruling: add-error stays at 9.3% / 7.5%, over the 5% desktop target — the old app greys the save button after a failed check, and the button keeps the new app's rule (spec §3) — a greyed button on one state; the developer sees it at the checkpoint
Task 1: complete (commits 56b7b19..4a38fba, not reviewed; one follow-up round)
Progress: 1/5 tasks — Task 1 Add task — 1/5 tasks — Task 1 Add task — the old add screen and the old per-route top bar; add states 4-5% at 1280 except add-error 7.5%
Task 2: started 2026-11-04 16:22
Task 2: agent implementer a0058efbb320bd472
Task 2: Ruling: Sign-in keeps its show-password eye, drawn in the old field style, and the accessibility test checks it again — spec §2 keeps what the rewrite added, drawn in the old style; §7: tests are never weakened — a small icon the old reference lacks
Task 2: Ruling: The password hint keeps the new app's text, not the old one naming symbols — the old text describes a rule the app doesn't apply (it needs a letter and a digit); old wording never extends to text that is now false — one string
Task 2: Ruling: The sign-in states stay over 10% at 390 and signin-error over 5% at 1280 — the old reference has the Facebook button, removed by modernize spec §11.1, and its absence moves the page up by about 60px; the snackbar's Close placement is AppSnackbar's, shared — the developer sees it at the checkpoint
Task 2: complete (commits 4a38fba..03aaa17, not reviewed; one follow-up round)
Progress: 2/5 tasks — Task 2 Sign-in and sign-up — 2/5 tasks — Task 2 Sign-in and sign-up — the old screens with the show-password eye kept; sign-up 3% at 1280, sign-in 4-8% (no Facebook button)
Task 3: started 2026-11-04 16:34
Task 3: agent implementer abc876eeb48d2532b
Task 3: Ruling: A failed label create has no e2e case; the validation cases cover the typed name staying — the implementer couldn't make the Firestore write fail reliably in the emulator — a regression in that one failure path would go unseen until a person hits it
Task 3: complete (commits 03aaa17..449cebf, not reviewed)
Progress: 3/5 tasks — Task 3 Profile — 3/5 tasks — Task 3 Profile — the old profile screen, mdi-face-man avatar; states within 0.2-1.3% of the old app
Task 4: started 2026-11-04 16:43
Task 4: agent implementer aa4f5976ac75b12d6
Task 4: Ruling: The calendar's dark look is matched with colours scoped to the calendar view, not by changing the shared theme — dark is the old app's default, and the old v-calendar drew its own dark surfaces; the shared theme already matches every other dark screen — calendar-only CSS to keep in step with the theme
Task 4: Ruling: Calendar event times use the old app's format (8 AM, not 8:00 AM) through a calendar formatter in src/lib/dates.ts — the developer chose the old app's wording and date formats on every screen — one formatter
Task 4: Ruling: The calendar keeps the new titles without ordinals (no '2nd') — modernize spec D4 rules out the old ordinal date titles — the title text differs from the old capture
Task 4: Ruling: The calendar's dark colours sit in an unscoped style block in CalendarView.vue; calendar-day stays at 7.2% / 6.7% — Vuetify 4's calendar renders its cells outside the view's scope, and :global() in a scoped block didn't apply; the day view's layout difference was left for the developer's checkpoint — every selector in that block must stay qualified by the calendar's own class, or it reaches other screens
Task 4: complete (commits 449cebf..ee9c4f0, not reviewed; one follow-up round)
Progress: 4/5 tasks — Task 4 Calendar — 4/5 tasks — Task 4 Calendar — the old calendar, its dark surfaces and 8 AM times; month, week, hi, dark within target, day 6.7% at 1280
Task 5: started 2026-11-04 16:54
Task 5: agent implementer a3d5c4abd29e7ff2f
Task 5: Ruling: notifications-list, -hi and -dark stay at about 12.8% / 11.4% — the new app lists newest first (behaviour), and keeps its push switch, inline times and hint, which the old screen didn't have (spec §2) — the developer sees it at the checkpoint
Task 5: Ruling: The Hindi notifications screen keeps Hindi text where the old Hindi screen showed hardcoded English — the old English there was untranslated hardcoding, not chosen wording; the developer confirms at the checkpoint — a few strings
Task 5: complete (commits ee9c4f0..5672a74, not reviewed)
Progress: 5/5 tasks — Task 5 Notifications — 5/5 tasks — Task 5 Notifications — the old notifications screen; empty within 3%, list states about 11% (newest-first order and new controls kept)
Task 2: Ruling: Fix round 2 sent: typecheck error in e2e/auth.spec.ts:494 after the auth wording change — the end's typecheck failed on it — none
Task 5: Ruling: Fix round 1 for Task 5, after Task 2's round 2 is in: the delete icon on notification cards is invisible (a text button in the theme's blue on a blue card); it must show as the old app's white icon — the old-versus-new sheet shows no delete icon on the new cards; nothing the new app has may be lost (spec §2) — none
Task 2: Ruling: Fix round 2 done (fd26600): the AuthStrings type in e2e/auth.spec.ts gained signUp.google; typecheck clean, auth e2e 22/22 — Task 2's report — none
Task 5: complete (commits ee9c4f0..a315a16, not reviewed; one follow-up round)
Checkpoint: five screens approval — after Task 5
Task 5: Ruling: Checkpoint after Task 5 passed: the developer approved the five screens — the developer's reply 'Approve, open PR' — none
Run: finished 2026-11-04 17:08 (built head 019f3e2, squashed from the commits cited above; they stay at tag restore-design-pre-squash)
