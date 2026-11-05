---
type: Finding
title: AppMenu's signed-out watcher races the delete dialog's navigation to /signin
description: After an account is deleted, AppMenu's watcher and the dialog both navigate; the app ends on /signin only because the dialog's replace is issued last, not because a guard says so.
generated:
  by: claude-code/claude-sonnet-5-5
  at: 2026-11-05T09:30:00Z
---

# AppMenu's signed-out watcher races the delete dialog's navigation to /signin

## Finding

When the session user becomes null after Delete account, `AppMenu.vue` can send the app to `/signin?redirect=/profile`
while `DeleteAccountDialog.vue` calls `router.replace('/signin')`. The user ends on `/signin` with the "Your account
was deleted." message, but only because the dialog's navigation is issued last and the router lets the latest one win.
A change in the order would leave a `redirect=/profile` on the address or lose the message.

## Evidence

`.ga/runs/2026-11-04-play-store-twa/reviews/final-reviewer.md`, Minor M1: "The watcher is queued when
`session.user` becomes null ... So the dialog's replace is always issued last, and vue-router's latest navigation
wins ... What's wrong is that the outcome rests on ordering, not on a guard, and only the unrun e2e checks it"
(`src/components/layout/AppMenu.vue:70-77`). Ledger: "Task 3: minor (deferred)", re-graded Minor and deferred by the
final review. The reviewer's suggested fix: have the watcher skip while the session is deleting, as it does for
`signingOut`.

## Status

Open: deferred; nothing breaks today. See [features/account-deletion](../features/account-deletion.md).

## Sources

- `src/components/layout/AppMenu.vue`
- `src/components/profile/DeleteAccountDialog.vue`
- `src/stores/session.ts`
