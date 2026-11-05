# Findings

<!-- GA-GENERATED:index -->

- [AppMenu's signed-out watcher races the delete dialog's navigation to /signin](appmenu-signout-watcher-race.md) - After an account is deleted, AppMenu's watcher and the dialog both navigate; the app ends on /signin only because the dialog's replace is issued last, not because a guard says so.
- [Secret-shaped values committed to git](committed-secret-candidates.md) - The inventory scan flagged two whole files and five lines as possible secrets; the docs say they are demo or public values, but nobody has confirmed each one.
- [errorCode and isOwnerId are duplicated across two functions, and the errorCode copies differ](functions-helpers-duplicated.md) - functions/src/deleteUserData.ts copies isOwnerId and errorCode from reminders.ts; the two errorCode copies disagree on numeric gRPC codes, so the same Firestore failure logs differently.
- [Cancelling Google's page before it loads leaves the Google button busy](google-redirect-cancel-leaves-button-busy.md) - The back-forward cache reset covers a restored page, but if the user cancels before Google's page commits, no pageshow fires and the button stays busy; not verified on a device.
- [Offline, sign-out still waits for the device document to be deleted](offline-sign-out-waits-on-device-delete.md) - The sign-out hook awaits the device-document delete, which never settles offline, so Sign out from the menu spins until the connection returns, although the push token is now removed at once.
- [docs/SECURITY.md names a contact address in PRIVACY.md that no longer exists](security-doc-names-removed-privacy-contact.md) - The security inventory lists the contact address in PRIVACY.md among identifiers left in the repository on purpose, but PRIVACY.md is now only a pointer to /privacy and has no address.

<!-- GA-GENERATED:END -->
