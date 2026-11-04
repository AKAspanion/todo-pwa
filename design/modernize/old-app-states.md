# States the old app can't show

The references in `design/modernize/<screen>/refs/` are captures of the old app (`b8af93e^`), taken by
`e2e/old-app-refs.spec.ts` against the worktree `e2e/support/old-app.mjs` builds (restore-original-design
spec §4.2). The states below have no old reference, because the old app has no such state. Their existing
reference files (captures of the rewrite) stay in place; each screen's checkpoint approves the restyled new
app's capture instead.

| Screen | State | Why the old app can't show it |
|---|---|---|
| calendar | `calendar-details` | The old calendar has no task details dialog: clicking an event does nothing (`Calendar.vue` sets `selectedOpen` but its template has no menu or card for it). |
| profile | `profile-label-error` | The old profile never validates a label name: Enter on the empty field saves an empty label and shows no error (`Profile.vue` `addTaskType`). |
| notifications | `notifications-unsupported` | The old notifications screen has no "unsupported browser" message; it calls `Notification.requestPermission()` on every signed-in page and shows no state for a browser without it. |

Differences in how a captured state is reached, for whoever compares:

- `auth-dark`: the old sign-in page never applies the saved theme (only the signed-in pages' menu does), so a fresh
  load of it is always light. Its dark look is what shows after signing out of a dark page, which keeps the theme,
  so that is what is captured (the sign-out toast is waited out).
- `home-load-error`: the old app does surface a failed load, as its snackbar ("Error getting tasks. Please try
  later!") over empty lists, so it is captured.
- `signin-error-*`: the old app shows the Firebase error text in its snackbar, so the capture shows that.
- The old app offers Facebook sign-in, which the rewrite removed: a content difference of the apps, not of the seed.
