# Risks

<!-- GA-GENERATED:index -->

- [Technical debt and open owner tasks](debt.md) - What the code and docs leave open — live-project tasks for the owner, unpatched dev-only advisories, a stale fix-report warning, and small gaps in the code.
- [A second signed-in device can write after an account is deleted](late-writes-after-account-deletion.md) - Accepted risk — another device keeps a valid ID token for up to an hour after the account is deleted, so it can still write tasks, labels or a device document that deleteUserData, already finished, never erases.

<!-- GA-GENERATED:END -->
