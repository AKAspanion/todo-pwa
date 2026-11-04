# Data and account Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:implement-with-subagents by default, or ga:implement. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Profile exports the user's tasks as JSON, CSV and .ics, imports the app's own JSON as new tasks and labels, and deletes the account, with a function that erases all of its data.

**Architecture:** Pure modules build the three export formats and parse an import file. A service writes an import in batches; another re-authenticates and deletes the Auth user. Profile gains a "Your data" section with the import preview and the delete dialog. A new function on Auth's user-deletion event (`firebase-functions/v1`, not HTTP) deletes the user's documents with the Admin SDK.

**Tech Stack:** Vue 3.5, Vuetify 4, Pinia, vue-i18n 11, Firebase 13 modular SDK (Auth `reauthenticateWithCredential`, `reauthenticateWithPopup`, `deleteUser`; Firestore `writeBatch`), firebase-functions 7 (`firebase-functions/v1` auth trigger) and firebase-admin 14 on Node 22, Vitest against the emulators.

**Spec:** `docs/specs/2026-11-03-data-and-account.md`

**Builds after:** parts 1–7 (`docs/plans/2026-11-03-board-fixes.md` to `docs/plans/2026-11-03-recurring-tasks.md`): the task's fields up to `repeat`, `seriesId` and `spawnedNext`, `cleanChecklist`, `isRepeatRule`, `isPriority`, `isRemindBefore`, `formatRepeat` through `RepeatSummary`'s logic. Their code is taken as already there.

> **2026-11-04:** Delete account moved to `docs/specs/2026-11-04-play-store-twa.md` and its plan. Skip this plan's delete-account steps and files (`src/services/account.ts`, `DeleteAccountDialog.vue`, `functions/src/deleteUserData.ts`); revise the plan before running it.

## Global Constraints

- §2 E1: "Nothing is sent anywhere."
- §2 I1: limits `IMPORT_MAX_BYTES = 5 MB`, `IMPORT_MAX_TASKS = 2000`, `IMPORT_MAX_LABELS = 500`.
- §2 I4: "Writes go in batches of at most `500`."
- §2 I4: "It never times out or retries."
- §2 D3: "It takes the uid only from the event."
- New strings go in `src/i18n/locales/en/profile.json` and `src/i18n/locales/hi/profile.json`, with the same keys.
- No change to `firestore.rules`: every write is an owner's ordinary create or delete.

## Checkpoints

None (`run.checkpoints: none`). The run stops only where the developer names a stop.

---

### Task 1: The export formats, the import parser and the strings

**Files:**
- Create: `src/lib/exportFormats.ts`
- Create: `src/lib/exportFormats.test.ts`
- Create: `src/lib/importFile.ts`
- Create: `src/lib/importFile.test.ts`
- Modify: `src/i18n/locales/en/profile.json`
- Modify: `src/i18n/locales/hi/profile.json`

**Interfaces:**
- Consumes: the `Task`, `Label`, `RepeatRule`, `Priority` and `ChecklistItem` types; existing checks `TITLE_MAX`, `DESCRIPTION_MAX`, `charCount`, `cleanChecklist`, `isPriority`, `isRemindBefore`, `isRepeatRule`, `parseYmd`, `parseHm`, `isValidTimeZone`, and the label limits `LABEL_NAME_MAX` and `LABEL_COLOR_MAX`.
- Produces:

