# Recurring tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:implement-with-subagents by default, or ga:implement. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A dated task can repeat; finishing an occurrence keeps it in Done and creates the next one, which carries the task forward with its checklist unticked and its own reminder.

**Architecture:** A pure `src/lib/recurrence.ts` computes pattern dates directly and formats a rule's summary. Tasks gain `repeat`, `seriesId` and `spawnedNext`, checked by the rules. The store's `complete` finishes an occurrence and creates the next in one batch under `<seriesId>_<date>`; every done path calls it. The UI adds a Repeat control, a summary, Skip, and repeat words in quick add.

**Tech Stack:** Vue 3.5, Vuetify 4, Pinia, vue-i18n 11, dayjs, Firebase 13 modular SDK (`writeBatch`), Firestore rules, Vitest against the emulators.

**Spec:** `docs/specs/2026-11-03-recurring-tasks.md`

**Builds after:** parts 1–6 (`docs/plans/2026-11-03-board-fixes.md` to `docs/plans/2026-11-03-reminder-lead-time-and-actions.md`): Undo, the views, quick add and `parseWhen`, the calendar's details dialog, priority and checklist, `remindBefore`, `notifyAt` and Home's `do=done`. Their code is taken as already there.

## Global Constraints

- §2 R2: "a pattern is computed directly for k, never by stepping one day at a time, so a rule far in the past costs the same as a new one."
- §2 R3: "`nextOccurrence(rule, occurrenceDate, today)` is the first pattern date after both `occurrenceDate` and `today`, or `null` when that date is after `until`."
- §2 F1: every way of marking a task done goes through the store's `complete(task)`.
- §2 E2: a move, a new date or a snooze changes only that occurrence; "`repeat.start` stays".
- Dates are local wall-clock `'YYYY-MM-DD'` values ([domain/local-dates](../../knowledge/domain/local-dates.md)).
- New strings go in `src/i18n/locales/en/tasks.json` and `src/i18n/locales/hi/tasks.json`, with the same keys.

## Checkpoints

None (`run.checkpoints: none`). The run stops only where the developer names a stop.

---

### Task 1: The rule, its storage and checks, the store's actions, the summary and the strings

**Files:**
- Create: `src/lib/recurrence.ts`
- Create: `src/lib/recurrence.test.ts`
- Modify: `src/types/models.ts`
- Modify: `src/services/tasks.ts`
- Modify: `src/services/tasks.test.ts`
- Modify: `src/services/legacy.ts`
- Modify: `src/services/legacy.test.ts`
- Modify: `firestore.rules`
- Modify: `tests/rules/firestore.rules.test.ts`
- Modify: `src/stores/tasks.ts`
- Modify: `src/stores/tasks.test.ts`
- Create: `src/components/tasks/RepeatSummary.vue`
- Create: `src/components/tasks/RepeatSummary.test.ts`
- Modify: `src/i18n/locales/en/tasks.json`
- Modify: `src/i18n/locales/hi/tasks.json`

**Interfaces:**
- Consumes: existing `normalise`, `storedFields`, `createTask` and `updateTask` in `src/services/tasks.ts`; `computeRemindAt`, `computeNotifyAt`, `deviceTimeZone`, `parseLocalDate`; `cleanChecklist` and `newChecklistItem` from `src/lib/taskLimits.ts` (priority-and-checklist plan).
- Produces:

```ts
// src/types/models.ts
export interface RepeatRule {
  freq: 'day' | 'week' | 'month' | 'year';
  interval: number;
  weekdays: number[];
  start: string;
  until: string | null;
}
// Task gains:      repeat: RepeatRule | null; seriesId: string | null; spawnedNext: boolean;
// TaskInput gains: repeat?: RepeatRule | null;

// src/lib/recurrence.ts
export const REPEAT_INTERVAL_MAX = 99;
export const SERIES_ID_MAX = 64;
export function isRepeatRule(value: unknown): value is RepeatRule;
/** The first pattern date after both dates, or null past `until`. */
export function nextOccurrence(rule: RepeatRule, occurrenceDate: string, today: string): string | null;
/** The first pattern date on or after `from` (quick add's start, Task 4). */
export function firstOccurrenceFrom(rule: RepeatRule, from: string): string | null;
export function newSeriesId(): string;

// src/services/tasks.ts
/** Marks the task done and, when it repeats and hasn't yet, writes its next occurrence, in one batch. */
export function completeTask(task: Task, today: string): Promise<{ done: Task; next: Task | null; last: boolean }>;
/** Back to todo with spawnedNext false, and deletes `nextId`, in one batch. */
export function undoComplete(task: Task, nextId: string | null): Promise<Task>;

// src/stores/tasks.ts (actions)
complete(task: Task): Promise<{ next: Task | null; last: boolean }>;
undoComplete(task: Task, next: Task | null): Promise<void>;
/** Moves the task to its next date; resolves with the date it had, for Undo; rejects with 'task/no-next-date' when there is none. */
skip(task: Task): Promise<string>;

// src/components/tasks/RepeatSummary.vue
defineProps<{ rule: RepeatRule }>(); // icon + summary text, nothing for an invalid rule
```

