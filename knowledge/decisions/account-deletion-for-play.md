---
type: Decision
title: Account deletion ships with the Play app, in the app and from a public web page
description: Delete account moves out of usability part 8 into the Play Store work, with Google re-confirmation by redirect; a public /delete-account page gives Play's web link, with the in-app steps and an email request for people who can't sign in.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-04T09:20:07Z
---

# Account deletion ships with the Play app, in the app and from a public web page

## Context

Play requires an app that lets people create an account to let them delete it, both inside the app and through a
web link given in the Data safety form. Deletion was agreed as part 8 of
[decisions/usability-roadmap](usability-roadmap.md), to be built after parts 1–7
([decisions/data-export-import-and-account-deletion](data-export-import-and-account-deletion.md)). The app had no
password reset when this was decided ([questions/password-reset](../questions/password-reset.md)), so an email user
who forgot their password couldn't reach an in-app button; one has since been decided
([decisions/password-reset](password-reset.md)).

## Decision

The developer decided on 2026-11-04:

- Delete account is built now, with the Play app, as part 8 describes it (re-confirm, type `DELETE`, delete the
  Auth user, an auth-deletion function erases the data), except that Google re-confirmation is a redirect
  ([decisions/google-sign-in-redirect-only](google-sign-in-redirect-only.md)) and the dialog reopens already
  confirmed when the redirect comes back.
- A public page, `/delete-account`, is Play's web link. It names the app and the developer, gives the in-app
  steps, says what is deleted and what is kept, and offers a deletion request by email to
  `panditankit1995@gmail.com` for anyone who can't sign in.
- Part 8 keeps export and import only.

## Consequences

- Requests by email are handled by hand by the developer; the page says how long that takes.
- The behaviour is specified in `docs/specs/2026-11-04-play-store-twa.md`.

## Sources

- `docs/specs/2026-11-04-play-store-twa.md`
- `docs/specs/2026-11-03-data-and-account.md`
