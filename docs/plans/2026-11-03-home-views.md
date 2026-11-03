# Home views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:implement-with-subagents by default, or ga:implement. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Home opens on a Today view that lists overdue todo tasks first, with Upcoming, Overdue, No date and All views beside the date bar.

**Architecture:** The tasks store's filter takes a view and today's date and returns an Overdue group beside Todo and Done; the date comparisons live in `src/lib/dates.ts`. The board draws the Overdue group above the Todo list. Home holds the view, shows a row of view chips, and builds the header from the view.

**Tech Stack:** Vue 3.5 (`<script setup lang="ts">`), Vuetify 4, Pinia (the tasks store is an options store), vue-i18n 11, dayjs, vue-draggable-plus, Vitest with `@vue/test-utils`, Playwright for the e2e specs.

**Spec:** `docs/specs/2026-11-03-home-views.md`

**Builds after:** `docs/plans/2026-11-03-board-fixes.md`. Its code in `src/components/tasks/TaskBoard.vue` and `TaskColumn.vue` (the undo snacks, the Clear button, the `clearing` prop) is taken as already there; this plan adds to it and removes none of it.

## Global Constraints

- §2 V2: "A task is *undated* when it is indefinite or has no date."
- §2 V2: Upcoming is tasks dated after today and at most `UPCOMING_DAYS = 7` days after it.
- §2 V3: "The time of day doesn't count: a task due today at 9:00 is today's at 10:00. Done tasks are never overdue."
- §3: dates are compared as `'YYYY-MM-DD'` values, "never parsing them as UTC".
- §2 V10: every new string goes in `src/i18n/locales/en/tasks.json` and `src/i18n/locales/hi/tasks.json`, with the same keys.
- No change to `firestore.rules`.

## Checkpoints

None (`run.checkpoints: none`). The run stops only where the developer names a stop.

---

### Task 1: The views in the store, the date rules, and the new strings

**Files:**
- Modify: `src/lib/dates.ts`
- Test: `src/lib/dates.test.ts`
- Modify: `src/stores/tasks.ts`
- Test: `src/stores/tasks.test.ts`
- Modify: `src/views/HomeView.vue` (only the `tasksStore.filter` call, so it still compiles: a picked date becomes `{ kind: 'day', date }`, no date becomes `{ kind: 'all' }`, with `today`)
- Modify: `src/i18n/locales/en/tasks.json`
- Modify: `src/i18n/locales/hi/tasks.json`

**Interfaces:**
- Consumes: existing `compareTasks`, `splitByStatus`, `searchable` in `src/stores/tasks.ts`; existing `parseLocalDate` in `src/lib/dates.ts`.
- Produces:

```ts
// src/lib/dates.ts
export const UPCOMING_DAYS = 7;
/** ymd is before today. Both are local 'YYYY-MM-DD'. */
export function isOverdue(ymd: string, today: string): boolean;
/** ymd is after today and at most UPCOMING_DAYS days after it. */
export function isUpcoming(ymd: string, today: string): boolean;

// src/stores/tasks.ts
export type HomeView =
  | { kind: 'today' | 'upcoming' | 'overdue' | 'undated' | 'all' }
  | { kind: 'day'; date: string };
export interface TaskFilter { text: string; labelIds: string[]; view: HomeView; today: string }
export interface TasksByStatus { todo: Task[]; done: Task[]; overdue: Task[] }
```

New keys in `tasks.json`, English then Hindi:

| Key | en | hi |
|---|---|---|
| `views.label` | `Choose what to show` | `क्या दिखाएँ चुनें` |
| `views.today` | `Today` | `आज` |
| `views.upcoming` | `Upcoming` | `आने वाले` |
| `views.overdue` | `Overdue` | `बकाया` |
| `views.undated` | `No date` | `कोई तारीख नहीं` |
| `views.all` | `All` | `सभी` |
| `overdueGroup` | `Overdue · {n}` | `बकाया · {n}` |
| `header.upcoming` | `{tasks} in the next {days} days` | `अगले {days} दिनों में {tasks}` |
| `header.overdue` | `{tasks} overdue` | `{tasks} बकाया` |
| `header.undated` | `{tasks} with no date` | `बिना तारीख के {tasks}` |

**Spec:**
- §2 V3: "A todo task is overdue when its date is before `today`."
- §2 V5: "Every view shows every done task in the Done column, narrowed by search and labels only, as the board does today."
- §2 V6: "**Search and labels** narrow every view, as they narrow the board today."
- §2 V7: "The Overdue group is in that order too, so the oldest overdue task is first."
- §3: "`overdue` is filled only in Today; elsewhere it is empty and the view's tasks are all in `todo`. `byStatus` returns an empty `overdue`."

**Tags:** none

