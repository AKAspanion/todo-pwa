# Board fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:implement-with-subagents by default, or ga:implement. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The edit form checks the title and description limits, a deleted or completed task can be undone from the snackbar, and the Done column can be cleared in one go.

**Architecture:** One foundation task adds the shared limits module, the restore and batch functions in the tasks service and store, and every new string. Three slices then build on it: the edit form's limits, undo on the board, and Clear done. Firestore rules don't change: a restore is an ordinary create under the task's old id.

**Tech Stack:** Vue 3.5 (`<script setup lang="ts">`), Vuetify 4, Pinia (the tasks store is an options store), vue-i18n 11, Firebase 13 modular SDK (`setDoc`, `writeBatch`), Vitest against the Firebase Emulator Suite, `@vue/test-utils`.

**Spec:** `docs/specs/2026-11-03-board-fixes.md`

## Global Constraints

- §2 B1: "The title must be 1–`200` characters after trimming and the description at most `5000`, counted as code points, as the rules count them."
- §2 B2: Undo is offered "for `UNDO_TIMEOUT_MS = 8000`".
- §2 B4: deletes go "in Firestore batches of at most `500` writes (Firestore's limit per batch)".
- §2 B6: "None of these writes times out or retries"; "Undo is a new write the user asks for, not a retry."
- §2 B7: every new string goes in `src/i18n/locales/en/tasks.json` and `src/i18n/locales/hi/tasks.json`, with the same keys.
- No change to `firestore.rules`.

## Checkpoints

None (`run.checkpoints: none`). The run stops only where the developer names a stop.

---

### Task 1: Shared limits, restore and batch writes, and the new strings

**Files:**
- Create: `src/lib/taskLimits.ts`
- Test: `src/lib/taskLimits.test.ts`
- Modify: `src/views/TaskAddView.vue` (import the limits instead of declaring them, lines 27–29 and 68–77)
- Modify: `src/services/tasks.ts`
- Test: `src/services/tasks.test.ts`
- Modify: `src/stores/tasks.ts`
- Test: `src/stores/tasks.test.ts`
- Test: `tests/rules/firestore.rules.test.ts`
- Modify: `src/i18n/locales/en/tasks.json`
- Modify: `src/i18n/locales/hi/tasks.json`

**Interfaces:**
- Consumes: existing `storedFields`, `taskFromDoc`, `db` in `src/services/tasks.ts`; existing `currentUid()` and `errorCode()` from `src/stores/session.ts`.
- Produces:

```ts
// src/lib/taskLimits.ts
export const TITLE_MAX = 200;
export const DESCRIPTION_MAX = 5000;
/** Characters as a person counts them (code points), as the rules count them. */
export function charCount(value: string): number;

// src/services/tasks.ts
export const BATCH_MAX = 500;
/** code 'task/batch-failed'; committedIds are the ids in the chunks committed before the failure. */
export class TaskBatchError extends Error {
  readonly code: 'task/batch-failed';
  readonly committedIds: string[];
}
export function restoreTask(task: Task): Promise<void>;
export function deleteTasks(ids: string[]): Promise<void>;
export function restoreTasks(tasks: Task[]): Promise<void>;

// src/stores/tasks.ts (actions)
restore(task: Task): Promise<void>;
removeMany(ids: string[]): Promise<void>;
restoreMany(tasks: Task[]): Promise<void>;
```

New keys in `tasks.json`, English then Hindi:

