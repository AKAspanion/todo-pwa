# Questions

<!-- GA-GENERATED:index -->

- [Has the modernisation been verified?](fixes-report-verification.md) - docs/FIXES_REPORT.md says no gate was run for any of its 11 tasks; later commits suggest they have been since.
- [Does Google sign-in use a popup first, or a redirect only?](google-sign-in-popup-or-redirect.md) - Answered — redirect only. The code used to try signInWithPopup first, against the draft decision that every Google step is a redirect; the code was changed to the decision.
- [Is the iOS wrapper still shipped?](ios-wrapper-status.md) - packages/ios is a WKWebView wrapper with a placeholder push id, untouched since it was added and absent from the README.
- [Should labels be renamed or deleted?](label-edit-delete.md) - The rules let an owner update and delete labels, but the app only creates them.
- [Should email users be able to reset a forgotten password?](password-reset.md) - Whether to add a "forgot password" flow, since an email user who forgot their password couldn't sign in, nor reach Delete account; answered yes, in the app.
- [Should wrong-password and unknown-user sign-in errors share one message?](sign-in-error-enumeration.md) - Sign-in words a wrong password and an unknown email differently, which reveals whether an email has an account, unless Firebase's email enumeration protection is on for spanion-todo, which nobody has confirmed.
- [Which Pinia store style does new code use?](store-style.md) - Four stores use the options style and the session store the setup style.

<!-- GA-GENERATED:END -->