**Knowledge:**
- `features/task-board`: the filter's views are Today (overdue first), Upcoming (`UPCOMING_DAYS = 7`), Overdue, No date, All and a day; a day shows only that day's todo tasks, and undated tasks show only in No date and All.
- `domain/local-dates`: overdue and upcoming compare local `'YYYY-MM-DD'` dates, never instants.

**Acceptance:**
- With today `2026-11-03`: `isOverdue('2026-11-02')` is true, `isOverdue('2026-11-03')` is false; `isUpcoming('2026-11-03')` is false, `isUpcoming('2026-11-04')` and `isUpcoming('2026-11-10')` are true, `isUpcoming('2026-11-11')` is false.
- With today `2026-10-31`, `isUpcoming('2026-11-07')` is true and `isOverdue('2026-10-30')` is true: month ends don't break the count. With today `2026-03-28` and the device zone `Europe/London` (a 23-hour day on 2026-03-29), `isUpcoming('2026-04-04')` is true and `isUpcoming('2026-04-05')` is false.
- Given todo tasks dated yesterday, today, tomorrow, today + 7, today + 8, and one indefinite, and today `T`:
  - Today: `overdue` holds yesterday's; `todo` holds today's only.
  - Upcoming: `todo` holds tomorrow's and today + 7's; `overdue` is empty.
  - Overdue: `todo` holds yesterday's.
  - No date: `todo` holds the indefinite one.
  - All: `todo` holds all six; `overdue` is empty.
  - Day tomorrow: `todo` holds tomorrow's only, not the indefinite one.
- Given a legacy task whose date is `"NA"`, it shows in No date and All, never in Overdue.
- Given done tasks dated yesterday and undated, every view's `done` holds both, and Today's `overdue` holds neither.
- Given two overdue tasks dated two days ago at `18:00` and yesterday with no time, Today's `overdue` lists the older first.
- Given search text or labels, every view's `todo`, `overdue` and `done` are narrowed by them.
- `byStatus` returns `overdue: []`.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `src/lib/dates.test.ts` and `src/stores/tasks.test.ts`. Change the existing filter case "keeps todo tasks on the chosen date and indefinite ones, and every done task" to the day view's new rule. Add `isOverdue`, `isUpcoming` and the new types with their real signatures first, so the tests fail on behaviour.

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/lib/dates.test.ts src/stores/tasks.test.ts -t "isOverdue|isUpcoming|view|filter|byStatus"`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation** to the Interfaces, add the strings to both `tasks.json` files, and update the one `tasksStore.filter` call in `src/views/HomeView.vue`

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/lib/dates.test.ts src/stores/tasks.test.ts -t "isOverdue|isUpcoming|view|filter|byStatus"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/dates.ts src/lib/dates.test.ts src/stores/tasks.ts src/stores/tasks.test.ts src/views/HomeView.vue src/i18n/locales/en/tasks.json src/i18n/locales/hi/tasks.json
git commit -m "feat(tasks): filter tasks by view, with an overdue group"
```

### Task 2: The Overdue group on the board

**Files:**
- Modify: `src/components/tasks/TaskBoard.vue`
- Modify: `src/components/tasks/TaskColumn.vue`
- Create: `src/components/tasks/TaskBoard.overdue.test.ts`

**Interfaces:**
- Consumes: `TasksByStatus.overdue` from `src/stores/tasks.ts` (Task 1); the string `overdueGroup` (Task 1); existing `move` and `onMove` in `TaskColumn.vue` and `TaskBoard.vue`.
- Produces:

```ts
// src/components/tasks/TaskBoard.vue, added prop
overdue?: Task[]; // default []
// src/components/tasks/TaskColumn.vue, added prop
overdue?: Task[]; // default []; drawn only when status is 'todo' and the list isn't empty
```

**Spec:**
- §2 V4: "In Today, the Todo column shows an **Overdue** group above today's tasks, with a heading and its count, in the theme's error colour; it isn't shown when it is empty."
- §2 V4: "Its cards are ordinary cards: they are checked, dragged, edited and deleted as any other, and a task dropped on the group from Done becomes todo."

**Tags:** `screen`, `failure-paths`

**Knowledge:**
- `features/task-board`: in Today, an Overdue group with its count sits above the Todo list, and a done task dropped on it becomes todo.