```
// firestore.rules
taskFields() gains 'repeat', 'seriesId', 'spawnedNext'
validTaskFields gains:
  repeat == null || (repeat is map
    && repeat.keys().hasAll(['freq','interval','weekdays','start','until'])
    && repeat.keys().hasOnly(['freq','interval','weekdays','start','until'])
    && repeat.freq in ['day','week','month','year']
    && repeat.interval is int && repeat.interval >= 1 && repeat.interval <= 99
    && repeat.weekdays is list && repeat.weekdays.size() <= 7
    && repeat.start is string && repeat.start.matches('[0-9]{4}-[0-9]{2}-[0-9]{2}')
    && (repeat.until == null || (repeat.until is string && repeat.until.matches('[0-9]{4}-[0-9]{2}-[0-9]{2}'))))
  seriesId == null || (seriesId is string && seriesId.size() >= 1 && seriesId.size() <= 64)
  spawnedNext is bool
```

New keys in `tasks.json`, English then Hindi:

| Key | en | hi |
|---|---|---|
| `repeat.label` | `Repeat` | `दोहराएँ` |
| `repeat.never` | `Never` | `कभी नहीं` |
| `repeat.daily` | `Every day` | `हर दिन` |
| `repeat.weekly` | `Every week on {weekday}` | `हर हफ़्ते {weekday} को` |
| `repeat.monthly` | `Every month on the {day}` | `हर महीने {day} तारीख को` |
| `repeat.yearly` | `Every year on {date}` | `हर साल {date} को` |
| `repeat.custom` | `Custom…` | `कस्टम…` |
| `repeat.every` | `Every` | `हर` |
| `repeat.units.day` | `day \| days` | `दिन \| दिन` |
| `repeat.units.week` | `week \| weeks` | `हफ़्ता \| हफ़्ते` |
| `repeat.units.month` | `month \| months` | `महीना \| महीने` |
| `repeat.units.year` | `year \| years` | `साल \| साल` |
| `repeat.ends` | `Ends` | `समाप्त` |
| `repeat.endsNever` | `Never` | `कभी नहीं` |
| `repeat.endsOn` | `On a date` | `किसी तारीख को` |
| `repeat.pickWeekday` | `Pick at least one day` | `कम से कम एक दिन चुनें` |
| `repeat.summary.day` | `Every day \| Every {n} days` | `हर दिन \| हर {n} दिन` |
| `repeat.summary.week` | `Every week on {days} \| Every {n} weeks on {days}` | `हर हफ़्ते {days} को \| हर {n} हफ़्ते {days} को` |
| `repeat.summary.month` | `Every month on the {day} \| Every {n} months on the {day}` | `हर महीने {day} तारीख को \| हर {n} महीने {day} तारीख को` |
| `repeat.summary.year` | `Every year on {date} \| Every {n} years on {date}` | `हर साल {date} को \| हर {n} साल {date} को` |
| `repeat.summary.until` | `{rule} until {date}` | `{date} तक {rule}` |
| `repeat.skip` | `Skip to the next date` | `अगली तारीख पर ले जाएँ` |
| `toast.skipped` | `Skipped to {when}` | `{when} पर ले जाया गया` |
| `toast.lastOne` | `That was the last one.` | `यह आखिरी था।` |

