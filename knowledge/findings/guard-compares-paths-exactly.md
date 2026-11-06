---
type: Finding
title: The route guard compares paths exactly, so /SignIn and /signin/ escape its sets
description: The guard's two path sets match to.path and the redirect's pathname exactly while the router is case-insensitive and non-strict, so a signed-in visit to /SignIn isn't bounced and a redirect to /signin/ isn't refused.
generated:
  by: agent:after-finish/claude-sonnet-5-5
  at: 2026-11-05T00:00:00Z
---

# The route guard compares paths exactly, so /SignIn and /signin/ escape its sets

## Finding

`NEVER_REDIRECT_TO` and `SIGNED_IN_LEAVES` in `src/router/guard.ts` match `url.pathname` and `to.path` exactly. The
router is case-insensitive and non-strict, so `/SignIn` or `/signin/` is neither sent away from for a signed-in visit
nor refused by `safeRedirect`. This predates the branch (the old set compared the same way). It is a UX gap, not a
security one: every path that passes stays in-app.

## Evidence

`.ga/runs/2026-11-05-password-reset/reviews/final-r1-reviewer.md`: "a UX gap, not a security one, since every path that
passes stays in-app." Ledger: "Final review: minor (deferred): final r1: guard path sets compare exactly".

## Status

Open: deferred. See [security/auth](../security/auth.md).

## Sources

- `src/router/guard.ts`