```ts
// src/lib/exportFormats.ts
export interface ExportFile { /* as §2 E2 */ }
export function toExportJson(tasks: readonly Task[], labels: readonly Label[], now: Date): ExportFile;
export function toCsv(tasks: readonly Task[], labels: readonly Label[]): string;
export function toIcs(tasks: readonly Task[], now: Date): string;
export function exportFileName(ext: 'json' | 'csv' | 'ics', today: string): string; // tasks-<today>.<ext>

// src/lib/importFile.ts
export const IMPORT_MAX_BYTES = 5 * 1024 * 1024;
export const IMPORT_MAX_TASKS = 2000;
export const IMPORT_MAX_LABELS = 500;
export type ImportRefusal = 'too-big' | 'not-json' | 'wrong-app' | 'wrong-version' | 'too-many';
export interface ImportLabel { oldId: string; label: string; color: string }
export interface ImportTask { oldId: string; input: TaskInput & { status: TaskStatus }; oldLabelIds: string[]; oldSeriesId: string | null }
export type ImportPlan =
  | { ok: false; refusal: ImportRefusal }
  | { ok: true; labels: ImportLabel[]; tasks: ImportTask[]; skippedTasks: number; skippedLabels: number };
export function parseImportFile(text: string, byteLength: number): ImportPlan;
```

New keys in `profile.json`, English then Hindi:

| Key | en | hi |
|---|---|---|
| `data.title` | `Your data` | `आपका डेटा` |
| `data.exportJson` | `Export as JSON` | `JSON के रूप में निर्यात करें` |
| `data.exportCsv` | `Export as CSV` | `CSV के रूप में निर्यात करें` |
| `data.exportIcs` | `Export calendar (.ics)` | `कैलेंडर निर्यात करें (.ics)` |
| `data.import` | `Import from JSON` | `JSON से आयात करें` |
| `import.tooBig` | `This file is larger than 5 MB.` | `यह फ़ाइल 5 MB से बड़ी है।` |
| `import.notJson` | `This file isn't valid JSON.` | `यह फ़ाइल मान्य JSON नहीं है।` |
| `import.wrongApp` | `This file isn't a Task Manager export.` | `यह फ़ाइल Task Manager का निर्यात नहीं है।` |
| `import.wrongVersion` | `This export is from a version of the app this one can't read.` | `यह निर्यात ऐप के ऐसे संस्करण से है जिसे यह नहीं पढ़ सकता।` |
| `import.tooMany` | `This file has more than 2000 tasks or 500 labels.` | `इस फ़ाइल में 2000 से ज़्यादा कार्य या 500 से ज़्यादा लेबल हैं।` |
| `import.tasks` | `no tasks \| {n} task \| {n} tasks` | `कोई कार्य नहीं \| {n} कार्य \| {n} कार्य` |
| `import.labels` | `no labels \| {n} label \| {n} labels` | `कोई लेबल नहीं \| {n} लेबल \| {n} लेबल` |
| `import.preview` | `{tasks} and {labels} will be added.` | `{tasks} और {labels} जोड़े जाएँगे।` |
| `import.skipped` | `{n} task can't be imported and will be skipped. \| {n} tasks can't be imported and will be skipped.` | `{n} कार्य आयात नहीं हो सकता और छोड़ दिया जाएगा। \| {n} कार्य आयात नहीं हो सकते और छोड़ दिए जाएँगे।` |
| `import.twice` | `Importing the same file twice adds everything twice.` | `एक ही फ़ाइल दो बार आयात करने से सब कुछ दो बार जुड़ जाता है।` |
| `import.confirm` | `Import` | `आयात करें` |
| `import.cancel` | `Cancel` | `रद्द करें` |
| `import.done` | `Imported {tasks} and {labels}.` | `{tasks} और {labels} आयात किए गए।` |
| `import.stopped` | `Couldn't finish the import: {tasks} and {labels} were added.` | `आयात पूरा नहीं हो सका: {tasks} और {labels} जोड़े गए।` |
| `delete.button` | `Delete account` | `खाता हटाएँ` |
| `delete.title` | `Delete your account?` | `अपना खाता हटाएँ?` |
| `delete.body` | `Every task, label, reminder and push device of this account will be deleted. This can't be undone. Export your data first if you want to keep it.` | `इस खाते के सभी कार्य, लेबल, रिमाइंडर और पुश डिवाइस हटा दिए जाएँगे। इसे वापस नहीं किया जा सकता। अगर डेटा रखना है तो पहले निर्यात कर लें।` |
| `delete.password` | `Password` | `पासवर्ड` |
| `delete.google` | `Continue with Google` | `Google के साथ जारी रखें` |
| `delete.type` | `Type DELETE to confirm` | `पुष्टि के लिए DELETE लिखें` |
| `delete.confirm` | `Delete account` | `खाता हटाएँ` |
| `delete.cancel` | `Cancel` | `रद्द करें` |
| `delete.wrongPassword` | `That password is wrong.` | `यह पासवर्ड गलत है।` |
| `delete.cancelled` | `Confirming your account was cancelled.` | `खाते की पुष्टि रद्द कर दी गई।` |
| `delete.failed` | `Couldn't delete your account. Try again.` | `आपका खाता हटाया नहीं जा सका। फिर से कोशिश करें।` |
| `delete.done` | `Your account was deleted.` | `आपका खाता हटा दिया गया।` |