In English, `{day}` takes an ordinal (`1st`, `2nd`, `3rd`, `31st`); in Hindi a plain number, as the calendar avoids English ordinals (D4 of the 2026-11-02 spec).

**Spec:**
- §2 R2: "29 February falls on 28 February in other years"
- §2 F2: "When `nextOccurrence` gives `null`, only the task is written"
- §2 F3: "The predictable id means two devices finishing the same occurrence write the same next occurrence, not two."
- §2 F4: "the task back to `todo` with `spawnedNext: false`, and the deletion of the occurrence `complete` created."
- §2 E1: "Turning Repeat on gives the task a new `seriesId` (when it has none) and a rule whose `start` is the task's date. Changing the rule sets its `start` to the task's date. Turning Repeat off sets `repeat` to `null` and keeps `seriesId`."
- §2 D1: "Old tasks read as `repeat: null`, `seriesId: null`, `spawnedNext: false`. A malformed `repeat` reads as `null`."
- §2 D2: "The app checks the rest (distinct weekdays 0–6, at least one for `week`) before saving."

**Tags:** `security`

**Knowledge:**
- `data/task`: a task stores `repeat` (`freq`, `interval` 1–`99`, `weekdays`, `start`, `until`), `seriesId` and `spawnedNext`; the rules check the rule's keys and bounds.
- `domain/recurrence` (new): pattern dates per `freq`, the next date after both the occurrence and today, the copy a next occurrence gets, and its id `<seriesId>_<date>`.
- `domain/legacy-documents`: a task without the recurrence fields, or with a malformed `repeat`, reads as not repeating.

**Acceptance:**
- `nextOccurrence`, with the rule's `start` given:
  - daily from `2026-11-01`, interval 1: after `2026-11-03` with today `2026-11-03` → `2026-11-04`; after `2026-11-03` with today `2026-11-07` → `2026-11-08`.
  - every 3 days from `2026-11-01`: after `2026-11-04`, today `2026-11-04` → `2026-11-07`.
  - every 2 weeks on Mon and Wed from `2026-11-02` (a Monday): after `2026-11-02` → `2026-11-04`; after `2026-11-04` → `2026-11-16`; across the month end, after `2026-11-18` → `2026-11-30`.
  - monthly on the 31st from `2026-01-31`: after `2026-01-31` → `2026-02-28`; after `2026-02-28` → `2026-03-31`; from `2028-01-31`, after it → `2028-02-29`.
  - yearly from `2024-02-29`: after it → `2025-02-28`; after `2027-02-28` → `2028-02-29`.
  - weekly on Wednesday from `2026-11-04`: done early on `2026-11-02` for the `2026-11-04` occurrence → `2026-11-11`; done late on `2026-11-06` → `2026-11-11`.
  - with `until` `2026-11-10`, daily: after `2026-11-09` → `2026-11-10`; after `2026-11-10` → `null`.
  - daily from `1976-01-01` with today `2026-11-03` returns `2026-11-04`, computed without stepping day by day (the test asserts it completes in under 5 ms).
