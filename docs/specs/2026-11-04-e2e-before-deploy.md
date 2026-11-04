# E2E only before deploy

Date: 2026-11-04 · Status: approved (self-approved on settled facts)

## 1. Why

The developer asked for the Playwright e2e tests to run only before a deploy, not on pull requests
([decisions/e2e-before-deploy-only](../../knowledge/decisions/e2e-before-deploy-only.md)). Today the `e2e` job in
`.github/workflows/ci.yml` runs on both.

## 2. Goal

On a `pull_request` run of `ci.yml`, the `e2e` job is skipped. When `deploy.yml` calls `ci.yml` (a push to
`master`, or a manual run), it runs as it does now, and `deploy` still waits for it.

## 3. Design

- The `e2e` job gets `if: ${{ github.event_name != 'pull_request' }}`, with a comment that points at the decision.
  A called workflow sees its caller's event (`push` or `workflow_dispatch`), so the job runs there, and nothing
  in `deploy.yml` changes.
- `ci.yml`'s header comment and the README's CI paragraph say that e2e runs only before deploy.
- The `checks`, `functions` and `secrets` jobs don't change.

## 4. Non-goals

- Moving the e2e job into `deploy.yml`. Keeping it in `ci.yml` keeps one definition of the job and its caches.
- A label or manual trigger that runs e2e on a pull request. Locally, `npm run e2e` does that.

## 5. Testing

No unit test can run a workflow. What gets checked:

- The `e2e` job has the `if:` condition, and no other job has it.
- `npm run format:check` passes (Prettier parses the YAML).
- On this branch's pull request (PR 77), the next CI run shows `e2e` as skipped and the other jobs running.