**Spec:**
- §2 E2: "Derived fields (`remindAt`, `notifyAt`, `reminded`, `spawnedNext`) and `uid` are left out. Notifications aren't exported."
- §2 E3: "RFC 4180 quoting, UTF-8 with a byte-order mark so spreadsheets read Hindi."
- §2 E4: "text escaped per RFC 5545 (`\`, `;`, `,`, newlines), lines folded at 75 octets and ended with CRLF."
- §2 E4: "so other calendars fall on the month's last day as the app does."
- §2 I2: "One that fails is skipped and counted; unknown keys are ignored."

**Tags:** `security`

**Knowledge:**
- `features/data-and-account` (new): the JSON, CSV and .ics export formats and what each leaves out; import's limits and checks.

**Acceptance:**
- `toExportJson` gives `app: 'todo-pwa'`, `version: 1`, the given time as `exportedAt`, every label, and every task with the fields of §2 E2 and none of `uid`, `remindAt`, `notifyAt`, `reminded`, `spawnedNext`.
- `toCsv`: starts with the byte-order mark and the header `Title,Description,Status,Date,Time,Priority,Labels,Checklist,Repeat`; a title `Say "hi", then leave` is written `"Say ""hi"", then leave"`; a description with a newline is quoted; labels `Home` and `Work` give `Home; Work`; a checklist of 2 done of 5 gives `2/5`; a title `=SUM(A1)` is written `'=SUM(A1)`, and the same for `+`, `-`, `@`, a tab and a carriage return; a Hindi title is written as is.
- `toIcs`: begins `BEGIN:VCALENDAR` with `PRODID:-//Task Manager//todo-pwa//EN`, every line ends with CRLF, and no line is longer than 75 octets (a 300-character Hindi title is folded on UTF-8 boundaries).
- `toIcs`: a todo task `t1` on `2026-11-06` at `17:00` in `Asia/Kolkata` gives `UID:t1@todo.spanion.in`, `DTSTART;TZID=Asia/Kolkata:20261106T170000` and `DURATION:PT30M`; one without a time gives `DTSTART;VALUE=DATE:20261106`; an undated task and a done task give no event.
- `toIcs`: a title `a;b,c\d` is written `a\;b\,c\\d`, and a newline as `\n`.
- `toIcs` RRULEs: daily interval 3 → `FREQ=DAILY;INTERVAL=3`; every 2 weeks on Mon and Wed until `2026-12-31` → `FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;UNTIL=20261231`; monthly from the 31st → `FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=28,29,30,31;BYSETPOS=-1`; monthly from the 5th → `FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=5`; yearly from 29 Feb → `FREQ=YEARLY;INTERVAL=1;BYMONTH=2;BYMONTHDAY=28,29;BYSETPOS=-1`.
- `parseImportFile` refuses `too-big` for a byte length of 5 MB + 1 without parsing it, `not-json` for `{`, `wrong-app` for `app: 'other'`, `wrong-version` for `version: 2`, and `too-many` for 2001 tasks or 501 labels.
- `parseImportFile` on a file with 3 good tasks, a task with a 201-character title, one with `priority: 'urgent'` and one with `repeat: { freq: 'hour' }` returns 3 tasks and `skippedTasks: 3`; a task with an extra key `uid: 'someone-else'` is accepted with that key ignored.
- `parseImportFile` keeps each task's old label ids and old `seriesId` for the importer to map, and gives `status` as exported.
- A round trip: `parseImportFile` of `toExportJson`'s output accepts every task and label it was made from.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `src/lib/exportFormats.test.ts` and `src/lib/importFile.test.ts`. Create both modules with their real signatures first.

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/lib/exportFormats.test.ts src/lib/importFile.test.ts`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation** to the Interfaces, and add the strings to both `profile.json` files

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/lib/exportFormats.test.ts src/lib/importFile.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/exportFormats.ts src/lib/exportFormats.test.ts src/lib/importFile.ts src/lib/importFile.test.ts src/i18n/locales/en/profile.json src/i18n/locales/hi/profile.json
git commit -m "feat(profile): export formats and import parsing"
```

