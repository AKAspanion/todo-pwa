# SDD ledger — plan: docs/plans/2026-11-05-local-dev-ports.md
Plugin: ga 2.15.0 (e989938)
Policy: git.commit=task; run.checkpoints=none; run.unattended=false; run.on-conflict=stop; run.on-plan-defect=rule; run.max-fix-rounds=2; review.when=off; review.minors=defer; knowledge.update=after-finish
Run base: e14f2f76ecc50a2566d089aefe116fb91152af81
Provisional: spec approved on settled facts — the developer's answers on 2026-11-05 and decisions/non-default-emulator-ports — the developer confirms the spec
Provisional: plan approved on settled facts — run check clean; one task tracing to the approved spec — the developer confirms the plan
Provisional: Task 1 tagged security — run check refuses a not-security opt-out for a task naming auth; it only changes the Auth emulator's port — the developer signs it off as not security
Task 1: Ruling: dev servers start after Task 1, not before — Task 1 rewrites the dev script and its port; the old server would hold 5173 and run without emulators — none: the check after the task starts them
Task 1: started 2026-11-05 09:46
Task 1: agent implementer aba41678bc076a887
Task 1: complete (commits e14f2f7..084b783, not reviewed)
Progress: 1/1 tasks — Task 1 Port block and one-command dev — 1/1 tasks — Task 1 Port block and one-command dev — ports on 2120–2130, pnpm dev runs emulators + UI + Vite
Task 1: Ruling: pnpm dev forces the demo env from .env.ci (vite --mode emulators), whatever .env.local holds — the live check showed the app fell back to .env.local's non-emulator config and never reached the emulators; the spec's goal is development without a real project, and Playwright already forces .env.ci the same way — a developer who wanted pnpm dev against .env.local's values uses pnpm dev:app
Task 1: fix round 1/5 (1 addressed, 0 open — pnpm dev forces .env.ci; commits 098c56b..bb51752)
Task 1: complete (commits 098c56b..bb51752, not reviewed; fix round 1 after the live check)
