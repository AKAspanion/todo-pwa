# Task priority and checklist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:implement-with-subagents by default, or ga:implement. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A task carries a priority (none, low, medium, high) that shows as a flag and orders tasks within a day, and a checklist of up to 50 items ticked off on the card.

**Architecture:** One foundation task adds `priority` and `checklist` to the task's type, its stored fields, the security rules, the defensive reader and the store's order and filter. Two slices then build the UI: the add screen and edit form (picker and checklist editor), and the card, Home and the calendar details (flag, checklist on the card, priority filter).

**Tech Stack:** Vue 3.5 (`<script setup lang="ts">`), Vuetify 4, Pinia, vue-i18n 11, Firebase 13 modular SDK, Firestore security rules (`rules_version = '2'`), Vitest against the Firebase Emulator Suite with `@vue/test-utils`, Playwright for `e2e/add.spec.ts`.

**Spec:** `docs/specs/2026-11-03-task-priority-and-checklist.md`

**Builds after:** `docs/plans/2026-11-03-board-fixes.md` (`src/lib/taskLimits.ts`, `restoreTask`), `docs/plans/2026-11-03-home-views.md` (the views and the Overdue group), `docs/plans/2026-11-03-quick-capture.md` (quick add) and `docs/plans/2026-11-03-calendar-move-and-add.md` (moves, the details dialog's Move form). Their code is taken as already there.

## Global Constraints

- §2 P1: "`priority` is one of `'none'`, `'low'`, `'medium'`, `'high'`."
- §2 C1: "`checklist` is a list of at most `CHECKLIST_MAX_ITEMS = 50` items, each"
- §2 C1: "`text` 1–`CHECKLIST_TEXT_MAX = 200` characters after trimming"
- §2 C3: "It never times out or retries."
- §4: "the app never renders item text as HTML (plain text only)"
- New strings go in `src/i18n/locales/en/tasks.json` and `src/i18n/locales/hi/tasks.json`, with the same keys.

## Checkpoints

None (`run.checkpoints: none`). The run stops only where the developer names a stop.

---

### Task 1: The fields, the rules, the reader, the order and the strings

**Files:**
- Modify: `src/types/models.ts`
- Modify: `src/lib/taskLimits.ts`
- Modify: `src/lib/taskLimits.test.ts`
- Modify: `src/services/tasks.ts`
- Modify: `src/services/tasks.test.ts`
- Modify: `src/services/legacy.ts`
- Modify: `src/services/legacy.test.ts`
- Modify: `firestore.rules`
- Modify: `tests/rules/firestore.rules.test.ts`
- Modify: `src/stores/tasks.ts`
- Modify: `src/stores/tasks.test.ts`
- Modify: `src/views/HomeView.vue` (only the filter call: `priorities: []`, so it still compiles)
- Modify: `src/i18n/locales/en/tasks.json`
- Modify: `src/i18n/locales/hi/tasks.json`

**Interfaces:**
- Consumes: existing `storedFields`, `normalise`, `editableOf` in `src/services/tasks.ts`; `taskFromDoc` in `src/services/legacy.ts`; `compareTasks` and `filter` in `src/stores/tasks.ts`; `charCount` from `src/lib/taskLimits.ts` (board-fixes plan).
- Produces:

```ts
// src/types/models.ts
export type Priority = 'none' | 'low' | 'medium' | 'high';
export interface ChecklistItem { id: string; text: string; done: boolean }
// Task gains:     priority: Priority; checklist: ChecklistItem[];
// TaskInput gains: priority?: Priority; checklist?: ChecklistItem[];

// src/lib/taskLimits.ts
export const CHECKLIST_MAX_ITEMS = 50;
export const CHECKLIST_TEXT_MAX = 200;
export const PRIORITIES: readonly Priority[]; // ['high', 'medium', 'low', 'none'], the sort order
export function isPriority(value: unknown): value is Priority;
/** Items that meet C1 (text trimmed), in order, at most CHECKLIST_MAX_ITEMS. */
export function cleanChecklist(items: unknown): ChecklistItem[];
/** A new item with a random id. */
export function newChecklistItem(text: string): ChecklistItem;

// src/stores/tasks.ts
// TaskFilter gains: priorities: Priority[];
```

```
// firestore.rules
taskFields() gains 'priority', 'checklist'
validTaskFields gains:
  priority in ['none', 'low', 'medium', 'high']
  checklist is list && checklist.size() <= 50
```

New keys in `tasks.json`, English then Hindi:

| Key | en | hi |
|---|---|---|
| `priority.label` | `Priority` | `प्राथमिकता` |
| `priority.none` | `None` | `कोई नहीं` |
| `priority.low` | `Low` | `कम` |
| `priority.medium` | `Medium` | `मध्यम` |
| `priority.high` | `High` | `ऊँची` |
| `priority.flag.low` | `Low priority` | `कम प्राथमिकता` |
| `priority.flag.medium` | `Medium priority` | `मध्यम प्राथमिकता` |
| `priority.flag.high` | `High priority` | `ऊँची प्राथमिकता` |
| `priority.filter` | `Filter by priority` | `प्राथमिकता से छाँटें` |
| `checklist.label` | `Checklist` | `चेकलिस्ट` |
| `checklist.add` | `Add an item` | `एक आइटम जोड़ें` |
| `checklist.item` | `Item {n}` | `आइटम {n}` |
| `checklist.remove` | `Remove item {n}` | `आइटम {n} हटाएँ` |
| `checklist.progress` | `{done}/{total}` | `{done}/{total}` |
| `checklist.show` | `Show checklist, {done} of {total} done` | `चेकलिस्ट दिखाएँ, {total} में से {done} पूरे` |
| `checklist.full` | `A checklist holds at most 50 items` | `चेकलिस्ट में अधिकतम 50 आइटम हो सकते हैं` |
| `checklist.tooLong` | `Keep each item under 200 characters` | `हर आइटम 200 अक्षरों से कम रखें` |

**Spec:**
- §2 P1: "A new task is `'none'` unless the user picks one. A task stored without the field, or with any other value, reads as `'none'`."
- §2 P5: "This replaces"
- §2 P5: "Undated tasks are ordered by priority alone. The calendar is unaffected: it places tasks by date and time."
- §2 P4: "With any selected, Home shows only tasks with one of the selected priorities; with none selected, every task."
- §2 R1: "Every create carries them; an edit, a restore (part 1) and a move (part 4) write them as the task has them."
- §2 R2: "The rules can't check each item; the app checks every item against C1 before saving (`normalise` in `src/services/tasks.ts`), dropping any that fail."
- §2 R3: "A missing or malformed `checklist` reads as empty. Nothing stored changes until the task is next saved."

**Tags:** `security`

**Knowledge:**
- `data/task`: a task stores `priority` (`none`, `low`, `medium`, `high`) and `checklist` (at most `50` items of 1–`200` characters); the rules check the priority and the list's length, the app checks each item.
- `domain/legacy-documents`: a task without `priority` or `checklist` reads as `none` and an empty checklist, and malformed items are dropped on reading.
- `features/task-board`: lists are ordered undated last, then by date, then priority high first, then time.

**Acceptance:**
- Rules: a create carrying every field with `priority: 'none'` and `checklist: []` is allowed; a create without `priority`, or without `checklist`, is refused; `priority: 'urgent'` is refused; a checklist of `51` items is refused and of `50` allowed; a `checklist` that is a string is refused.
- Rules: an old task stored without `priority` or `checklist` can be updated by its owner with both added; another user's update adding them is refused.
- `createTask` with no priority or checklist stores `priority: 'none'` and `checklist: []`; with `priority: 'high'` and two items stores them as given.
- `createTask` with an item whose text is `'   '`, one of 201 characters, and 52 valid items stores 50 items, none of them the empty or over-long one.
- `updateTask` on a task changing only its checklist writes the new checklist and keeps `reminded` and `timeZone` as they were.
- `taskFromDoc` reads: no `priority` → `'none'`; `priority: 'urgent'` → `'none'`; `checklist: 'x'` → `[]`; items with a number `text`, without `done`, or without `id` are dropped; `60` valid items → the first `50`.
- Order: on `2026-11-05`, a `high` task at `18:00` comes before a `low` task at `09:00`; two `high` tasks on that day are ordered `09:00` then `18:00` then no time; on different days the earlier date comes first whatever the priority; undated tasks come last, `high` before `none`.
- The Overdue group and Done follow the same order.
- Filter: `priorities: ['high']` keeps only high tasks, in todo, overdue and done; `priorities: []` keeps every task; with labels too, a task must match both.
- `cleanChecklist` trims texts; `newChecklistItem('Milk')` returns a non-empty `id`, `text` `Milk`, `done` false, and two calls give different ids.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `tests/rules/firestore.rules.test.ts`, `src/services/tasks.test.ts`, `src/services/legacy.test.ts`, `src/stores/tasks.test.ts` and `src/lib/taskLimits.test.ts`. Add the types and functions with their real signatures first.

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- tests/rules/firestore.rules.test.ts src/services/tasks.test.ts src/services/legacy.test.ts src/stores/tasks.test.ts src/lib/taskLimits.test.ts -t "priority|checklist|order"`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation**: the types, `taskLimits` additions, `normalise`, `editableOf` and `storedFields` in the service, the reader, the rules, `compareTasks` and the filter, the strings, and `priorities: []` in Home's filter call

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- tests/rules/firestore.rules.test.ts src/services/tasks.test.ts src/services/legacy.test.ts src/stores/tasks.test.ts src/lib/taskLimits.test.ts -t "priority|checklist|order"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/models.ts src/lib/taskLimits.ts src/lib/taskLimits.test.ts src/services/tasks.ts src/services/tasks.test.ts src/services/legacy.ts src/services/legacy.test.ts firestore.rules tests/rules/firestore.rules.test.ts src/stores/tasks.ts src/stores/tasks.test.ts src/views/HomeView.vue src/i18n/locales/en/tasks.json src/i18n/locales/hi/tasks.json
git commit -m "feat(tasks): priority and checklist fields, rules and order"
```

### Task 2: Priority and checklist on the add screen and in the edit form

**Files:**
- Create: `src/components/tasks/PriorityPicker.vue`
- Create: `src/components/tasks/PriorityPicker.test.ts`
- Create: `src/components/tasks/ChecklistEditor.vue`
- Create: `src/components/tasks/ChecklistEditor.test.ts`
- Modify: `src/views/TaskAddView.vue`
- Modify: `src/views/TaskAddView.test.ts`
- Modify: `src/components/tasks/TaskEditForm.vue`
- Modify: `src/components/tasks/TaskEditForm.test.ts`
- Modify: `e2e/add.spec.ts`

**Interfaces:**
- Consumes: `Priority`, `ChecklistItem`, `PRIORITIES`, `CHECKLIST_MAX_ITEMS`, `CHECKLIST_TEXT_MAX`, `charCount`, `newChecklistItem` and the strings `priority.*` and `checklist.*` (Task 1); `TaskInput`'s optional `priority` and `checklist` (Task 1).
- Produces:

```ts
// src/components/tasks/PriorityPicker.vue
const model = defineModel<Priority>({ required: true });
// src/components/tasks/ChecklistEditor.vue
const model = defineModel<ChecklistItem[]>({ required: true });
defineProps<{ disabled?: boolean }>();
```

**Spec:**
- §2 P2: "The add screen and the edit form have a priority control with the four levels, named None, Low, Medium, High."
- §2 C2: "field (Enter adds it), and for each item its text, editable, a checkbox, and a remove button."
- §2 C2: "Items keep the order they were added in; there is no reordering."
- §2 C2: "the add field is disabled and says so; an item over `CHECKLIST_TEXT_MAX` says it is too long and isn't added."

**Tags:** `screen`, `failure-paths`

**Knowledge:**
- `features/add-task`: the add screen and the edit form set a task's priority (None, Low, Medium, High) and edit its checklist (add, edit, tick, remove; at most `50` items of `200` characters).

**Acceptance:**
- PriorityPicker shows None, Low, Medium and High, one selected; choosing High sets the model to `'high'`.
- ChecklistEditor: typing `Milk` and Enter adds an item `Milk`, not done, at the end, and empties the field; `   ` and Enter adds nothing.
- An item text of 201 characters isn't added, and the field says "Keep each item under 200 characters".
- With 50 items the add field is disabled and says "A checklist holds at most 50 items".
- Editing an item's text, ticking it and removing it each update the model; the remove button is labelled "Remove item 2" for the second item.
- Item text containing `<b>x</b>` shows as the literal text, with no `b` element.
- The add screen saves `priority: 'medium'` and the checklist it holds when Add is pressed; with nothing chosen it saves `priority: 'none'` and `checklist: []`.
- The edit form starts from the task's priority and checklist and emits both in its `submit` patch; a failed save keeps them as the user left them.
- e2e: adding a task with High and one item stores `priority: 'high'` and one checklist item. Runs when the developer asks.

- [ ] **Step 1: Write the failing tests** for each unit Acceptance case, in `src/components/tasks/PriorityPicker.test.ts`, `src/components/tasks/ChecklistEditor.test.ts`, `src/views/TaskAddView.test.ts` and `src/components/tasks/TaskEditForm.test.ts`. Create the two components with their real models first.

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/components/tasks/PriorityPicker.test.ts src/components/tasks/ChecklistEditor.test.ts src/views/TaskAddView.test.ts src/components/tasks/TaskEditForm.test.ts -t "priority|checklist|Priority|Checklist"`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation**: the two components, placed on the add screen and in the edit form; then the e2e case in `e2e/add.spec.ts`

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/components/tasks/PriorityPicker.test.ts src/components/tasks/ChecklistEditor.test.ts src/views/TaskAddView.test.ts src/components/tasks/TaskEditForm.test.ts -t "priority|checklist|Priority|Checklist"`
Expected: PASS. The e2e case runs when the developer asks.

- [ ] **Step 5: Commit**

```bash
git add src/components/tasks/PriorityPicker.vue src/components/tasks/PriorityPicker.test.ts src/components/tasks/ChecklistEditor.vue src/components/tasks/ChecklistEditor.test.ts src/views/TaskAddView.vue src/views/TaskAddView.test.ts src/components/tasks/TaskEditForm.vue src/components/tasks/TaskEditForm.test.ts e2e/add.spec.ts
git commit -m "feat(tasks): set priority and edit the checklist when adding or editing a task"
```

### Task 3: The flag, the checklist on the card, the priority filter and the calendar details

**Files:**
- Create: `src/components/tasks/PriorityFlag.vue`
- Create: `src/components/tasks/ChecklistOnCard.vue`
- Create: `src/components/tasks/ChecklistOnCard.test.ts`
- Modify: `src/components/tasks/TaskCard.vue`
- Modify: `src/components/tasks/TaskCard.test.ts`
- Modify: `src/components/tasks/TaskBoard.vue` (saves a ticked item)
- Modify: `src/components/tasks/TaskBoard.test.ts`
- Modify: `src/views/HomeView.vue` (the priority chips)
- Modify: `src/views/HomeView.test.ts`
- Modify: `src/components/calendar/TaskDetailsDialog.vue`
- Modify: `src/components/calendar/TaskDetailsDialog.test.ts`

**Interfaces:**
- Consumes: `Priority`, `ChecklistItem`, the `priorities` filter and the strings `priority.*` and `checklist.*` (Task 1); existing `tasksStore.update(task, patch)`, the board's `pendingIds` and `ui.showSnack`.
- Produces:

```ts
// src/components/tasks/PriorityFlag.vue
defineProps<{ priority: Priority }>(); // renders nothing for 'none'
// src/components/tasks/ChecklistOnCard.vue
defineProps<{ items: ChecklistItem[]; disabled: boolean }>();
defineEmits<{ toggle: [itemId: string] }>();
// src/components/tasks/TaskCard.vue, added event
// checklist: [task: Task, checklist: ChecklistItem[]]
```

**Spec:**
- §2 P3: "High in the theme's error colour, Medium in warning, Low in info; `'none'` shows nothing."
- §2 P4: "Home has priority chips, High, Medium and Low, beside the label chips."
- §2 C3: "Pressing it expands the items on the card, each with a checkbox; pressing it again collapses them."
- §2 C3: "while that save is in flight the boxes are disabled; if it fails, the box goes back and the snackbar says"
- §2 C4: "A done task's checklist is shown but can't be ticked."
- §2 C5: "The calendar's task details list the checklist items with their state, read-only."

**Tags:** `screen`, `failure-paths`

**Knowledge:**
- `features/task-board`: a card shows its priority flag and its checklist's progress, expands to tick items (saved at once), and Home filters by High, Medium and Low.
- `features/calendar`: the task details show the priority flag and the checklist, read-only.

**Acceptance:**
- PriorityFlag for `'high'` renders a flag in the error colour named "High priority"; for `'medium'` warning, "Medium priority"; for `'low'` info, "Low priority"; for `'none'` nothing.
- A card for a high task shows the flag beside its title; a `none` task shows none.
- A card with 5 items, 2 done, shows `2/5` on a button named "Show checklist, 2 of 5 done"; pressing it shows the 5 items with checkboxes; pressing again hides them; a task with no items shows neither.
- Ticking the third item calls `update` with the checklist whose third item is done and the rest unchanged; while it saves, every box is disabled.
- When that save rejects, the third box is unticked again and the snackbar says "Couldn't save. Try again.".
- On a done task's card, the items show but their boxes are disabled.
- Ticking every item leaves the task's status `todo`.
- Item text `<b>x</b>` shows as literal text on the card and in the calendar details.
- Home shows High, Medium and Low chips labelled "Filter by priority"; choosing High shows only high tasks; clearing it shows every task.
- The calendar details show the flag and list the items with their state, with no checkboxes to tick.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `src/components/tasks/ChecklistOnCard.test.ts`, `src/components/tasks/TaskCard.test.ts`, `src/components/tasks/TaskBoard.test.ts`, `src/views/HomeView.test.ts` and `src/components/calendar/TaskDetailsDialog.test.ts`. Create the two components with their real props first.

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/components/tasks/ChecklistOnCard.test.ts src/components/tasks/TaskCard.test.ts src/components/tasks/TaskBoard.test.ts src/views/HomeView.test.ts src/components/calendar/TaskDetailsDialog.test.ts -t "priority|checklist|Priority|Checklist"`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation**: the flag and checklist components, the card and board changes, Home's chips, and the details dialog

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/components/tasks/ChecklistOnCard.test.ts src/components/tasks/TaskCard.test.ts src/components/tasks/TaskBoard.test.ts src/views/HomeView.test.ts src/components/calendar/TaskDetailsDialog.test.ts -t "priority|checklist|Priority|Checklist"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/tasks/PriorityFlag.vue src/components/tasks/ChecklistOnCard.vue src/components/tasks/ChecklistOnCard.test.ts src/components/tasks/TaskCard.vue src/components/tasks/TaskCard.test.ts src/components/tasks/TaskBoard.vue src/components/tasks/TaskBoard.test.ts src/views/HomeView.vue src/views/HomeView.test.ts src/components/calendar/TaskDetailsDialog.vue src/components/calendar/TaskDetailsDialog.test.ts
git commit -m "feat(board): priority flags, checklists on cards and a priority filter"
```