### Task 2: Export and import on Profile

**Files:**
- Create: `src/services/importer.ts`
- Create: `src/services/importer.test.ts`
- Create: `src/components/profile/YourData.vue`
- Create: `src/components/profile/ImportDialog.vue`
- Create: `src/components/profile/ImportDialog.test.ts`
- Modify: `src/views/ProfileView.vue` (places `YourData`)

**Interfaces:**
- Consumes: `toExportJson`, `toCsv`, `toIcs`, `exportFileName`, `parseImportFile`, `ImportPlan` and the strings `data.*` and `import.*` (Task 1); existing `requireUid`, `newSeriesId`, `normalise`-backed `createTask` field rules, `storedFields`, the tasks and labels stores' `load`, `ui.showSnack`.
- Produces:

```ts
// src/services/importer.ts
export interface ImportResult { tasks: number; labels: number; failed: boolean }
/** Labels first, then tasks, in batches of 500, with new ids; stops at the first failed batch. */
export function runImport(uid: string, plan: Extract<ImportPlan, { ok: true }>): Promise<ImportResult>;

// src/components/profile/YourData.vue: the section; it holds a `#delete` slot that Task 3 fills
// src/components/profile/ImportDialog.vue
defineProps<{ plan: ImportPlan | null }>();
defineEmits<{ close: []; imported: [result: ImportResult] }>();
```

**Spec:**
- §2 E1: "While tasks are still loading, or failed to load, the export buttons are disabled with the load's own message."
- §2 I4: "On Import, labels are created first, each with a new id; then tasks, each with a new id and its `labelIds` mapped to the new label ids (an id with no imported label is dropped), and each old `seriesId` mapped to one new `seriesId`."
- §2 I4: "`spawnedNext` is `true` for a done task and `false` for a todo one, so reopening an imported done occurrence creates nothing."
- §2 I4: "A batch that fails stops the import: what was written stays, and the dialog says how many tasks and labels were added before it stopped."
- §2 I5: "The tasks and labels stores load again"

**Tags:** `security`, `failure-paths`, `screen`

**Knowledge:**
- `features/profile-and-labels`: Profile has a "Your data" section with JSON, CSV and .ics export and JSON import.
- `features/data-and-account` (new): an import adds labels then tasks with new ids, re-links labels and series, and stops at a failed batch.

**Acceptance:**
- Export as JSON downloads `tasks-2026-11-03.json` (today `2026-11-03`) holding `toExportJson` of the loaded tasks and labels; CSV and .ics download `tasks-2026-11-03.csv` and `.ics`. No network request is made.
- While the tasks store is loading, or its `error` is `load-failed`, the three export buttons are disabled.
- Choosing a file opens the preview: for 12 tasks, 3 labels and 2 skipped it says "12 tasks and 3 labels will be added.", "2 tasks can't be imported and will be skipped." and "Importing the same file twice adds everything twice."
- A refused file shows its message (for example "This file is larger than 5 MB.") and no Import button.
- `runImport` against the emulator: two labels with old ids `a` and `b` and a task with `labelIds: ['a', 'zz']` produce two new labels and a task whose `labelIds` is the new id of `a` only; every new id differs from the file's; `uid` is the importing user's.
- Two tasks sharing old `seriesId` `s1` get the same new `seriesId`, different from `s1`; a done task gets `spawnedNext: true` and `notifyAt: null`; a todo one `spawnedNext: false` and `notifyAt` from its date and `remindBefore`.
- 1,200 tasks are written in three batches.
- When the second batch is refused, `runImport` returns `failed: true` with the counts written so far, and the dialog says "Couldn't finish the import: 500 tasks and 3 labels were added."
- After a successful import the stores load again and the snackbar says "Imported 12 tasks and 3 labels.".

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `src/services/importer.test.ts` and `src/components/profile/ImportDialog.test.ts`. Create the service and components with their real signatures first.

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/services/importer.test.ts src/components/profile/ImportDialog.test.ts`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation**: the importer, the section with its export buttons and file picker, the preview dialog, and Profile placing the section

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/services/importer.test.ts src/components/profile/ImportDialog.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/importer.ts src/services/importer.test.ts src/components/profile/YourData.vue src/components/profile/ImportDialog.vue src/components/profile/ImportDialog.test.ts src/views/ProfileView.vue
git commit -m "feat(profile): export as JSON, CSV and .ics, and import from JSON"
```

### Task 3: Delete account on Profile

**Files:**
- Create: `src/services/account.ts`
- Create: `src/services/account.test.ts`
- Create: `src/components/profile/DeleteAccountDialog.vue`
- Create: `src/components/profile/DeleteAccountDialog.test.ts`
- Modify: `src/components/profile/YourData.vue` (fills its `#delete` slot)