- `isRepeatRule` refuses `interval` 0 and 100, `freq: 'hour'`, a `week` rule with `weekdays: []`, duplicate weekdays, weekday 7, and an extra key.
- Rules: a create with each valid `repeat` shape is allowed; `interval: 0`, `interval: 100`, `interval: 1.5`, `freq: 'hour'`, an extra key, `weekdays` of 8, `start: 'soon'` and a `seriesId` of 65 characters are refused; a create without `spawnedNext` is refused.
- `completeTask` on a daily todo task `s1_2026-11-03` (series `s1`, `spawnedNext` false), today `2026-11-03`: the task becomes done with `spawnedNext` true, and `s1_2026-11-04` exists, todo, `spawnedNext` false, with the same title, labels, priority, time, `remindBefore` and `repeat`, every checklist item unticked, `reminded` false, and `notifyAt` from its own date.
- Two `completeTask` calls for the same occurrence leave one next occurrence.
- `completeTask` on a task with `spawnedNext` true marks it done and writes no other document.
- `completeTask` past `until` marks it done, writes nothing else, and returns `last: true`.
- `undoComplete` returns the task to todo with `spawnedNext` false and deletes the next occurrence, in one batch; when the batch fails, both stay as they were.
- `createTask` with a `repeat` and no `seriesId` gets a new one; with `repeat` on an indefinite task stores `repeat: null`.
- `updateTask` turning Repeat on sets `start` to the task's date; changing only the date keeps `repeat.start`; turning it off keeps `seriesId`.
- `taskFromDoc` reads missing fields as `null`, `null`, `false`, and `repeat: { freq: 'hour' }` as `null`.
- The store's `complete` on a non-repeating task is the status change it is today; on a repeating one adds the next occurrence to `tasks`; `skip` moves a daily task dated `2026-11-03` to `2026-11-04` with today `2026-11-03` and resolves with `2026-11-03`; `skip` past `until` rejects with `task/no-next-date`.
- RepeatSummary in English: `Every day`, `Every 2 weeks on Mon, Wed`, `Every month on the 31st`, `Every year on 29 Feb`, `Every day until 31 Dec 2026`; in Hindi the month rule reads `हर महीने 31 तारीख को`.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `src/lib/recurrence.test.ts`, `tests/rules/firestore.rules.test.ts`, `src/services/tasks.test.ts`, `src/services/legacy.test.ts`, `src/stores/tasks.test.ts` and `src/components/tasks/RepeatSummary.test.ts`. Add the types and functions with their real signatures first.

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/lib/recurrence.test.ts tests/rules/firestore.rules.test.ts src/services/tasks.test.ts src/services/legacy.test.ts src/stores/tasks.test.ts src/components/tasks/RepeatSummary.test.ts -t "repeat|Repeat|nextOccurrence|complete|skip|series"`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation** to the Interfaces, the rules and the strings

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/lib/recurrence.test.ts tests/rules/firestore.rules.test.ts src/services/tasks.test.ts src/services/legacy.test.ts src/stores/tasks.test.ts src/components/tasks/RepeatSummary.test.ts -t "repeat|Repeat|nextOccurrence|complete|skip|series"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/recurrence.ts src/lib/recurrence.test.ts src/types/models.ts src/services/tasks.ts src/services/tasks.test.ts src/services/legacy.ts src/services/legacy.test.ts firestore.rules tests/rules/firestore.rules.test.ts src/stores/tasks.ts src/stores/tasks.test.ts src/components/tasks/RepeatSummary.vue src/components/tasks/RepeatSummary.test.ts src/i18n/locales/en/tasks.json src/i18n/locales/hi/tasks.json
git commit -m "feat(tasks): repeating tasks create their next occurrence when done"
```

### Task 2: Finishing, Skip and the summary on the board, Home and the calendar

**Files:**
- Modify: `src/components/tasks/TaskBoard.vue`
- Create: `src/components/tasks/TaskBoard.repeat.test.ts`
- Modify: `src/components/tasks/TaskCard.vue`
- Modify: `src/components/tasks/TaskCard.test.ts`
- Modify: `src/views/HomeView.vue`
- Modify: `src/views/HomeView.test.ts`
- Modify: `src/components/calendar/TaskDetailsDialog.vue`
- Modify: `src/components/calendar/TaskDetailsDialog.test.ts`

**Interfaces:**
- Consumes: `complete`, `undoComplete`, `skip`, `nextOccurrence`, `RepeatSummary` and the strings `repeat.skip`, `toast.skipped`, `toast.lastOne` (Task 1); the board's undo snack and `UNDO_TIMEOUT_MS` (board-fixes plan); Home's `do=done` (reminders plan).
- Produces:

```ts
// src/components/tasks/TaskCard.vue, added event
// skip: [task: Task]
```

**Spec:**
- §2 F1: "the check button, a drag to Done, the `x` key (part 3), the reminder's Mark done (part 6), and part 1's Undo of a move back."
- §2 E3: "It moves the task to `nextOccurrence(rule, its date, today)` through the store's `update`, with Undo restoring the date; nothing goes into Done. When there is no next date, Skip is disabled."
- §2 E4: "Deleting the todo occurrence ends the series; its done occurrences stay."
- §2 S1: "A repeating task's card and the calendar's task details show a repeat icon and a summary"

**Tags:** `screen`, `failure-paths`

**Knowledge:**
- `features/task-board`: marking a repeating task done creates its next occurrence (Undo removes it); a repeating card shows its summary and Skip.
- `features/calendar`: the task details show a repeating task's summary.

