# SDD ledger — plan: docs/plans/2026-11-18-terms-page.md
Plugin: ga 2.20.0 (afcdea0)
Policy: git.commit=task; run.checkpoints=none; run.unattended=false; run.on-conflict=stop; run.on-plan-defect=rule; run.max-fix-rounds=2; review.when=ask; review.minors=defer; knowledge.update=end-of-plan
Run base: a5342474b363c1b5f29dc2a2e637632a5fc2ba75
Note: no spec — a small feature settled by decisions/terms-of-service (stated) and decisions/legal-pages-english-only; rulings rest on the plan and those decisions
Ruling: Tests run against the auth and Firestore emulators already listening on 2121-2123 (project demo-todo), started from .claude/worktrees/play-store-run; tasks run e2e as 'npx playwright test e2e/legal.spec.ts -g <name>' and unit tests as 'npx vitest run <file>', not 'npm run e2e'/'npm test', whose emulators:exec can't bind the taken ports — the process isn't this run's to stop; same ports and project, so the tests reach the same emulators — stale firestore.rules in that worktree could make a signed-in e2e case fail for an unrelated reason; rerun with npm run e2e once those emulators are stopped
Ruling: No dev servers for this run: 'run dev' couldn't start the emulators (ports taken) and the dashboard port 4800 belongs to another folder's ga serve — the end checks are smoke, typecheck and lint; the screens are checked through Playwright e2e — the developer has no live address during the run
Pre-flight: Task 1 -> Task 2: Task 1 produces the /terms route and TermsView (with links to /privacy and /delete-account); Task 2 consumes /terms in its e2e only (its unit tests stub /terms). Both add a describe block to e2e/legal.spec.ts; Task 2 runs after Task 1, so no conflict
Pre-flight: Task 1: self-consistent — the twelve headings in the table match the acceptance case that asserts them; the forbidden words (Pro, subscription, payment, price, AI, export) appear in none of the table's section texts; 'Agreeing to these terms' links /privacy, 'Ending' links /delete-account, matching the link cases
Pre-flight: Task 2: self-consistent — the en notice text in Interfaces matches the acceptance case word for word, as does the hi text; Profile row order in the case matches the placement in Interfaces
Task 1: started 2026-11-18 10:14
Task 1: agent implementer a1502567d6960b204
Task 1: complete (commits a534247..45586bc, not reviewed)
Progress: 1/2 tasks — Task 1 The /terms page — public /terms page on LegalPage with twelve sections, route with no meta, unit and e2e tests
Task 2: started 2026-11-18 10:16
Task 2: agent implementer a1bcd0768b3dcde75
Task 2: complete (commits 45586bc..8975545, not reviewed)
Progress: 2/2 tasks — Task 2 Links to the terms, and the sign-up notice — terms link on every auth card and Profile's Account card, sign-up agreement notice in en and hi, unit and e2e tests
Note: Review: the developer answered 'Yes, always' — final and security review now; review.when kept as theirs
Final review: started 2026-11-18 10:24
Final review: agent final-reviewer aae88af258ef37b50
Final review: agent security-reviewer a2b23380d18e3f7cd
Note: End checks on 8975545: typecheck pass, lint pass, smoke not run — its emulators:exec can't bind ports 2121-2123 held by the play-store-run worktree's emulators (environment, not the branch)
Final review: Ruling: Important 1 (ads not built): the terms say 'may show ads'; privacy policy unchanged — the developer chose it — none: the developer's answer
Final review: parked — Important 2: a new user via Google on /signin never sees the agreement notice — Ruling: the developer chose to leave it: covered by the terms' using-the-app clause, recorded in decisions/terms-of-service
Final review: Ruling: Minimum age 18 in terms and privacy (raised by the final review as a note); Minor 1 (terms' suspend-or-delete vs privacy's kept-until-you-delete), Minor 2 (guard test lacks /terms), Minor 3 (age test pins only '13') and Minor 4 (broken doc comment in AccountSection.vue) promoted into the fix wave — the age is the developer's answer; the Minors touch the same two legal pages or are one-line fixes, and a contradiction between the terms and the privacy policy is a legal defect — a slightly larger fix wave
Final fixes: agent fixer ae2d8bc95bc6c3d0f
Final review: agent re-reviewer abcaad69f8b22486e
Final fixes: agent knowledge-job aa64cd3d67c7de8be
Task 2: fix round 1/2 (final review fix wave: 6 addressed, 0 open; commits 8975545..b9af7f1)
Final review: minor (deferred): TermsView.test.ts and PrivacyView.test.ts assert not.toContain('13') over the whole page; a later unrelated '13' (a date) would fail them — assert 'under 13' and '13 or older' are gone instead
Note: End checks on b9af7f1: typecheck pass, lint pass; smoke not run (emulator ports held by another worktree's emulators)
Final review: complete (8 findings (2 Important, 4 Minor, 1 age ruling, 1 new Minor), 6 fixed, 1 parked, 1 deferred)
Note: No findings concept for the parked Google sign-in point: the developer chose it, and decisions/terms-of-service records it; the deferred test Minor stays in this record
Run: finished 2026-11-18 10:37