**Interfaces:**
- Consumes: the strings `delete.*` (Task 1); `YourData.vue`'s `#delete` slot (Task 2); existing Google provider set-up in `src/services/auth.ts`, the sign-out path's device clean-up in `src/pwa/useMessaging.ts`, the router and `ui.showSnack`.
- Produces:

```ts
// src/services/account.ts
export type AccountProof = { kind: 'password'; password: string } | { kind: 'google' };
/** Re-authenticates the signed-in user; rejects with the Firebase error code. */
export function reauthenticate(proof: AccountProof): Promise<void>;
/** Deletes the signed-in Auth user. */
export function deleteAccount(): Promise<void>;
/** 'password' or 'google', from the user's providers. */
export function accountProofKind(): 'password' | 'google';
```

**Spec:**
- §2 D1: "Then they type `DELETE`; the Delete button is enabled only when both are done."
- §2 D2: "re-authenticates with what was given; a wrong password or a closed popup says so and stops"
- §2 D2: "turns push off for this browser, as sign-out does (its device document and token)"
- §2 D2: "If step 3 fails, nothing more happens and the dialog says"

**Tags:** `security`, `failure-paths`, `screen`

**Knowledge:**
- `features/data-and-account` is written by Task 2; this task's facts go to `security/auth`: deleting an account re-authenticates (password or Google), turns push off for the browser, then deletes the Auth user.