| Key | en | hi |
|---|---|---|
| `form.titleTooLong` | `Keep the title under 200 characters` | `शीर्षक 200 अक्षरों से कम रखें` |
| `form.descriptionTooLong` | `Keep the description under 5000 characters` | `विवरण 5000 अक्षरों से कम रखें` |
| `undo` | `Undo` | `पहले जैसा करें` |
| `toast.markedDone` | `Marked done` | `पूरा हुआ चिह्नित किया` |
| `toast.clearedDone` | `No tasks deleted \| {n} task deleted \| {n} tasks deleted` | `कोई कार्य नहीं हटाया गया \| {n} कार्य हटाया गया \| {n} कार्य हटाए गए` |
| `clear.button` | `Clear` | `साफ़ करें` |
| `clear.label` | `Delete the done tasks shown` | `दिखाए गए पूरे कार्य हटाएँ` |
| `clear.question` | `Delete {n} done tasks? \| Delete {n} done task? \| Delete {n} done tasks?` | `{n} पूरे कार्य हटाएँ? \| {n} पूरा कार्य हटाएँ? \| {n} पूरे कार्य हटाएँ?` |
| `clear.confirm` | `Delete` | `हटाएँ` |
| `clear.cancel` | `Cancel` | `रद्द करें` |
| `errors.restore` | `Couldn't bring back what was deleted. Try again.` | `हटाया गया वापस नहीं लाया जा सका। फिर से कोशिश करें।` |
| `errors.clear` | `Couldn't delete every done task. Try again.` | `सभी पूरे कार्य हटाए नहीं जा सके। फिर से कोशिश करें।` |

`toast.deleted` (`Task deleted`) already exists and is reused. The card's `card.confirmDelete`, `card.keep` and `card.confirm` stay until Task 3 removes their last use.

**Spec:**
- §2 B1: "`TITLE_MAX`, `DESCRIPTION_MAX` and the count move from `src/views/TaskAddView.vue` to one module, `src/lib/taskLimits.ts`, used by the add screen and by `src/components/tasks/TaskEditForm.vue`."
- §2 B2: "Undo writes the task back as it was when it was deleted, under the **same document id**, so a notification's `taskId` still finds it. The restore writes exactly the stored task fields (`storedFields` in `src/services/tasks.ts`), so an old task comes back in the new shape. Its `remindAt` and `reminded` are kept"
- §2 B4: "those tasks are deleted in Firestore batches of at most `500` writes (Firestore's limit per batch)."
- §2 B4: "A batch that fails stops the rest: tasks from batches already committed stay deleted and leave the board, the others stay"
- §2 B5: "a restore runs only while the user who deleted is still signed in (`currentUid()` checked, as the store does for loads)."
- §3: "`deleteTasks(ids)` and `restoreTasks(tasks)` (`writeBatch`, chunks of `500`; a failed chunk rejects with a `task/batch-failed` error carrying the ids of the chunks already committed, `committedIds`)."
- §3: "`restore(task)`, `removeMany(ids)`, `restoreMany(tasks)`. Each changes the store only for what was saved, per the store's existing rule."
- §4: "`setDoc` under an id whose document still exists is an update, which the update rule allows only to its owner, so a restore can't overwrite another user's task."

**Tags:** `security`, `failure-paths`

**Knowledge:**
- `data/task`: a deleted task can be written back under its old id by its owner, with every stored field, through the ordinary create rule.
- `features/add-task`: the title and description limits are `TITLE_MAX` and `DESCRIPTION_MAX` in `src/lib/taskLimits.ts`, shared with the edit form.

