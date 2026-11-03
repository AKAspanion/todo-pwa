# Decisions

<!-- GA-GENERATED:index -->

- [Calendar tasks move by drag or a Move button, and empty space adds one](calendar-move-and-add.md) - Todo tasks are dragged to another day or time on the calendar (15-minute steps in week and day view, press and hold on touch), with a Move button for the keyboard; clicking empty space opens the add screen with that date.
- [Continue the existing todo-pwa codebase](continue-existing-codebase.md) - The code in this repository is built on where it is; it isn't rewritten, migrated or treated as reference only.
- [Data exports as JSON, CSV and .ics, imports from JSON as new, and account deletion is finished by a function](data-export-import-and-account-deletion.md) - Profile exports tasks as JSON (complete), CSV and .ics; import accepts only the app's JSON and adds everything as new; deleting the account re-confirms the user, deletes the Auth user, and an auth-deletion trigger erases the data.
- [Facebook sign-in is removed](facebook-sign-in-removed.md) - Only email and password, and Google, remain; accounts that only ever used Facebook can no longer sign in.
- [Home opens on a Today view with overdue tasks first](home-views.md) - Home gets Today, Upcoming, Overdue, No date and All views beside the date bar; overdue means dated before today, and undated tasks no longer show on every day.
- [Calendar export is an .ics file made in the browser](ics-export-client-side.md) - Tasks reach other calendars as an .ics file the app builds and downloads; there is no subscribable feed, so no function answers HTTP.
- [The iOS wrapper isn't shipped or maintained](ios-wrapper-unmaintained.md) - packages/ios stays in the repository as it is, but nothing ships it, and changes to the site needn't keep it working.
- [Labels stay create-only](labels-create-only.md) - Users create labels but don't rename, recolour or delete them; the app needs no edit or delete for labels.
- [Old tasks are taken to be in Asia/Kolkata](legacy-tasks-asia-kolkata.md) - Tasks the old app saved, which carry no time zone, are read and migrated as India time, the zone the old app and its reminder assumed.
- [The modernisation's gates pass](modernisation-verified.md) - The developer confirmed that typecheck, lint, format, unit, rules, functions and e2e tests and the build pass, so the fix report's "nothing has been run yet" warning is out of date.
- [The emulators run on their own ports](non-default-emulator-ports.md) - Auth, Firestore and Functions emulators use ports other than Firebase's defaults, set once in firebase.json, because another local project uses the defaults.
- [Push reminders are kept, on the Blaze plan](push-reminders-on-blaze.md) - Reminders stay, which needs scheduled functions and so the pay-as-you-go Blaze plan, capped by the budget kill-switch.
- [Quick add reads dates with its own English and Hindi parser](quick-capture.md) - Quick add on Home reads a fixed set of date and time phrases in English and Hindi with a parser of the app's own; the web app gets icon shortcuts and a share target, the Android app later; keys reach cards.
- [A repeating task creates its next occurrence when it is done](recurring-tasks.md) - Each occurrence is an ordinary task; finishing one creates the next on the first pattern date after both its date and today, copying it with the checklist unticked; edits carry forward and done history stays.
- [Reminders go at a lead time each task chooses, with Mark done and Snooze that open the app](reminder-lead-time-and-actions.md) - Each task picks how long before it is due to be reminded (stored as remindBefore and notifyAt); the push carries Mark done and Snooze buttons that open the app to act; snooze is 15 minutes or 1 hour.
- [Saves never time out or retry](saves-never-time-out.md) - A save waits for Firestore's answer however long it takes, because a timeout or a retry risks writing twice; the form says it is still saving after 15 s.
- [New Pinia stores use the setup style](setup-style-stores.md) - A new store is written as a setup store, like the session store; the four options stores stay as they are until they are changed for another reason.
- [Tasks get a four-level priority that sorts within a day, and a checklist field](task-priority-and-checklist.md) - A task has a priority (none, low, medium, high) that orders tasks within a day before their time, and a checklist of up to 50 items stored in its own field.
- [@types/node follows the Node each package runs on](types-node-follows-runtime.md) - The app's @types/node stays on the major of its tooling's Node (.nvmrc) and the functions' on their runtime's (nodejs22); Dependabot ignores majors past them.
- [Deletes on the board are undone, not confirmed](undo-instead-of-confirm.md) - Deleting a task happens at once and offers Undo instead of asking first; Clear done still asks, deletes only the done tasks the filter shows, and offers Undo too.
- [Usability features are built in eight parts, in order](usability-roadmap.md) - Nineteen usability features are grouped into eight parts — board fixes, views, faster capture, calendar, task fields, reminders, recurring tasks, data and account — each with its own spec and plan.

<!-- GA-GENERATED:END -->
