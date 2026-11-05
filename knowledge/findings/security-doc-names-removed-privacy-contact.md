---
type: Finding
title: docs/SECURITY.md names a contact address in PRIVACY.md that no longer exists
description: The security inventory lists the contact address in PRIVACY.md among identifiers left in the repository on purpose, but PRIVACY.md is now only a pointer to /privacy and has no address.
generated:
  by: claude-code/claude-sonnet-5-5
  at: 2026-11-05T09:30:00Z
---

# docs/SECURITY.md names a contact address in PRIVACY.md that no longer exists

## Finding

The "Other project ids, URLs and emails in code" row of `docs/SECURITY.md` (line 59) lists "the contact address in
`PRIVACY.md`". After the Play Store work `PRIVACY.md` holds only a pointer to the public policy, so the inventory
is stale. The address is now in `src/views/PrivacyView.vue` and `src/views/DeleteAccountInfoView.vue`. This knowledge
job doesn't edit docs outside `knowledge/`, so the row is unchanged.

## Evidence

`.ga/runs/2026-11-04-play-store-twa/reviews/final-r1-reviewer.md`, New Breakage in the Fix Diff: "`docs/SECURITY.md:59`
still lists 'the contact address in `PRIVACY.md`' among identifiers left in the repository on purpose. After e4889b6,
`PRIVACY.md` has no contact address, so the security inventory is stale." Suggested fix: drop the phrase, or name the
address in `src/views/PrivacyView.vue`. Ledger: "Final review: minor (deferred)".

## Status

Open: deferred; one row of a document to correct.

## Sources

- `docs/SECURITY.md`
- `PRIVACY.md`
- `src/views/PrivacyView.vue`