**Acceptance:**
- For an email account the dialog shows a Password field; for a Google account a "Continue with Google" button.
- Delete account stays disabled until the proof is given and the field holds exactly `DELETE`; `delete` and `DELETE ` (trailing space) don't enable it.
- A wrong password says "That password is wrong." and doesn't delete; a closed Google popup says "Confirming your account was cancelled.".
- On success, in order: re-authentication, push turned off for this browser (its device document deleted), the Auth user deleted; then the app is at `/signin` and the snackbar says "Your account was deleted.".
- When deleting the Auth user fails, the dialog says "Couldn't delete your account. Try again." and the user stays signed in.
- Against the auth emulator: `reauthenticate` with the right password resolves, with a wrong one rejects with `auth/wrong-password` or `auth/invalid-credential`; `deleteAccount` removes the user, and signing in again fails.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `src/services/account.test.ts` and `src/components/profile/DeleteAccountDialog.test.ts`. Create the service and dialog with their real signatures first.

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/services/account.test.ts src/components/profile/DeleteAccountDialog.test.ts`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation**: the account service, the dialog, and its button in the section's `#delete` slot

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/services/account.test.ts src/components/profile/DeleteAccountDialog.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/account.ts src/services/account.test.ts src/components/profile/DeleteAccountDialog.vue src/components/profile/DeleteAccountDialog.test.ts src/components/profile/YourData.vue
git commit -m "feat(profile): delete the account after confirming who you are"
```

### Task 4: The function that erases a deleted user's data

**Files:**
- Create: `functions/src/deleteUserData.ts`
- Create: `functions/src/deleteUserData.test.ts`
- Modify: `functions/src/index.ts`
- Modify: `functions/src/reminders.test.ts` (the entry-point test lists `deleteUserData`)

**Interfaces:**
- Consumes: existing Admin SDK initialisation in `functions/src/index.ts`; the collection names `tasks`, `types`, `notifications`, `users/{uid}/devices`, `users/{uid}` and `fcm/{uid}`.
- Produces:

```ts
// functions/src/deleteUserData.ts
/** Deletes every document of `uid`, in batches of 500; resolves with how many it deleted. Safe to run twice. */
export function eraseUserData(db: Firestore, uid: string): Promise<number>;
/** firebase-functions/v1 auth.user().onDelete, retried by the platform on failure. */
export const deleteUserData: CloudFunction<UserRecord>;
```

**Spec:**
- §2 D3: "deletes with the Admin SDK every document whose `uid` is the deleted user's in `tasks`, `types` and `notifications`, every document under `users/{uid}/devices`, `users/{uid}` itself, and the old app's `fcm/{uid}`, in batches of `500`."
- §2 D3: "Running it again on the same uid deletes nothing more and succeeds. A failure is logged by error code and the function is retried by the platform."
- §2 D4: "lists `deleteUserData` on purpose, and still fails on any HTTP or callable export."

**Tags:** `security`, `failure-paths`

**Knowledge:**
- `apps/functions`: the package also exports `deleteUserData`, on Auth's user-deletion event, which erases the user's documents; still nothing answers HTTP.
- `security/data-protection`: a deleted account's tasks, labels, notifications, devices and old `fcm` document are erased by `deleteUserData`.

**Acceptance:**
- With Alice's and Bob's data seeded in every collection (tasks, types, notifications, devices, `users/{uid}`, `fcm/{uid}`), `eraseUserData(db, aliceUid)` deletes every one of Alice's documents and none of Bob's.
- With 1,201 of Alice's tasks, every one is deleted, and the batches each hold at most 500 writes.
- A second `eraseUserData` for Alice resolves with `0`.
- `deleteUserData` passes the event's `uid` to `eraseUserData`.
- When a batch fails, the error is logged by its code (not its message) and the function rejects, so the platform retries it.
- The entry-point test lists exactly `deleteUserData`, `sendReminders` and `stopBillingOnBudget`; none has an `httpsTrigger` or `callableTrigger`, and `deleteUserData` has an event trigger.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `functions/src/deleteUserData.test.ts` and `functions/src/reminders.test.ts`. Create the module with its real signatures first.

- [ ] **Step 2: Run them to verify they fail**

Run: `npm --prefix functions run test -- src/deleteUserData.test.ts src/reminders.test.ts`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation**: `eraseUserData`, the trigger, and the export from `functions/src/index.ts`

- [ ] **Step 4: Run them to verify they pass**

Run: `npm --prefix functions run test -- src/deleteUserData.test.ts src/reminders.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add functions/src/deleteUserData.ts functions/src/deleteUserData.test.ts functions/src/index.ts functions/src/reminders.test.ts
git commit -m "feat(functions): erase a deleted user's data"
```