**Acceptance:**
- Given `"a".repeat(200)`, `charCount` is `200`; given `"😀".repeat(3)`, it is `3`, not `6`.
- Given the add screen, a title of 201 characters still shows "Keep the title under 200 characters", as before the move.
- Given Alice's task deleted with `deleteTask`, when `restoreTask` runs with the task as it was, then the document exists again under the same id with exactly the fields `storedFields` gives, its `remindAt` and `reminded` unchanged.
- Given a legacy task carrying `type` and `id` fields, when it is deleted and restored, then the restored document has neither field.
- Given 501 of Alice's tasks, when `deleteTasks` runs on their ids, then none remain; when `restoreTasks` runs on them, then all 501 exist again under their ids.
- Given a chunk that the rules refuse (one id in the second chunk belongs to Bob), when `deleteTasks` runs on 501 ids, then it rejects with `code` `'task/batch-failed'` and `committedIds` holding exactly the first 500 ids, and those 500 are deleted.
- Rules: Alice may create a task with every task field under a chosen id such as `restored-1`; Bob may not create a document with Alice's `uid` under a chosen id; Alice's `setDoc` over Bob's existing task id is denied.
- Store `restore`: given the signed-in user is the task's owner, the task is back in `tasks` after the save; given the save rejects, `tasks` is unchanged and the call rejects; given the user signed out (or another user signed in) before the call, nothing is written and `tasks` is unchanged.
- Store `removeMany`: given every chunk succeeds, every id leaves `tasks`; given a `TaskBatchError` with `committedIds` `[a, b]`, only `a` and `b` leave `tasks`, and the call rejects with that error.
- Store `restoreMany`: given success, every task is back in `tasks` once; given a `TaskBatchError`, only the committed ones are added, and the call rejects.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `src/lib/taskLimits.test.ts`, `src/services/tasks.test.ts`, `src/stores/tasks.test.ts` and `tests/rules/firestore.rules.test.ts`. Create `src/lib/taskLimits.ts` and the new service and store functions with their real signatures first, so the tests fail on behaviour.

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/lib/taskLimits.test.ts src/services/tasks.test.ts src/stores/tasks.test.ts tests/rules/firestore.rules.test.ts -t "restore|deleteTasks|restoreTasks|removeMany|restoreMany|charCount|chosen id"`
Expected: FAIL on the assertions. The rules cases for Alice may already pass: the create rule allows a chosen id. Bob's cases must fail only if the rules allow them, which would be a defect to report, not to fix in the rules.

- [ ] **Step 3: Write the minimal implementation** to the Interfaces, add the strings to both `tasks.json` files, and point `src/views/TaskAddView.vue` at `src/lib/taskLimits.ts`

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/lib/taskLimits.test.ts src/services/tasks.test.ts src/stores/tasks.test.ts tests/rules/firestore.rules.test.ts -t "restore|deleteTasks|restoreTasks|removeMany|restoreMany|charCount|chosen id"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/taskLimits.ts src/lib/taskLimits.test.ts src/views/TaskAddView.vue src/services/tasks.ts src/services/tasks.test.ts src/stores/tasks.ts src/stores/tasks.test.ts tests/rules/firestore.rules.test.ts src/i18n/locales/en/tasks.json src/i18n/locales/hi/tasks.json
git commit -m "feat(tasks): shared limits, restore and batch delete for tasks"
```

### Task 2: The edit form checks the limits

**Files:**
- Modify: `src/components/tasks/TaskEditForm.vue`
- Create: `src/components/tasks/TaskEditForm.test.ts`

**Interfaces:**
- Consumes: `TITLE_MAX`, `DESCRIPTION_MAX`, `charCount` from `src/lib/taskLimits.ts` (Task 1); the strings `tasks.form.titleTooLong` and `tasks.form.descriptionTooLong` (Task 1).
- Produces: nothing new; `TaskEditForm` keeps its props and its `submit` and `cancel` events.

**Spec:**
- §2 B1: "The edit form shows a counter on the title and a"
- §2 B1: "message under each field, and doesn't submit while either is over."

**Tags:** `failure-paths`

**Knowledge:**
- `risks/debt`: the edit form checks the title and description limits, so that item no longer applies.
- `data/task`: the edit form checks the same title and description limits as the add screen before sending.

**Acceptance:**
- Given a title of 201 characters, the form shows "Keep the title under 200 characters" under the title, and pressing Save emits no `submit`.
- Given a title of exactly 200 characters with spaces before and after it, Save emits `submit` with the trimmed title.
- Given a title of 199 `a`s and one `😀`, the count is 200 and Save emits `submit`.
- Given a description of 5,001 characters, the form shows "Keep the description under 5000 characters" and Save emits no `submit`; given exactly 5,000, Save emits `submit`.
- The title field shows a counter out of `200`.
- Given an empty title, "Enter the task's title" still shows after Save, as before.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `src/components/tasks/TaskEditForm.test.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/components/tasks/TaskEditForm.test.ts`
Expected: FAIL on the too-long and counter cases