**Acceptance:**
- Given `overdue` with 2 tasks, the Todo column shows a heading "Overdue · 2" in the error colour above the Todo list, and the 2 cards under it with `data-testid="task-list-overdue"` on their list.
- Given `overdue` empty, no Overdue heading or list is rendered.
- Given an overdue card, its check button marks it done, as on any card.
- Given a done task dropped on the Overdue list, the board saves `status: 'todo'` for it, as a drop on the Todo list does.
- Given `overdue` with tasks while the board shows skeletons, the group isn't rendered.
- Given a done task dropped on the Overdue list and the save rejects, the snackbar says "Couldn't save. Try again." and the task stays in Done.
- The Done column never renders an Overdue group, whatever it is given.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `src/components/tasks/TaskBoard.overdue.test.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/components/tasks/TaskBoard.overdue.test.ts`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation**: the `overdue` prop on both components and the group in `TaskColumn.vue`, a second drop target in the `tasks` group

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/components/tasks/TaskBoard.overdue.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/tasks/TaskBoard.vue src/components/tasks/TaskColumn.vue src/components/tasks/TaskBoard.overdue.test.ts
git commit -m "feat(board): an overdue group above the todo list"
```

### Task 3: View chips on Home

**Files:**
- Create: `src/components/tasks/ViewChips.vue`
- Test: `src/components/tasks/ViewChips.test.ts`
- Modify: `src/views/HomeView.vue`
- Create: `src/views/HomeView.test.ts`
- Modify: `e2e/home.spec.ts` (the midnight case)
- Modify: `e2e/smoke.spec.ts` (the steps "see it on Home under tomorrow, in Todo" and "another account signs in and sees none of it")

**Interfaces:**
- Consumes: `HomeView`, `TaskFilter` and the store's `filter` (Task 1); `UPCOMING_DAYS` (Task 1); the strings `views.*` and `header.*` (Task 1); TaskBoard's `overdue` prop (Task 2); existing `DateBar` with its `string | null` model, unchanged.
- Produces:

```ts
// src/components/tasks/ViewChips.vue
type ViewKind = 'today' | 'upcoming' | 'overdue' | 'undated' | 'all';
const model = defineModel<ViewKind | null>({ required: true }); // null while a day is picked
```

**Spec:**
- §2 V1: "Picking a day in the date bar (or from its calendar) selects that day as the view, and no chip is selected. Picking a chip leaves no day selected in the date bar. Pressing the selected day again returns to Today. Home opens on Today every time it loads; the view isn't remembered."
- §2 V8: "It counts the todo tasks the view shows, the Overdue group included"
- §2 V9: "When `today` changes, Today, Upcoming and Overdue follow it, so yesterday's unfinished tasks join the Overdue group without a reload. A picked day stays picked."

**Tags:** `screen`

**Knowledge:**
- `features/task-board`: Home opens on the Today view; view chips sit above the date bar, a picked day replaces the chip selection, and pressing the picked day again returns to Today.

**Acceptance:**
- ViewChips: given the model `'upcoming'`, the Upcoming chip is pressed and the others aren't; given `null`, none is pressed; pressing All sets the model to `'all'`. The row is labelled "Choose what to show".
- Home opens with the Today chip pressed and no day pressed in the date bar.
- Given Today with 2 overdue and 1 of today's todo tasks, the header says "3 tasks today" and the date line shows today's long date.
- Given Upcoming with 2 tasks, the header says "2 tasks in the next 7 days" and there is no date line; given Overdue with 1, "1 task overdue"; given No date with 0, "no tasks with no date"; given All with 4, "4 tasks to do".
- Given a day picked in the date bar, no chip is pressed, the board shows that day's todo tasks, and the header and date line are as before ("3 tasks tomorrow", that day's long date).
- Given a picked day, pressing a chip leaves no day pressed in the date bar.
- Given a picked day, pressing it again presses the Today chip.
- Given Today, when the day changes (the `onDayChange` callback fires with the clock on the next day), a todo task dated the old today moves into the Overdue group and the date line shows the new date.
- Given a picked day, when the day changes, the same day stays picked.
- e2e midnight case: the header still contains "today" past midnight, the date line moves to "Tuesday, 3 November 2026", and the Today chip is pressed.
- e2e smoke: the task due tomorrow is found by pressing the Upcoming chip (or tomorrow's day), and the other account's empty board is checked under All.

- [ ] **Step 1: Write the failing tests** for each unit Acceptance case, in `src/components/tasks/ViewChips.test.ts` and `src/views/HomeView.test.ts`. Create `ViewChips.vue` with its real model first, so the tests fail on behaviour.

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/components/tasks/ViewChips.test.ts src/views/HomeView.test.ts`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation**: the chip row, the view state and headers in `HomeView.vue`, the `overdue` list passed to the board; then update the three e2e steps to the views

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/components/tasks/ViewChips.test.ts src/views/HomeView.test.ts`
Expected: PASS. The e2e specs run only when the developer asks.

- [ ] **Step 5: Commit**

```bash
git add src/components/tasks/ViewChips.vue src/components/tasks/ViewChips.test.ts src/views/HomeView.vue src/views/HomeView.test.ts e2e/home.spec.ts e2e/smoke.spec.ts
git commit -m "feat(home): today, upcoming, overdue, no date and all views"
```
