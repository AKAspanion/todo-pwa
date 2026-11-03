# Spec: Board fixes — edit-form limits, undo, clear done

_2026-11-03 · status: approved 2026-11-03 · part 1 of [decisions/usability-roadmap](../../knowledge/decisions/usability-roadmap.md) · decisions: [decisions/undo-instead-of-confirm](../../knowledge/decisions/undo-instead-of-confirm.md)_

## §1 Goal

Make the home board forgiving: an edit that is too long is caught in the form, a deleted or completed task can be
brought back with one tap, and done tasks can be cleared in one go. No new task fields and no change to
`firestore.rules`.

## §2 Behaviour

**B1 The edit form checks the limits.** The title must be 1–`200` characters after trimming and the description at
most `5000`, counted as code points, as the rules count them. `TITLE_MAX`, `DESCRIPTION_MAX` and the count move from
`src/views/TaskAddView.vue` to one module, `src/lib/taskLimits.ts`, used by the add screen and by
`src/components/tasks/TaskEditForm.vue`. The edit form shows a counter on the title and a "too long" message under
each field, and doesn't submit while either is over. This closes the edit-form item in
[risks/debt](../../knowledge/risks/debt.md).

**B2 Delete is undone, not confirmed.** The card's delete button deletes at once; the card's "Delete?" step is
removed. When the delete succeeds, the snackbar says the task was deleted and offers **Undo** for
`UNDO_TIMEOUT_MS = 8000`. Undo writes the task back as it was when it was deleted, under the **same document id**,
so a notification's `taskId` still finds it. The restore writes exactly the stored task fields (`storedFields` in
`src/services/tasks.ts`), so an old task comes back in the new shape. Its `remindAt` and `reminded` are kept: a
reminder whose moment passed meanwhile is not sent late ([domain/reminder-schedule](../../knowledge/domain/reminder-schedule.md)).
A failed restore shows an error in the snackbar and nothing else changes.

**B3 Marking done can be undone.** When a task moves from Todo to Done, by its check button or by a drag, and the
save succeeds, the snackbar says it was marked done and offers **Undo** for `UNDO_TIMEOUT_MS`. Undo moves it back to
Todo through the same status change the check button makes. Moving a task from Done back to Todo offers no undo.

**B4 Clear done.** The Done column's heading has a **Clear** button while the column shows at least one task. It
asks "Delete N done tasks?" in a dialog, N being the tasks the column shows under the current search and label
filter (the day filter never hides done tasks, [features/task-board](../../knowledge/features/task-board.md)). On
confirm, those tasks are deleted in Firestore batches of at most `500` writes (Firestore's limit per batch). Then
the snackbar says how many were deleted and offers **Undo**, which restores them all as in B2, also in batches.
A batch that fails stops the rest: tasks from batches already committed stay deleted and leave the board, the
others stay, and the snackbar shows an error with no Undo.

**B5 One undo at a time.** The snackbar holds one message. A new message replaces the one shown, and the undo it
offered is gone; the delete or status change it would have reversed has already been saved. Signing out clears the
snackbar (`$reset` in `src/stores/ui.ts`), and a restore runs only while the user who deleted is still signed in
(`currentUid()` checked, as the store does for loads).

**B6 In flight.** While a delete, a restore or a status change for a task is in flight, its card is pending, as
today (`pendingIds` in `src/components/tasks/TaskBoard.vue`). The Clear button is disabled while a clear or its
undo is in flight. None of these writes times out or retries ([decisions/saves-never-time-out](../../knowledge/decisions/saves-never-time-out.md));
Undo is a new write the user asks for, not a retry.

**B7 Text.** New strings go in `src/i18n/locales/en/tasks.json` and `src/i18n/locales/hi/tasks.json`, with the
same keys: the edit form's two "too long" messages, "Task deleted", "Marked done", "N tasks deleted" (plural),
"Undo", "Clear", the clear dialog's question and buttons, and the restore and clear errors. The card's unused
"Delete?" strings (`tasks.card.confirmDelete`, `keep`, `confirm`) are removed.

## §3 Design

- `src/lib/taskLimits.ts`: `TITLE_MAX`, `DESCRIPTION_MAX`, `charCount(value)`. Opens with a doc comment, per
  [project/conventions](../../knowledge/project/conventions.md).
- `src/services/tasks.ts`: `restoreTask(task)` (`setDoc` under `task.id`), `deleteTasks(ids)` and
  `restoreTasks(tasks)` (`writeBatch`, chunks of `500`; a failed chunk rejects with a `task/batch-failed` error
  carrying the ids of the chunks already committed, `committedIds`).
- `src/stores/tasks.ts`: `restore(task)`, `removeMany(ids)`, `restoreMany(tasks)`. Each changes the store only
  for what was saved, per the store's existing rule.
- `src/components/tasks/TaskBoard.vue`: the undo snack after delete and after done; the clear flow.
  `src/components/tasks/TaskColumn.vue`: the Clear button, emitting `clear`. `src/components/tasks/TaskCard.vue`:
  the `delete` mode removed. A small `ClearDoneDialog.vue` in `src/components/tasks/` for the confirmation.

## §4 Security and hostile input

- A restore is an ordinary create under the existing `tasks` create rule: every task field and nothing else, each
  validated, `uid` the caller's. No rule changes.
- `setDoc` under an id whose document still exists is an update, which the update rule allows only to its owner,
  so a restore can't overwrite another user's task.
- A batch of `500` is Firestore's own ceiling; a very long Done list is cleared in several batches, never one
  oversized write.

## §5 Tests

Written first, each run alone against the emulators:

- `src/lib/taskLimits.test.ts`: the limits and the code-point count.
- `src/components/tasks/TaskEditForm.test.ts`: an over-long title or description shows its message and doesn't
  submit.
- `src/services/tasks.test.ts`: `restoreTask` brings back the same id and fields; `deleteTasks` and
  `restoreTasks` work across more than one batch.
- `tests/rules/firestore.rules.test.ts`: an owner may re-create a task under a chosen id; another user may not.
- `src/components/tasks/TaskBoard.test.ts`: delete offers Undo and Undo restores; done offers Undo and Undo moves
  back; Clear asks with the count of shown done tasks and offers Undo.

## §6 Out of scope

Archiving done tasks (it needs a new field and rules, and may come with part 2, Views); undo for an edit; undo for
moving a task from Done to Todo.
