# Spec: Task fields — priority and checklists

_2026-11-03 · status: approved 2026-11-03 · part 5 of [decisions/usability-roadmap](../../knowledge/decisions/usability-roadmap.md) · decisions: [decisions/task-priority-and-checklist](../../knowledge/decisions/task-priority-and-checklist.md) · builds after part 4, `docs/plans/2026-11-03-calendar-move-and-add.md`_

## §1 Goal

A task can be marked low, medium or high priority, which shows on it and orders it within its day, and can carry a
checklist whose items are ticked off on the card.

## §2 Behaviour

### Priority

**P1 Levels.** `priority` is one of `'none'`, `'low'`, `'medium'`, `'high'`. A new task is `'none'` unless the
user picks one. A task stored without the field, or with any other value, reads as `'none'`.

**P2 Setting it.** The add screen and the edit form have a priority control with the four levels, named None, Low,
Medium, High. Quick add (part 3) and a calendar move (part 4) leave priority as it is (`'none'` for a new task).

**P3 Showing it.** A task with priority shows a flag icon on its card, beside its title, and in the calendar's
task details: High in the theme's error colour, Medium in warning, Low in info; `'none'` shows nothing. The icon
has an accessible name, "High priority", "Medium priority" or "Low priority".

**P4 Filter.** Home has priority chips, High, Medium and Low, beside the label chips. With any selected, Home shows
only tasks with one of the selected priorities; with none selected, every task. It combines with search, labels
and the view as they combine with each other.

**P5 Order.** Every list on Home (the views, the Overdue group and Done) is ordered:

1. undated tasks last;
2. then by date, earliest first;
3. then by priority, `high`, `medium`, `low`, `none`;
4. then by time, earliest first, a task without a time last in its group.

This replaces "by date, then time" (D9 of `docs/specs/2026-11-02-modernize-and-fix.md`). Undated tasks are ordered
by priority alone. The calendar is unaffected: it places tasks by date and time.

### Checklists

**C1 The field.** `checklist` is a list of at most `CHECKLIST_MAX_ITEMS = 50` items, each
`{ id: string, text: string, done: boolean }`, with `text` 1–`CHECKLIST_TEXT_MAX = 200` characters after trimming
(code points, as part 1's `charCount`). `id` is made by the app when the item is added, and only identifies the
item within its task. A new task's checklist is empty unless the user adds items.

**C2 Editing items.** The add screen and the edit form have a checklist editor: an "Add an item" field (Enter adds
it), and for each item its text, editable, a checkbox, and a remove button. Items keep the order they were added
in; there is no reordering. Over `CHECKLIST_MAX_ITEMS` the add field is disabled and says so; an item over
`CHECKLIST_TEXT_MAX` says it is too long and isn't added.

**C3 On the card.** A task with a checklist shows "2/5" (done/total) with a checklist icon. Pressing it expands the
items on the card, each with a checkbox; pressing it again collapses them. Ticking a box saves the task's
checklist at once through the store's `update`; while that save is in flight the boxes are disabled; if it fails,
the box goes back and the snackbar says "Couldn't save. Try again.". It never times out or retries.

**C4 Done and checklist are separate.** Ticking every item doesn't mark the task done, and marking the task done
doesn't tick its items. A done task's checklist is shown but can't be ticked.

**C5 Calendar details.** The calendar's task details list the checklist items with their state, read-only.

### Storage and rules

**R1 Stored fields.** `priority` and `checklist` join the task's stored fields (`storedFields` in
`src/services/tasks.ts`, `taskFields()` in `firestore.rules`). Every create carries them; an edit, a restore
(part 1) and a move (part 4) write them as the task has them.

**R2 Rules.** `firestore.rules` checks `priority in ['none', 'low', 'medium', 'high']` and `checklist is list`
with `checklist.size() <= 50`. The rules can't check each item; the app checks every item against C1 before
saving (`normalise` in `src/services/tasks.ts`), dropping any that fail.

**R3 Reading.** `taskFromDoc` (`src/services/legacy.ts`) reads `priority` as P1 says, and `checklist` keeping only
items that are maps with a string `id`, a string `text` of 1–`200` characters and a boolean `done`, at most the
first `50`. A missing or malformed `checklist` reads as empty. Nothing stored changes until the task is next saved.

### Text

**X1** New strings go in `src/i18n/locales/{en,hi}/tasks.json` (and `add.json` and `calendar.json` where those
screens need them), with the same keys in both.

## §3 Design

- `src/types/models.ts`: `type Priority = 'none' | 'low' | 'medium' | 'high'`;
  `interface ChecklistItem { id: string; text: string; done: boolean }`; `Task` gains `priority` and `checklist`;
  `TaskInput` gains them as optional, so existing callers that don't set them keep working.
- `src/lib/taskLimits.ts` (part 1): `CHECKLIST_MAX_ITEMS`, `CHECKLIST_TEXT_MAX`, and `cleanChecklist(items)`.
- `src/stores/tasks.ts`: `compareTasks` per P5; the filter gains `priorities: Priority[]`.
- `src/components/tasks/PriorityFlag.vue`, `PriorityPicker.vue`, `ChecklistEditor.vue`, `ChecklistOnCard.vue`.

## §4 Security and hostile input

- A client could write checklist items of any shape, up to `50`, to its own tasks; the rules only bound the count.
  Reading drops malformed items, the app never renders item text as HTML (plain text only), and the document's own
  1 MiB limit bounds the size. Another user can't write to the task at all.
- `priority` is checked by the rules on every write that carries it.
- Item `id`s are random and never used as document ids or in a URL.

## §5 Tests

Written first, each run alone:

- `tests/rules/firestore.rules.test.ts`: a create without `priority` or `checklist` is refused; `priority:
  'urgent'` is refused; a checklist of `51` items is refused, of `50` allowed; an old task without either field can
  still be edited when the edit adds them.
- `src/services/legacy.test.ts`: R3's readings, including a non-list `checklist`, items with a
  number `text`, a missing `done`, and `60` items.
- `src/stores/tasks.test.ts`: P5's order, including two tasks on one day at `18:00` high and `09:00` low; P4's
  filter.
- Component tests for the picker, the flag, the editor (C2's limits) and the card's checklist (C3, C4).

## §6 Out of scope

Reordering items; due dates on items; turning items into tasks; priority on the calendar's events; sorting by
priority across dates.
