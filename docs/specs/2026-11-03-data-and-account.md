# Spec: Data and account — export, import, delete account

_2026-11-03 · status: approved 2026-11-03 · part 8 of [decisions/usability-roadmap](../../knowledge/decisions/usability-roadmap.md) · decisions: [decisions/data-export-import-and-account-deletion](../../knowledge/decisions/data-export-import-and-account-deletion.md), [decisions/ics-export-client-side](../../knowledge/decisions/ics-export-client-side.md) · builds after part 7, `docs/plans/2026-11-03-recurring-tasks.md`_

## §1 Goal

A user can take their tasks out (JSON, CSV, a calendar file), bring a JSON export back in, and delete their account
with every piece of their data.

## §2 Behaviour

**P1 Where.** Profile gains a "Your data" section with: Export as JSON, Export as CSV, Export calendar (.ics),
Import from JSON, and Delete account.

### Export

**E1 Files.** Each export is built in the browser from the user's loaded tasks and labels and downloaded as
`tasks-<YYYY-MM-DD>.json`, `.csv` or `.ics` (today's local date). Nothing is sent anywhere. While tasks are still
loading, or failed to load, the export buttons are disabled with the load's own message.

**E2 JSON.**

```ts
interface ExportFile {
  app: 'todo-pwa';
  version: 1;
  exportedAt: string; // ISO 8601
  labels: { id: string; label: string; color: string }[];
  tasks: {
    id: string; title: string; description: string; status: 'todo' | 'done';
    indefinite: boolean; date: string | null; time: string | null; timeZone: string;
    priority: Priority; checklist: ChecklistItem[]; labelIds: string[];
    remindBefore: number; repeat: RepeatRule | null; seriesId: string | null;
  }[];
}
```

Derived fields (`remindAt`, `notifyAt`, `reminded`, `spawnedNext`) and `uid` are left out. Notifications aren't
exported.

**E3 CSV.** One header row, then one row per task: `Title`, `Description`, `Status`, `Date`, `Time`, `Priority`,
`Labels` (names joined by `; `), `Checklist` (`done/total`), `Repeat` (the English summary of part 7). RFC 4180
quoting, UTF-8 with a byte-order mark so spreadsheets read Hindi. A cell that starts with `=`, `+`, `-`, `@`, a tab
or a carriage return is prefixed with `'`, so a spreadsheet never runs it as a formula.

**E4 .ics.** An iCalendar file (`PRODID:-//Task Manager//todo-pwa//EN`) with one `VEVENT` per dated todo task:
`UID:<task id>@todo.spanion.in`, `SUMMARY` the title, `DESCRIPTION` the description, text escaped per RFC 5545
(`\`, `;`, `,`, newlines), lines folded at 75 octets and ended with CRLF.

- A task with a time: `DTSTART;TZID=<its timeZone>:<YYYYMMDDTHHmmss>` and `DURATION:PT30M`. IANA zone names are
  written as `TZID` without `VTIMEZONE` blocks, which Google, Apple and Outlook calendars accept.
- A task without a time: `DTSTART;VALUE=DATE:<YYYYMMDD>`.
- A repeating task: an `RRULE` from its rule: `FREQ` `DAILY`, `WEEKLY`, `MONTHLY` or `YEARLY`; `INTERVAL`; `BYDAY`
  for weekly; `UNTIL` for an end date. A monthly rule on day 29–31 is written
  `BYMONTHDAY=28,29,…,<day>;BYSETPOS=-1`, and a yearly rule on 29 February `BYMONTH=2;BYMONTHDAY=28,29;BYSETPOS=-1`,
  so other calendars fall on the month's last day as the app does.

### Import

**I1 What it reads.** Import opens a file picker for `.json`. A file over `IMPORT_MAX_BYTES = 5 MB`, that isn't JSON,
whose `app` isn't `'todo-pwa'`, or whose `version` isn't `1`, is refused with a message saying which, and nothing is
written. More than `IMPORT_MAX_TASKS = 2000` tasks or `IMPORT_MAX_LABELS = 500` labels is refused the same way.

**I2 Checking.** Each label and task is checked against the limits the app already keeps (title, description,
label name and colour, priority, checklist, `remindBefore`, repeat rule, date and time formats). One that fails is
skipped and counted; unknown keys are ignored.

**I3 Preview.** A dialog says what will happen: "12 tasks and 3 labels will be added." and, when some are skipped,
"2 tasks can't be imported and will be skipped.", and always "Importing the same file twice adds everything twice.",
with Import and Cancel.

**I4 Writing.** On Import, labels are created first, each with a new id; then tasks, each with a new id and its
`labelIds` mapped to the new label ids (an id with no imported label is dropped), and each old `seriesId` mapped to
one new `seriesId`. `uid` is the importing user's. Derived fields are worked out as for a new task (`remindAt`,
`notifyAt`, `reminded: false`); `spawnedNext` is `true` for a done task and `false` for a todo one, so reopening an
imported done occurrence creates nothing. Writes go in batches of at most `500`. A batch that fails stops the
import: what was written stays, and the dialog says how many tasks and labels were added before it stopped. It
never times out or retries.

**I5 After.** The tasks and labels stores load again, and the snackbar says "Imported 12 tasks and 3 labels.".

### Delete account

**D1 The dialog.** Delete account opens a dialog that says every task, label, reminder and push device of the
account will be deleted and can't be brought back, and suggests exporting first. It asks the user to confirm who
they are: their password for an email account, or "Continue with Google" for a Google account (a popup, or a
redirect where popups are blocked, as sign-in does). Then they type `DELETE`; the Delete button is enabled only
when both are done.

**D2 Deleting.** Delete: (1) re-authenticates with what was given; a wrong password or a closed popup says so and
stops; (2) turns push off for this browser, as sign-out does (its device document and token); (3) deletes the
Firebase Auth user. Then the app is signed out, goes to `/signin`, and says "Your account was deleted.". If step 3
fails, nothing more happens and the dialog says "Couldn't delete your account. Try again.".

**D3 The function.** `deleteUserData`, a function on Firebase Auth's user-deletion event (`firebase-functions/v1`
`auth.user().onDelete`; not HTTP, not callable), deletes with the Admin SDK every document whose `uid` is the deleted
user's in `tasks`, `types` and `notifications`, every document under `users/{uid}/devices`, `users/{uid}` itself, and
the old app's `fcm/{uid}`, in batches of `500`. It takes the uid only from the event. Running it again on the same
uid deletes nothing more and succeeds. A failure is logged by error code and the function is retried by the
platform.

**D4 The export test.** `functions/src/reminders.test.ts`'s entry-point test (S1 of the 2026-11-02 spec) lists
`deleteUserData` on purpose, and still fails on any HTTP or callable export.

**D5 Deploy.** The function deploys with the others by the manual run
([operations/deploy](../../knowledge/operations/deploy.md)). Until it is deployed, deleting an account leaves its
data behind; the rules then let no one read it, and the function, once deployed, doesn't clean up accounts deleted
before it. The client change and the function are released together.

### Text

**X1** New strings in `src/i18n/locales/{en,hi}/profile.json` with the same keys: the section, the buttons, the
preview and refusal messages, the delete dialog and its outcomes.

## §3 Design

- `src/lib/exportFormats.ts`: `toExportJson`, `toCsv`, `toIcs`, pure. `src/lib/importFile.ts`: `parseImportFile`,
  pure, returning what will be added and what was skipped.
- `src/services/importer.ts`: writes the batches (I4). `src/services/account.ts`: re-authenticate and delete the Auth
  user (D2), beside `src/services/auth.ts`.
- `src/components/profile/YourData.vue`, `ImportDialog.vue`, `DeleteAccountDialog.vue`; Profile places
  `YourData`.
- `functions/src/deleteUserData.ts`, exported from `functions/src/index.ts`.

## §4 Security and hostile input

- **Import** reads an untrusted file: capped by size and counts before parsing past the header, every record
  checked against the app's limits, unknown keys ignored, and every write still passes `firestore.rules` as the
  importing user. No imported id is reused: labels and tasks get new ids, so a file can't overwrite or reach
  another user's documents. Text is never rendered as HTML.
- **CSV** cells that a spreadsheet would run as formulas are neutralised (E3).
- **Delete** requires a fresh re-authentication and a typed confirmation; the function deletes only by the uid in
  the Auth event, never one a client names, and only in the user's own paths.
- **Export** files are made in the browser and go only to the user's own download; nothing is uploaded.

## §5 Tests

Written first, each run alone:

- `src/lib/exportFormats.test.ts`: E2's shape; E3's quoting, BOM, formula guard and Hindi text; E4's escaping,
  folding, CRLF, timed and all-day events, and each `RRULE` form including day 31 and 29 February.
- `src/lib/importFile.test.ts`: I1's refusals (6 MB, not JSON, wrong `app`, `version: 2`, 2001 tasks), I2's skips
  (a 201-character title, `priority: 'urgent'`, a bad repeat), unknown keys ignored.
- `src/services/importer.test.ts` against the emulators: I4's new ids, mapped labels and series, derived fields,
  a stop part-way.
- `src/services/account.test.ts` against the auth emulator: a wrong password stops; success deletes the user.
- `functions/src/deleteUserData.test.ts` against the emulator: only the deleted user's documents go, in every
  collection, across more than `500`; a second run succeeds and deletes nothing more.
- `functions/src/reminders.test.ts`: D4.
- Component tests for the import preview and the delete dialog's enabling rules.

## §6 Out of scope

CSV import; merging an import with existing tasks; exporting notifications; a scheduled backup; a subscribable
calendar feed ([decisions/ics-export-client-side](../../knowledge/decisions/ics-export-client-side.md)); cleaning up
data of accounts deleted before the function is deployed.
