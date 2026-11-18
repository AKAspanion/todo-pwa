---
type: Decision
title: The CI audit ignores the picomatch ReDoS advisory until a fix ships
description: GHSA-fc5q-39xc-vjpf (picomatch, high, no patched version) is ignored by pnpm audit, because it reaches the app only through vue-router's build-time helpers; remove the ignore once a patched picomatch exists.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-18T05:55:00Z
verified: human:ankitp@geekyants.com
stated: "picomatch (GHSA-fc5q-39xc-vjpf, high) has no patched version and fails CI's audit; how should it be handled? — Ignore this one GHSA (Recommended)"
stated_via: qa
---

# The CI audit ignores the picomatch ReDoS advisory until a fix ships

## Context

CI's "Audit shipped dependencies" step (`pnpm audit --prod --audit-level moderate`) started failing on 2026-11-18
on master and every open pull request: `picomatch` `<=4.0.7` has a high-severity ReDoS through repeated
single-branch extglobs (GHSA-fc5q-39xc-vjpf), and no patched version exists. It is a production dependency only
through `vue-router`'s helpers for its build-time routing plugin (`@vue-macros/common` > `unplugin-utils`,
`tinyglobby` > `fdir`), which match file paths during the build; no browser code calls it.

## Decision

The developer decided on 2026-11-18: ignore exactly that advisory, `GHSA-fc5q-39xc-vjpf`, under
`auditConfig.ignoreGhsas` in `pnpm-workspace.yaml`, so every other advisory still fails the audit.

## Consequences

- The audit stays green while the advisory has no fix; any other advisory still fails it.
- When a patched `picomatch` ships, remove the entry (and add an override if `vue-router`'s range doesn't reach
  it), so the audit checks it again.

## Sources

- `pnpm-workspace.yaml`
- `.github/workflows/ci.yml`
