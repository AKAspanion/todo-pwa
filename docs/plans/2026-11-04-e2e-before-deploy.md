# E2E only before deploy Implementation Plan

**Status:** complete

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:implement-with-subagents by default, or ga:implement. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The `e2e` CI job runs only when `deploy.yml` calls `ci.yml`, and is skipped on pull requests.

**Architecture:** One job-level `if:` on the `e2e` job in `ci.yml`, keyed on `github.event_name`, which a called workflow inherits from its caller. The comments and README that describe when CI jobs run are updated to match.

**Tech Stack:** GitHub Actions (`.github/workflows/ci.yml`, called by `.github/workflows/deploy.yml`), Playwright via `pnpm run e2e`.

**Spec:** `docs/specs/2026-11-04-e2e-before-deploy.md`

## Global Constraints

- §3: "The `checks`, `functions` and `secrets` jobs don't change."

## Checkpoints

- None (`run.checkpoints: none`).

---

### Task 1: Skip e2e on pull requests

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: existing `e2e` job in `.github/workflows/ci.yml`
- Produces: none

**Spec:**
- §2: "On a `pull_request` run of `ci.yml`, the `e2e` job is skipped."
- §3: "The `e2e` job gets `if: ${{ github.event_name != 'pull_request' }}`, with a comment that points at the decision."
- §3: "`ci.yml`'s header comment and the README's CI paragraph say that e2e runs only before deploy."

**Tags:** not security: `secrets` is the gitleaks job's name, which this task leaves alone

**Knowledge:** `quality/ci`: the `e2e` job runs only before deploy, not on pull requests (`decisions/e2e-before-deploy-only`)

**Acceptance:**
- Given `ci.yml`, then the `e2e` job has `if: ${{ github.event_name != 'pull_request' }}`, and `checks`, `functions` and `secrets` have no `if:` of their own.
- Given `ci.yml`'s header comment and the README's CI paragraph, then each says the e2e job runs only before deploy, not on pull requests.
- Given the changed files, when `npm run format:check` runs, then it exits `0`.

- [x] **Step 1: Search for the condition and confirm it's missing**

Run: `grep -n "github.event_name != 'pull_request'" .github/workflows/ci.yml`
Expected: no match

- [x] **Step 2: Add the condition** to the `e2e` job, with its comment, and update the header comment and the README paragraph

- [x] **Step 3: Search again and run the format check, and confirm they pass**

Run: `grep -n "github.event_name != 'pull_request'" .github/workflows/ci.yml` and `npm run format:check`
Expected: one match, in the `e2e` job; format check exits `0`

- [x] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml README.md
git commit -m "ci: run the e2e job only before deploy"
```
