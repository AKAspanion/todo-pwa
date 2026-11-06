# SDD ledger — plan: docs/plans/2026-11-05-password-reset.md
Plugin: ga 2.16.0 (5660c9e)
Policy: git.commit=task; run.checkpoints=none; run.unattended=false; run.on-conflict=stop; run.on-plan-defect=rule; run.max-fix-rounds=2; review.when=end-of-plan; review.minors=defer; knowledge.update=end-of-plan
Run base: ed0cd776c31eaf462bd235076737b615ba995654
Note: No spec: the plan argues from decisions/password-reset, stated by the developer on 2026-11-05
Ruling: Dev servers not started by run dev, and Task 2 and Task 3 write their e2e specs (e2e/forgot-password.spec.ts, e2e/reset-password.spec.ts) without running them; each task runs only its unit tests with npx vitest — ports 2121-2127 are held by the play-store-run worktree's dev emulators (pid 69092), and npm run e2e would fail on the taken hub port; running Playwright against those emulators would wipe that checkout's local data, and stopping another session's servers is outside this run — the e2e specs' first run is at the finish, where the developer chooses to free the ports or not; a broken spec is fixed then
Pre-flight: src/router/index.ts: Task 2 and Task 3 both add a route; run in turn (Task 3 consumes Task 2)
Pre-flight: src/i18n/locales/{en,hi}/auth.json and src/services/auth.ts: Task 1 only; Tasks 2 and 3 consume its keys and functions
Pre-flight: e2e/support/emulator.ts: Task 2 only (listOobCodes); Task 3 consumes it
Task 1: started 2026-11-05 18:29
Task 1: agent implementer a943cfb8b61453b5c
Task 1: complete (commits ed0cd77..2b51d85, not reviewed)
Progress: 1/3 tasks — Task 1 Reset calls, error keys and copy — requestPasswordReset, checkResetCode, resetPassword; reset-link error keys; en and hi copy
Note: Task 1: Hindi reset copy written by the implementer; a person checks it
Task 2: started 2026-11-05 18:32
Task 2: agent implementer a593450bf7ab54ed8
Task 2: complete (commits 2b51d85..1241393, not reviewed)
Progress: 2/3 tasks — Task 2 Forgot-password screen and the link from sign-in — /forgot-password screen, Forgot password? link on sign-in with the email in history state, guard, listOobCodes; e2e written, not run
Task 3: started 2026-11-05 18:39
Task 3: agent implementer a1ca23f4a4b862bb9
Task 3: Ruling: ResetPasswordView calls @/services/auth directly, as SignInView, SignUpView and ForgotPasswordView do — every auth screen already calls the auth service without a store; conventions.md says views go through a store, so the knowledge job records the auth screens as the exception — a later refactor moves four auth screens behind a store, not one
Task 3: Ruling: auth.reset.retry (Try again) added to en and hi auth.json, and route tests to src/router/guard.test.ts, outside Task 3's Files — the plan required a Try again button with no key for it; the route tests sit where Task 2's did — none beyond two files the plan didn't list
Task 3: complete (commits 1241393..7bc755f, not reviewed)
Progress: 3/3 tasks — Task 3 Reset-password screen — /reset-password: checking, invalid or expired, form under sign-up's rule, done; e2e written, not run
Final review: started 2026-11-05 18:46
Note: End checks on 7bc755f: typecheck pass; lint and smoke not run. Final review stopped unfinished when the usage limit was reached; redispatch both reviewers to resume
Final review: agent security-reviewer a67f5700cf2689ede
Final review: agent final-reviewer ac865994978669410
Note: End checks on 7bc755f: typecheck pass, lint pass, smoke fail (Could not start emulator hub, port taken: the play-store-run worktree holds 2121-2127)
Ruling: /forgot-password is never a return target but is open to signed-in visitors: the guard's set splits in two — Task 2 put it in SIGNED_OUT_PATHS, so Task 3's Ask for a new link bounced a signed-in user to /home; the plan's Interfaces conflicted, and the Review Focus says an expired link offers a new one — a signed-in user can open the forgot screen and send a reset for any address, which a signed-out visitor can already do
Ruling: Final M1 (parity test misses auth.reset.retry) and M2 (link-check retry state blank after the snackbar closes) are fixed before merge, as Important — both sit in files the fix wave changes, and M2 leaves a user with an unexplained button — a few minutes of the fix wave
Final review: minor (deferred): security M1: per-account reset limit (RESET_PASSWORD_EXCEED_LIMIT → auth/too-many-requests) can reveal an account by repeated requests; depends on enumeration protection
Final review: minor (deferred): security M2: the live oobCode stays in the address bar and history while the form shows
Final review: minor (deferred): security M3: on a device signed in as A, Sign in after resetting B lands on A's /home
Final review: minor (deferred): final M3: a password change whose response is lost reports the link as used on retry, though the password is set
Final review: minor (deferred): final M4: a link check that can never succeed (user-disabled, deleted account) offers Try again forever
Final review: minor (deferred): final M5: the new screens use sign-in's fixed-height centred layout; on short viewports the taller reset card may be cut off (unverified)
Note: Knowledge job: security/auth must not say a reset leaves the signed-in session alone when it is the reset account (Firebase revokes its refresh tokens); conventions' 'views go through a store' has the auth screens as an exception; record that the reset only hides unknown emails with Firebase email enumeration protection on (unconfirmed for spanion-todo)
Final fixes: agent final-fixer abeaaa3136a7f8a99
Final review: agent final-re-reviewer aa930260edd86d2e1
Final review: minor (deferred): final r1: the en/hi parity list is built from en only, so a key added to hi alone isn't checked
Final review: minor (deferred): final r1: guard path sets compare exactly, so /SignIn or /signin/ escape both sets (before this branch too; stays in-app)
Final review: complete (12 findings, 4 fixed, 0 parked)
Note: End checks on 2e811f2: typecheck pass, lint pass; smoke not rerun (emulator ports still held by play-store-run)
Final fixes: agent knowledge-job a4d2ef78cb664d198
Open finding: [findings/reset-limit-can-reveal-account](../../knowledge/findings/reset-limit-can-reveal-account.md) — The per-account reset limit can reveal that an address has an account
Open finding: [findings/reset-code-stays-in-address-bar](../../knowledge/findings/reset-code-stays-in-address-bar.md) — The live reset code stays in the address bar and browser history
Open finding: [findings/reset-sign-in-lands-on-other-account](../../knowledge/findings/reset-sign-in-lands-on-other-account.md) — After resetting one account on a device signed in as another, Sign in lands in the other account
Open finding: [findings/reset-lost-response-reports-link-used](../../knowledge/findings/reset-lost-response-reports-link-used.md) — A lost response to the password change reports the link as used, though the password is set
Open finding: [findings/reset-check-try-again-forever](../../knowledge/findings/reset-check-try-again-forever.md) — A link check that can never succeed offers Try again forever
Open finding: [findings/reset-fixed-height-layout-short-viewports](../../knowledge/findings/reset-fixed-height-layout-short-viewports.md) — The forgot and reset screens use sign-in's fixed-height layout, which may cut off a tall card on short viewports
Open finding: [findings/guard-compares-paths-exactly](../../knowledge/findings/guard-compares-paths-exactly.md) — The route guard compares paths exactly, so /SignIn and /signin/ escape its sets
Run: finished 2026-11-05 23:50
