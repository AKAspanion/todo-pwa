---
type: Decision
status: draft
title: '@types/node follows the Node each package runs on'
description: The app's @types/node stays on the major of its tooling's Node (.nvmrc) and the functions' on their runtime's (nodejs22); Dependabot ignores majors past them.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-03T04:35:01Z
---

# @types/node follows the Node each package runs on

## Context

Dependabot opened PRs moving `@types/node` to 26 in the root (from 24) and in `functions/` (from 22). Both passed
CI. But types newer than the runtime let code use Node APIs that type-check and then don't exist when it runs:
the functions run on `nodejs22` in production (`firebase.json`, and `engines.node` in `functions/package.json`),
and the app's build and tests run on the Node in `.nvmrc`.

## Decision

On 2026-11-03 the developer chose to keep each package's `@types/node` on the major of the Node it runs on, and
to close the two PRs. `.github/dependabot.yml` ignores `@types/node` majors past them, one `ignore` rule per
package, next to the TypeScript 7 rule. Minor and patch updates inside the major still arrive.

## Consequences

- Moving the functions to a newer runtime, or `.nvmrc` to a newer Node, means raising that package's
  `@types/node` rule in `.github/dependabot.yml` in the same change.
- Dependabot won't propose a `@types/node` major that runs ahead of its runtime again.

## Sources

- `.github/dependabot.yml`
- `.nvmrc`
- `firebase.json`
- `functions/package.json`
- `package.json`
