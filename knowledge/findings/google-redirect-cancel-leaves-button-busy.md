---
type: Finding
title: Cancelling Google's page before it loads leaves the Google button busy
description: The back-forward cache reset covers a restored page, but if the user cancels before Google's page commits, no pageshow fires and the button stays busy; not verified on a device.
generated:
  by: claude-code/claude-sonnet-5-5
  at: 2026-11-05T09:30:00Z
---

# Cancelling Google's page before it loads leaves the Google button busy

## Finding

The sign-in, sign-up and delete-account screens reset a busy Google button on a persisted `pageshow`, which covers a page
restored from the back-forward cache. If the user cancels the navigation before Google's page loads (back or stop), the
app page never unloads, no `pageshow` fires, and `signInWithRedirect` never resolves, so the button stays busy until the
page is reloaded. Whether Chrome's Trusted Web Activity does this rather than restoring from the cache is untested on a
device.

## Evidence

`.ga/runs/2026-11-04-play-store-twa/reviews/final-r1-reviewer.md`, Out-of-Scope Observations: "I4 residual, not
verifiable here: if the user cancels the Google navigation before it commits ... the document never leaves, no
`pageshow` fires, and `busy` stays `'google'` because `signInWithRedirect` never resolves." Ledger: "Final review: minor
(deferred): I4 residual".

## Status

Open: deferred; check on a device during the closed test. See [features/sign-in](../features/sign-in.md).

## Sources

- `src/views/SignInView.vue`
- `src/views/SignUpView.vue`
- `src/components/profile/DeleteAccountDialog.vue`
- `src/services/auth.ts`
