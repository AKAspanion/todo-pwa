# SDD ledger — plan: docs/plans/2026-11-04-play-store-twa.md
Plugin: ga 2.16.0 (5660c9e)
Policy: git.commit=task; run.checkpoints=none; run.unattended=false; run.on-conflict=stop; run.on-plan-defect=rule; run.max-fix-rounds=2; review.when=end-of-plan; review.minors=defer; knowledge.update=end-of-plan
Run base: 84ab4ee3b998223cb8ce65415a1b18bbde268bd7
Note: Recreated the ledger: a header from plugin 2.15.0 with Run base a40bb36 (pre-rebase) and no task lines was left from run ready on 2026-11-04
Note: Dev servers already running from an earlier pnpm dev (app 2120, emulators 2121-2127); run dev's own start failed on the taken hub port, so the run reuses them
Pre-flight: Task 1 -> Task 3: Task 1 produces consumeRedirectResult/RedirectOutcome, accountProviders/confirmWithPassword/confirmWithGoogle/AccountProvider, session deleteAccount; Task 3 consumes exactly those — consistent
Pre-flight: Task 1, Task 3 -> Task 2: links to /privacy and /delete-account, routes Task 2 adds; no shared file or code interface — consistent once merged
Pre-flight: Task 4 and Task 5: no shared files; Task 5's README says to deploy Task 4's function before hosting — consistent
Pre-flight: Tasks 1, 2, 4, 5 self-checks: each task's tests cover files it creates or modifies; Task 1 updates SignInView/SignUpView to its new return types; Task 5 stages Bubblewrap's generated files by name from git status — consistent
Pre-flight: Environment: every unit test runs inside firebase emulators:exec on firebase.json's ports, which the running dev stack holds and which side-by-side worktrees would share
Ruling: Each task's worktree moves every emulator port in its own firebase.json to a private block (Task N: hub 23N1, auth 23N2, firestore 23N3, websocket 23N4, functions 23N5, logging 23N6, ui 23N7, hosting 23N8) before running its tests, and never stages or commits firebase.json — npm test starts its own emulators on firebase.json's ports; the dev stack holds them and the worktrees would collide; stopping the developer's pnpm dev is their call — a firebase.json port edit committed by mistake; the end's diff check catches it
Ruling: Task 2 and Task 3 write their e2e specs (e2e/legal.spec.ts, e2e/delete-account.spec.ts) but don't run them in their worktrees; their first run is at the end on the merged branch — waves.md: e2e shares ports and data with the dev servers and other worktrees — an e2e failure found at the end instead of in the task
Task 1: Ruling: Task 1: before running any test in its worktree, set firebase.json's emulator ports to hub 2311, auth 2312, firestore 2313, firestore websocketPort 2314, functions 2315, logging 2316, ui 2317, hosting 2318; never stage or commit firebase.json; restore it with git checkout -- firebase.json before reporting — the dev stack holds the real ports and the side-by-side worktrees would collide — a committed port edit; the end's diff check catches it
Task 2: Ruling: Task 2: before running any test in its worktree, set firebase.json's emulator ports to hub 2321, auth 2322, firestore 2323, firestore websocketPort 2324, functions 2325, logging 2326, ui 2327, hosting 2328; never stage or commit firebase.json; restore it with git checkout -- firebase.json before reporting — the dev stack holds the real ports and the side-by-side worktrees would collide — a committed port edit; the end's diff check catches it
Task 3: Ruling: Task 3: before running any test in its worktree, set firebase.json's emulator ports to hub 2331, auth 2332, firestore 2333, firestore websocketPort 2334, functions 2335, logging 2336, ui 2337, hosting 2338; never stage or commit firebase.json; restore it with git checkout -- firebase.json before reporting — the dev stack holds the real ports and the side-by-side worktrees would collide — a committed port edit; the end's diff check catches it
Task 4: Ruling: Task 4: before running any test in its worktree, set firebase.json's emulator ports to hub 2341, auth 2342, firestore 2343, firestore websocketPort 2344, functions 2345, logging 2346, ui 2347, hosting 2348; never stage or commit firebase.json; restore it with git checkout -- firebase.json before reporting — the dev stack holds the real ports and the side-by-side worktrees would collide — a committed port edit; the end's diff check catches it
Task 5: Ruling: Task 5: before running any test in its worktree, set firebase.json's emulator ports to hub 2351, auth 2352, firestore 2353, firestore websocketPort 2354, functions 2355, logging 2356, ui 2357, hosting 2358; never stage or commit firebase.json; restore it with git checkout -- firebase.json before reporting — the dev stack holds the real ports and the side-by-side worktrees would collide — a committed port edit; the end's diff check catches it
Task 2: Ruling: Task 2: writes e2e/legal.spec.ts but doesn't run it in its worktree; its first run is at the end on the merged branch — waves.md: e2e shares ports and data with the dev servers — an e2e failure found at the end
Task 3: Ruling: Task 3: writes e2e/delete-account.spec.ts but doesn't run it in its worktree; its first run is at the end on the merged branch — waves.md: e2e shares ports and data with the dev servers — an e2e failure found at the end
Task 1: started 2026-11-05 12:47 (worktree from 84ab4ee)
Task 2: started 2026-11-05 12:47 (worktree from 84ab4ee)
Task 4: started 2026-11-05 12:47 (worktree from 84ab4ee)
Task 5: started 2026-11-05 12:47 (worktree from 84ab4ee)
Task 1: agent implementer aadd09854f0abec44
Task 2: agent implementer a1612c04d74a83bf8
Task 4: agent implementer ac777a6c7144cfac6
Task 5: agent implementer aec9c1a63ef4ecc33
Task 2: merged (fd8d6fc..fd8d6fc)
Task 2: complete (commits 84ab4ee..fd8d6fc, not reviewed)
Note: Task 2: DONE_WITH_CONCERNS — report copied from its worktree (the agent couldn't write outside it); the e2e spec depends on Task 1's sign-in link; the root PRIVACY.md may disagree with /privacy
Progress: 1/5 tasks — Task 2 The public privacy and account-deletion pages — Progress: 1/5 tasks — Task 2 public pages — /privacy and /delete-account, English, public, with 55 unit tests
Note: Root PRIVACY.md (2023 generic policy from the first Play upload) contradicts /privacy (it claims usage-data collection and marketing communication); removing or replacing it is outside the plan — for the developer at the finish
Task 4: Ruling: Task 4: the alice fixture totals 509 documents (501+2+2+2+users/alice+fcm/alice), not the plan's 510; the test asserts 509 — the plan's arithmetic is wrong and the fixture is right — none
Task 4: Ruling: Task 4: keep the uid guard (user/invalid-uid), but deleteUserData logs an invalid uid once by that code and returns without throwing, so the platform doesn't retry it; real failures still rethrow and retry — a uid that can't be a document id never succeeds on retry; failurePolicy would retry it for up to 7 days, and the guard itself stops a crafted uid reaching another user's paths — an invalid uid's documents (there can be none, since it can't name a document) aren't retried
Task 5: merged (cb190eb..cb190eb)
Task 5: complete (commits fd8d6fc..cb190eb, not reviewed)
Progress: 2/5 tasks — Task 5 The Bubblewrap Android project and Digital Asset Links — Progress: 2/5 tasks — Task 5 Bubblewrap TWA — in.spanion.todo.pwa from twa-manifest.json, API 36, assetlinks for the new package, release README
Task 5: Ruling: Task 5: the root README.md edits (Android section and the Play app's host) stay, though outside the task's Files — the task made those lines wrong; leaving them would ship a README that names deleted files — a reviewer may flag scope; the final review sees it
Note: Conflict, asked of the developer: spec D8 (deploy the function before the web change) vs operations/deploy and deploy.yml (hosting deploys on every push to master; functions only by a manual run from master), so merging deploys Delete account before deleteUserData can be deployed
Task 4: merged (727b399..5f0a81f)
Task 4: complete (commits cb190eb..5f0a81f, not reviewed)
Progress: 3/5 tasks — Task 4 The `deleteUserData` function — Progress: 3/5 tasks — Task 4 deleteUserData — Auth user-deletion trigger erases tasks, labels, notifications, devices, users/{uid} and fcm/{uid} in batches of 500; a malformed uid is logged once and dropped
Task 5: Ruling: Task 5: packages/android/README.md's deploy-order section gives the developer's by-hand step: before merging, pnpm exec firebase deploy --only functions:deleteUserData --project spanion-todo from this branch, then merge; it cites decisions/delete-function-deployed-by-hand-first — the developer answered the D8 conflict on 2026-11-05: deploy by hand — none
Task 1: merged (a96e806..a96e806)
Task 1: complete (commits 8617775..a96e806, not reviewed)
Task 1: Ruling: Task 1: src/views/SignInView.test.ts and src/views/SignUpView.test.ts stay, though outside the task's Files — the screen acceptance cases had no place in the three named test files — none
Progress: 4/5 tasks — Task 1 Redirect-only Google sign-in, the account service and account deletion in the session store — Progress: 4/5 tasks — Task 1 redirect sign-in — Google sign-in and sign-up redirect only; account service; session deleteAccount; privacy links on sign-in and sign-up
Task 3: Ruling: Task 3: built in a worktree, though nothing else is in flight — its port-block edit to firebase.json in the main checkout would sit beside the developer's running dev stack — none
Task 3: started 2026-11-05 13:01 (worktree from a96e806)
Task 3: agent implementer a933dc1ea24b6f37e
Task 3: merged (b03c4da..b03c4da)
Task 3: complete (commits a96e806..b03c4da, not reviewed)
Progress: 5/5 tasks — Task 3 Delete account on Profile — Progress: 5/5 tasks — Task 3 delete account on Profile — Account card with privacy link; dialog confirms by password or Google redirect, requires DELETE, reopens confirmed after the redirect
Note: Another session switched the shared checkout to master mid-run; the run continues in the worktree .claude/worktrees/play-store-run on feat/play-store-twa, and the ledger stays in the main checkout
Task 3: minor (deferred): AppMenu's signed-out watcher may navigate to /signin?redirect=/profile just before the dialog's replace('/signin'); ordering, not a guard
Final review: started 2026-11-05 13:17
Note: End checks on b03c4da: typecheck pass, lint pass; smoke, functions build/lint, unit suite and e2e not yet run
Note: End checks on b03c4da: typecheck pass, lint pass, functions build pass, functions lint pass, smoke pass (against the dev app the shared checkout serves, which is on master)
Final review: minor (deferred): Task 3 deferred minor re-graded Minor: AppMenu watcher races the dialog's replace('/signin'); the dialog's replace is issued last
Final review: minor (deferred): deleteUserData.ts duplicates isOwnerId and errorCode from reminders.ts; the two errorCode copies differ on numeric codes
Final review: minor (deferred): DeleteAccountDialog.vue and ProfileView.vue import services directly, following the plan and the auth screens' pattern, against the views-through-a-store convention
Final review: minor (deferred): deleteUserDocuments skips the where('uid') deletes for an invalid uid too; unreachable with this app's providers
Final review: minor (deferred): functions/package.json description is stale (v2 API, two functions); src/lib/authForm.ts:23 still lists popup error codes
Final review: minor (deferred): e2e/legal.spec.ts is named for a topic, not a screen
Final review: Ruling: I3: Delete deletes the Auth user first, then runs the sign-out hooks best-effort (developer, 2026-11-05; decisions/delete-account-deletes-user-first) — hooks-first hung offline and turned reminders off on a failed delete — the client's device-document write after deletion is refused; deleteUserData erases it
Final review: parked — Security M1: a second signed-in device can write for up to an hour after deletion — Ruling: developer accepted it as a risk on 2026-11-05 (risks/late-writes-after-account-deletion)
Note: Fix wave: I1 fixed in a9be30d (README by-hand deploy, test pinned); web fixer dispatched for I2+I3 (delete first), I4 (pageshow reset), PRIVACY.md pointer (developer's ruling), authForm popup codes
Final review: minor (deferred): docs/SECURITY.md:59 mentions the contact address in PRIVACY.md, which the pointer no longer has
Final review: minor (deferred): Offline sign-out still waits on the device-document delete (unchanged sign-out behaviour); the token is removed first now
Note: Flake: e2e/auth.spec.ts 'the open menu sits above the app bar' — failed once on webkit in a 70-test run, passed alone on chromium and webkit; this branch doesn't touch the menu
Note: End checks on e4889b6: typecheck pass, lint pass; e2e (legal, delete-account, auth, profile) 64 passed, 5 skipped, 1 webkit flake that passed alone
Final review: minor (deferred): I4 residual: cancelling Google's page before it loads never unloads the app page, so no pageshow fires and the button stays busy (not verified on a device)
Final review: complete (13 findings, 5 fixed, 1 parked)
Note: Open finding: [findings/appmenu-signout-watcher-race](../../knowledge/findings/appmenu-signout-watcher-race.md) — AppMenu's signed-out watcher races the delete dialog's navigation to /signin
Note: Open finding: [findings/functions-helpers-duplicated](../../knowledge/findings/functions-helpers-duplicated.md) — errorCode and isOwnerId are duplicated across two functions, and the errorCode copies differ
Note: Open finding: [findings/offline-sign-out-waits-on-device-delete](../../knowledge/findings/offline-sign-out-waits-on-device-delete.md) — Offline, sign-out still waits for the device document to be deleted
Note: Open finding: [findings/google-redirect-cancel-leaves-button-busy](../../knowledge/findings/google-redirect-cancel-leaves-button-busy.md) — Cancelling Google's page before it loads leaves the Google button busy
Note: Open finding: [findings/security-doc-names-removed-privacy-contact](../../knowledge/findings/security-doc-names-removed-privacy-contact.md) — docs/SECURITY.md names a contact address in PRIVACY.md that no longer exists
Run: finished 2026-11-05 14:33