- [ ] **Step 3: Write the minimal implementation**: the counter and the two messages in `TaskEditForm.vue`, with Save refusing while either is over

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/components/tasks/TaskEditForm.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/tasks/TaskEditForm.vue src/components/tasks/TaskEditForm.test.ts
git commit -m "fix(tasks): the edit form checks the title and description limits"
```

### Task 3: Undo after delete and after marking done

**Files:**
- Modify: `src/components/tasks/TaskCard.vue` (remove the `delete` mode)
- Modify: `src/components/tasks/TaskCard.test.ts` (the "asks before deleting" case becomes "deletes at once")
- Modify: `src/components/tasks/TaskBoard.vue`
- Modify: `src/components/tasks/TaskBoard.test.ts`
- Modify: `src/i18n/locales/en/tasks.json` (remove `card.confirmDelete`, `card.keep`, `card.confirm`)
- Modify: `src/i18n/locales/hi/tasks.json` (the same three keys)

**Interfaces:**
- Consumes: `restore(task)` on the tasks store (Task 1); the strings `undo`, `toast.markedDone` and `errors.restore` (Task 1); existing `ui.showSnack(text, { actionLabel, action, timeoutMs })` in `src/stores/ui.ts`.
- Produces, in `src/components/tasks/TaskBoard.vue`:

```ts
/** How long an Undo stays on offer. */
const UNDO_TIMEOUT_MS = 8000;
```

**Spec:**
- §2 B2: "The card's delete button deletes at once; the card's"
- §2 B2: "step is removed. When the delete succeeds, the snackbar says the task was deleted and offers **Undo** for `UNDO_TIMEOUT_MS = 8000`."
- §2 B2: "A failed restore shows an error in the snackbar and nothing else changes."
- §2 B3: "When a task moves from Todo to Done, by its check button or by a drag, and the save succeeds, the snackbar says it was marked done and offers **Undo** for `UNDO_TIMEOUT_MS`. Undo moves it back to Todo through the same status change the check button makes. Moving a task from Done back to Todo offers no undo."
- §2 B5: "A new message replaces the one shown, and the undo it offered is gone"
- §2 B6: "While a delete, a restore or a status change for a task is in flight, its card is pending, as today"
- §2 B7: "strings (`tasks.card.confirmDelete`, `keep`, `confirm`) are removed."

**Tags:** `failure-paths`, `screen`

**Knowledge:**
- `features/task-board`: deleting a task happens at once and the snackbar offers Undo for `UNDO_TIMEOUT_MS = 8000`, restoring it under the same id; marking a task done offers Undo too.

**Acceptance:**
- Given a card, pressing its "Delete task" button emits `remove` at once; no "Delete this task?" text appears.
- Given a delete that succeeds, the snackbar says "Task deleted" with an "Undo" action and a timeout of `8000`.
- Given that snack, pressing Undo calls the store's `restore` with the task as the board had it before the delete, and the card is pending until it answers.
- Given a restore that rejects, the snackbar says "Couldn't bring back what was deleted. Try again." and offers no Undo.
- Given a delete that fails, the snackbar says "Couldn't delete the task. Try again." and offers no Undo, as before.
- Given a todo task, when its check button marks it done and the save succeeds, the snackbar says "Marked done" with "Undo" and a timeout of `8000`; pressing Undo saves `status: 'todo'` for it.
- Given a todo task dragged to Done, the same "Marked done" snack with Undo appears.
- Given a done task moved back to Todo, no snack with Undo appears.
- Given a status change that fails, the snackbar says "Couldn't save. Try again." and offers no Undo, as before.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `src/components/tasks/TaskBoard.test.ts` and `src/components/tasks/TaskCard.test.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/components/tasks/TaskBoard.test.ts src/components/tasks/TaskCard.test.ts -t "Undo|undo|deletes at once|Marked done"`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation**: remove the card's `delete` mode, add the two undo snacks in `TaskBoard.vue`, and remove the three unused strings from both `tasks.json` files

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/components/tasks/TaskBoard.test.ts src/components/tasks/TaskCard.test.ts -t "Undo|undo|deletes at once|Marked done"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/tasks/TaskCard.vue src/components/tasks/TaskCard.test.ts src/components/tasks/TaskBoard.vue src/components/tasks/TaskBoard.test.ts src/i18n/locales/en/tasks.json src/i18n/locales/hi/tasks.json
git commit -m "feat(board): undo after deleting a task or marking it done"
```

