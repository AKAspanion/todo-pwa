---
type: Finding
title: The live reset code stays in the address bar and browser history
description: /reset-password leaves oobCode in the URL while the form shows, so a credential that sets the password sits in history, synced history and any pasted URL until used or expired.
generated:
  by: agent:after-finish/claude-sonnet-5-5
  at: 2026-11-05T00:00:00Z
---

# The live reset code stays in the address bar and browser history

## Finding

`ResetPasswordView.vue` reads `oobCode` from the query and leaves it there while the form shows. Until it is used or
expires, the code sets the account's password, and it sits in the tab's URL, in history and synced history, and in any
screenshot or pasted URL. The code is single-use and short-lived, the email link already carries it, and Firebase's own
hosted page behaves the same way, so it is low. Removing it with `router.replace({ query: {} })` would make a reload
show the invalid state, and the query watcher must not treat the replace as a new link.

## Evidence

`.ga/runs/2026-11-05-password-reset/reviews/final-security-reviewer.md`: "Browser history isn't a log, but it is the
same kind of persistence." Ledger: "Final review: minor (deferred): security M2".

## Status

Open: deferred. See [features/password-reset](../features/password-reset.md).

## Sources

- `src/views/ResetPasswordView.vue`
