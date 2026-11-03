# Questions

<!-- GA-GENERATED:index -->

- [Has the modernisation been verified?](fixes-report-verification.md) - docs/FIXES_REPORT.md says no gate was run for any of its 11 tasks; later commits suggest they have been since.
- [Is the iOS wrapper still shipped?](ios-wrapper-status.md) - packages/ios is a WKWebView wrapper with a placeholder push id, untouched since it was added and absent from the README.
- [Should labels be renamed or deleted?](label-edit-delete.md) - The rules let an owner update and delete labels, but the app only creates them.
- [Should email users be able to reset a forgotten password?](password-reset.md) - The app has no "forgot password" flow, so an email user who forgets their password can't sign in, nor reach Delete account; it is outside the agreed usability roadmap.
- [Which Pinia store style does new code use?](store-style.md) - Four stores use the options style and the session store the setup style.

<!-- GA-GENERATED:END -->