### Task 4: Clear done

**Files:**
- Create: `src/components/tasks/ClearDoneDialog.vue`
- Modify: `src/components/tasks/TaskColumn.vue`
- Modify: `src/components/tasks/TaskBoard.vue`
- Create: `src/components/tasks/TaskBoard.clear.test.ts`

**Interfaces:**
- Consumes: `removeMany(ids)` and `restoreMany(tasks)` on the tasks store and `TaskBatchError` from `src/services/tasks.ts` (Task 1); the strings `clear.*`, `toast.clearedDone`, `undo`, `errors.clear` and `errors.restore` (Task 1); `UNDO_TIMEOUT_MS` in `src/components/tasks/TaskBoard.vue` (Task 3, same file).
- Produces:

```ts
// src/components/tasks/ClearDoneDialog.vue
defineProps<{ modelValue: boolean; count: number }>();
defineEmits<{ 'update:modelValue': [open: boolean]; confirm: [] }>();

// src/components/tasks/TaskColumn.vue, added
defineProps<{ /* existing props */ clearing: boolean }>();
defineEmits<{ /* existing events */ clear: [] }>();
```

**Spec:**
- §2 B4: "The Done column's heading has a **Clear** button while the column shows at least one task."
- §2 B4: "in a dialog, N being the tasks the column shows under the current search and label filter"
- §2 B4: "Then the snackbar says how many were deleted and offers **Undo**, which restores them all as in B2, also in batches."
- §2 B4: "A batch that fails stops the rest: tasks from batches already committed stay deleted and leave the board, the others stay, and the snackbar shows an error with no Undo."
- §2 B6: "The Clear button is disabled while a clear or its undo is in flight."

**Tags:** `failure-paths`, `screen`

**Knowledge:**
- `features/task-board`: the Done column's Clear button deletes the done tasks it shows under the current search and label filter, after asking with their count, and offers Undo.

**Acceptance:**
- Given the Done column shows 3 tasks, its heading has a "Clear" button labelled "Delete the done tasks shown"; given it shows none, or the board shows skeletons, there is no Clear button.
- Given 3 done tasks shown, pressing Clear opens a dialog asking "Delete 3 done tasks?"; given 1, it asks "Delete 1 done task?".
- Given the dialog, Cancel closes it and calls no store action.
- Given the dialog, Delete calls `removeMany` with exactly the ids the Done column shows (not done tasks hidden by the search or label filter), and the snackbar then says "3 tasks deleted" with "Undo" and a timeout of `8000`.
- Given that snack, Undo calls `restoreMany` with the same 3 tasks as the board had them.
- Given `removeMany` rejects with a `TaskBatchError`, the snackbar says "Couldn't delete every done task. Try again." with no Undo.
- Given `restoreMany` rejects, the snackbar says "Couldn't bring back what was deleted. Try again."
- Given a clear or its Undo in flight, the Clear button is disabled.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `src/components/tasks/TaskBoard.clear.test.ts`. Create `ClearDoneDialog.vue` with its real props and events first.

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/components/tasks/TaskBoard.clear.test.ts`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation**: the dialog, the Clear button in `TaskColumn.vue`, and the clear and undo flow in `TaskBoard.vue`

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/components/tasks/TaskBoard.clear.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/tasks/ClearDoneDialog.vue src/components/tasks/TaskColumn.vue src/components/tasks/TaskBoard.vue src/components/tasks/TaskBoard.clear.test.ts
git commit -m "feat(board): clear the done tasks shown, with undo"
```
