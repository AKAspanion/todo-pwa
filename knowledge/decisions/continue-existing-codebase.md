---
type: Decision
title: Continue the existing todo-pwa codebase
description: The code in this repository is built on where it is; it isn't rewritten, migrated or treated as reference only.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:11:18Z
verified: human:panditankit1995@gmail.com
---

# Continue the existing todo-pwa codebase

## Context

ga was adopted into this repository on 2026-11-03, on top of a codebase that already had its own history, structure
and conventions. ga asks how adopted code is to be treated: as reference (learned, never changed), to continue (built
on where it is), or to migrate (the source a new build replaces).

## Decision

The todo-pwa code at the repository root is to be **continued**. New work extends it in place, keeping its existing
structure; it is not a copy under `existing/`, and there is no replacement build planned. The developer chose this when
ga was set up.

## Consequences

- The knowledge base describes the code as it is, and `ga:learn-codebase` keeps the repository's own structure rather
  than reshaping it.
- Because `.ga/project.json` marks the project as adopted, ga's `build`, `update` and `plan` scaffolding commands don't
  run here; modules are added with `/ga:add-module`.

## Sources

- `.ga/project.json`
