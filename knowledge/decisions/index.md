# Decisions

<!-- GA-GENERATED:index -->

- [Continue the existing todo-pwa codebase](continue-existing-codebase.md) - The code in this repository is built on where it is; it isn't rewritten, migrated or treated as reference only.
- [Facebook sign-in is removed](facebook-sign-in-removed.md) - Only email and password, and Google, remain; accounts that only ever used Facebook can no longer sign in.
- [The iOS wrapper isn't shipped or maintained](ios-wrapper-unmaintained.md) - packages/ios stays in the repository as it is, but nothing ships it, and changes to the site needn't keep it working.
- [Labels stay create-only](labels-create-only.md) - Users create labels but don't rename, recolour or delete them; the app needs no edit or delete for labels.
- [Old tasks are taken to be in Asia/Kolkata](legacy-tasks-asia-kolkata.md) - Tasks the old app saved, which carry no time zone, are read and migrated as India time, the zone the old app and its reminder assumed.
- [The modernisation's gates pass](modernisation-verified.md) - The developer confirmed that typecheck, lint, format, unit, rules, functions and e2e tests and the build pass, so the fix report's "nothing has been run yet" warning is out of date.
- [The emulators run on their own ports](non-default-emulator-ports.md) - Auth, Firestore and Functions emulators use ports other than Firebase's defaults, set once in firebase.json, because another local project uses the defaults.
- [Push reminders are kept, on the Blaze plan](push-reminders-on-blaze.md) - Reminders stay, which needs scheduled functions and so the pay-as-you-go Blaze plan, capped by the budget kill-switch.
- [Saves never time out or retry](saves-never-time-out.md) - A save waits for Firestore's answer however long it takes, because a timeout or a retry risks writing twice; the form says it is still saving after 15 s.
- [New Pinia stores use the setup style](setup-style-stores.md) - A new store is written as a setup store, like the session store; the four options stores stay as they are until they are changed for another reason.
- [@types/node follows the Node each package runs on](types-node-follows-runtime.md) - The app's @types/node stays on the major of its tooling's Node (.nvmrc) and the functions' on their runtime's (nodejs22); Dependabot ignores majors past them.

<!-- GA-GENERATED:END -->
