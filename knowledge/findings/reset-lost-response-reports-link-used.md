---
type: Finding
title: A lost response to the password change reports the link as used, though the password is set
description: If the server sets the password but the response is lost, pressing the button again gets invalid-action-code and the screen says the link is invalid or used, sending the user for a second link they don't need.
generated:
  by: agent:after-finish/claude-sonnet-5-5
  at: 2026-11-05T00:00:00Z
---

# A lost response to the password change reports the link as used, though the password is set

## Finding

`confirmPasswordReset` can land on the server while its response is lost, so the client sees
`auth/network-request-failed` and keeps the fields. Pressing again answers `auth/invalid-action-code`, and the screen
switches to "This reset link isn't valid or has already been used. Ask for a new one." The password the user typed is
in fact set. The wording is literally true, so the user isn't stuck, only sent around.

## Evidence

`.ga/runs/2026-11-05-password-reset/reviews/final-reviewer.md`: "In fact the password the user typed is now set." Its
suggestion: after `invalid-action-code` follows a network failure on submit, suggest signing in with the new password
beside "Ask for a new link". Ledger: "Final review: minor (deferred): final M3".

## Status

Open: deferred. See [features/password-reset](../features/password-reset.md).

## Sources

- `src/views/ResetPasswordView.vue`