**Acceptance:**
- The check button on a repeating todo card calls `complete`, not `update`; so do a drag to Done and the `x` key (through the card's `toggle`).
- After `complete` creates a next occurrence, the snackbar says "Marked done" with Undo; Undo calls `undoComplete` with the task and that next occurrence.
- After `complete` returns `last: true`, the snackbar says "Marked done. That was the last one." with Undo.
- When `complete` rejects, the snackbar says "Couldn't save. Try again." and the card stays in Todo.
- Home at `/home?task=t1&do=done` on a repeating todo task calls `complete`.
- A repeating todo card shows its summary ("Every day") and a "Skip to the next date" button; pressing it calls `skip` and says "Skipped to Tomorrow" with Undo, which restores the old date through `update`.
- Skip is disabled when `nextOccurrence` gives `null`; a non-repeating card and a done card show no Skip.
- Deleting a repeating todo card deletes only it; its done occurrences stay on the board.
- The calendar details for a repeating task show the summary.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `src/components/tasks/TaskBoard.repeat.test.ts`, `src/components/tasks/TaskCard.test.ts`, `src/views/HomeView.test.ts` and `src/components/calendar/TaskDetailsDialog.test.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/components/tasks/TaskBoard.repeat.test.ts src/components/tasks/TaskCard.test.ts src/views/HomeView.test.ts src/components/calendar/TaskDetailsDialog.test.ts -t "repeat|Repeat|Skip|complete"`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation**: every done path through `complete`, the undo with `undoComplete`, Skip, and the summaries

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/components/tasks/TaskBoard.repeat.test.ts src/components/tasks/TaskCard.test.ts src/views/HomeView.test.ts src/components/calendar/TaskDetailsDialog.test.ts -t "repeat|Repeat|Skip|complete"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/tasks/TaskBoard.vue src/components/tasks/TaskBoard.repeat.test.ts src/components/tasks/TaskCard.vue src/components/tasks/TaskCard.test.ts src/views/HomeView.vue src/views/HomeView.test.ts src/components/calendar/TaskDetailsDialog.vue src/components/calendar/TaskDetailsDialog.test.ts
git commit -m "feat(board): finish and skip repeating tasks"
```

### Task 3: The Repeat control on the add screen and in the edit form

**Files:**
- Create: `src/components/tasks/RepeatPicker.vue`
- Create: `src/components/tasks/RepeatPicker.test.ts`
- Modify: `src/views/TaskAddView.vue`
- Modify: `src/views/TaskAddView.test.ts`
- Modify: `src/components/tasks/TaskEditForm.vue`
- Modify: `src/components/tasks/TaskEditForm.test.ts`

**Interfaces:**
- Consumes: `RepeatRule`, `isRepeatRule`, `REPEAT_INTERVAL_MAX`, `TaskInput.repeat` and the strings `repeat.*` (Task 1); existing `DateField`.
- Produces:

```ts
// src/components/tasks/RepeatPicker.vue
const model = defineModel<RepeatRule | null>({ required: true });
defineProps<{ date: string | null; disabled?: boolean }>();
```

**Spec:**
- §2 U1: "Custom opens: every N (1–99) days, weeks, months or years; for weeks, weekday chips (at least one); Ends: Never, or On <date> (not before the task's date). The presets follow the task's date as it changes until Custom is used."
- §2 R4: "A repeating task has a date; "

**Tags:** `screen`

**Knowledge:**
- `features/add-task`: the add screen and the edit form set a Repeat rule from presets (Never, Every day, week, month, year) or Custom (interval, weekdays, end date); a repeating task needs a date.

**Acceptance:**
- For the date `2026-11-04` (a Wednesday), the menu offers "Never", "Every day", "Every week on Wednesday", "Every month on the 4th", "Every year on 4 Nov" and "Custom…".
- Choosing "Every week on Wednesday" sets the model to `{ freq: 'week', interval: 1, weekdays: [3], start: '2026-11-04', until: null }`; changing the date to `2026-11-05` then changes it to `weekdays: [4]`, `start: '2026-11-05'`.
- Custom with every 2 weeks, Mon and Wed, ending `2026-12-31` sets `{ freq: 'week', interval: 2, weekdays: [1, 3], start: <date>, until: '2026-12-31' }`.
- Custom refuses an interval of 0 or 100 (the field says so), a week rule with no weekday ("Pick at least one day"), and an end date before the task's date.
- On the add screen, setting a Repeat turns "No due date" off and disables it; Never enables it again.
- The add screen saves the rule; the edit form starts from the task's rule and emits the changed rule, or `null` for Never.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `src/components/tasks/RepeatPicker.test.ts`, `src/views/TaskAddView.test.ts` and `src/components/tasks/TaskEditForm.test.ts`. Create the picker with its real model and props first.

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/components/tasks/RepeatPicker.test.ts src/views/TaskAddView.test.ts src/components/tasks/TaskEditForm.test.ts -t "repeat|Repeat"`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation**: the picker with its presets and Custom form, placed on the add screen and in the edit form

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/components/tasks/RepeatPicker.test.ts src/views/TaskAddView.test.ts src/components/tasks/TaskEditForm.test.ts -t "repeat|Repeat"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/tasks/RepeatPicker.vue src/components/tasks/RepeatPicker.test.ts src/views/TaskAddView.vue src/views/TaskAddView.test.ts src/components/tasks/TaskEditForm.vue src/components/tasks/TaskEditForm.test.ts
git commit -m "feat(tasks): set a repeat when adding or editing a task"
```

### Task 4: Repeat words in quick add

**Files:**
- Modify: `src/lib/parseWhen.ts`
- Modify: `src/lib/parseWhen.test.ts`
- Modify: `src/components/tasks/QuickAdd.vue`
- Modify: `src/components/tasks/QuickAdd.test.ts`

**Interfaces:**
- Consumes: `RepeatRule`, `firstOccurrenceFrom`, `RepeatSummary` (Task 1); existing `parseWhen` and `QuickAdd` (quick-capture plan).
- Produces:

```ts
// src/lib/parseWhen.ts: ParsedWhen gains
repeat: { freq: RepeatRule['freq']; weekdays: number[] } | null;
```

**Spec:**
- §2 U2: "With no day typed, the task starts on the first matching day on or after today (today counts here, unlike a lone weekday in part 3). The chip shows the date and the repeat summary."

**Tags:** none

**Knowledge:**
- `domain/recurrence`: quick add reads one repeat phrase in English or Hindi, and starts the task on the first matching day on or after today.

**Acceptance:** with today `2026-11-03`, a Tuesday:
- `Vitamins every day` gives title `Vitamins` and repeat `day`; `daily` the same.
- `Standup every monday` and `every mon` give repeat `week` with `weekdays: [1]`; `weekly` gives `week` with no weekdays (QuickAdd fills the start date's weekday).
- `Rent every month` and `monthly` give `month`; `every year` and `yearly` give `year`.
- `रोज़ दवा`, `रोज दवा` and `हर दिन दवा` give title `दवा` and `day`; `हर सोमवार` gives `week` with `[1]`; `हर हफ़्ते`, `हर हफ्ते`, `हर महीने`, `हर साल` give `week`, `week`, `month`, `year`.
- `every day every week` reads the first; the second stays in the title.
- `everyday` and `every 2 days` read no repeat.
- QuickAdd: `Standup every tuesday` saves with date `2026-11-03` (today counts) and `repeat` `{ freq: 'week', interval: 1, weekdays: [2], start: '2026-11-03', until: null }`; `Standup every monday` saves date `2026-11-09`; `Pay rent every month 5 nov` saves date `2026-11-05` and a monthly rule starting then.
- The chip shows the date and the summary, such as `Every week on Tue`.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `src/lib/parseWhen.test.ts` and `src/components/tasks/QuickAdd.test.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/lib/parseWhen.test.ts src/components/tasks/QuickAdd.test.ts -t "repeat|every|daily|weekly|monthly|yearly|हर|रोज"`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation**: the repeat phrases in the parser, and QuickAdd building the rule and start date

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/lib/parseWhen.test.ts src/components/tasks/QuickAdd.test.ts -t "repeat|every|daily|weekly|monthly|yearly|हर|रोज"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/parseWhen.ts src/lib/parseWhen.test.ts src/components/tasks/QuickAdd.vue src/components/tasks/QuickAdd.test.ts
git commit -m "feat(home): read repeat words in quick add"
```
