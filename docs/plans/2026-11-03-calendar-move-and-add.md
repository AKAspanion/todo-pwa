# Calendar move and add Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:implement-with-subagents by default, or ga:implement. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the calendar, todo tasks move to another day or time by dragging or with a Move button, with Undo, and clicking empty space opens the add screen with that date and time.

**Architecture:** `useCalendarDrag` holds the drag's states and works out where a task would land from the timestamps `v-calendar` forwards with its prefixed events (`mousedown:event`, `mousemove:time`, `mouseup:day` and so on). `CalendarView` wires the drag, the empty-space clicks, the save through the tasks store's `update` and the undo snack. The details dialog gains a Move form that emits the move for the view to save. The add screen reads `date` and `time` from its address.

**Tech Stack:** Vue 3.5 (`<script setup lang="ts">`), Vuetify 4.3 `v-calendar`, Pinia, vue-i18n 11, dayjs, Vitest with `@vue/test-utils`, Playwright for `e2e/calendar.spec.ts`.

**Spec:** `docs/specs/2026-11-03-calendar-move-and-add.md`

**Builds after:** `docs/plans/2026-11-03-board-fixes.md` (`UNDO_TIMEOUT_MS`, the undo snack pattern) and `docs/plans/2026-11-03-quick-capture.md` (the add screen reading its address once and replacing it with `/add`). Their code is taken as already there.

## Global Constraints

- §2 M1: "Only todo tasks."
- §2 M4: "A drop saves only `date` and `time` through the tasks store's `update`, as an edit does"
- §2 M4: "The save never times out or retries"
- §2 M5: Undo is offered "for part 1's `UNDO_TIMEOUT_MS = 8000`".
- Dates and times are local wall-clock `'YYYY-MM-DD'` and `'HH:mm'` values, never instants ([domain/local-dates](../../knowledge/domain/local-dates.md)).
- New strings go in `src/i18n/locales/en/calendar.json` and `src/i18n/locales/hi/calendar.json`, with the same keys.
- No change to `firestore.rules`; no new dependency.

## Checkpoints

None (`run.checkpoints: none`). The run stops only where the developer names a stop.

---

### Task 1: Time snapping, the drag logic and the strings

**Files:**
- Modify: `src/lib/dates.ts`
- Test: `src/lib/dates.test.ts`
- Create: `src/components/calendar/useCalendarDrag.ts`
- Create: `src/components/calendar/useCalendarDrag.test.ts`
- Modify: `src/i18n/locales/en/calendar.json`
- Modify: `src/i18n/locales/hi/calendar.json`

**Interfaces:**
- Consumes: existing `parseHm` in `src/lib/dates.ts`; the `Task` type.
- Produces:

```ts
// src/lib/dates.ts
/** Rounds 'HH:mm' to the nearest step, never past 23:59 of the same day. */
export function snapTime(hhmm: string, stepMinutes: number): string;
/** Rounds 'HH:mm' down to :00 or :30. */
export function floorHalfHour(hhmm: string): string;

// src/components/calendar/useCalendarDrag.ts
export const HOLD_MS = 300;
export const DRAG_THRESHOLD_PX = 4;
export const SNAP_MINUTES = 15;
export type DragState = 'idle' | 'pressed' | 'dragging';
/** time null: keep the task's own time. */
export interface DropTarget { date: string; time: string | null }
export interface CalendarMove { task: Task; date: string; time: string | null }
export interface CalendarDrag {
  state: Readonly<Ref<DragState>>;
  dragged: Readonly<Ref<Task | null>>;
  target: Readonly<Ref<DropTarget | null>>;
  /** A press on an event: mouse starts at once, touch after HOLD_MS. */
  press(task: Task, pointer: { x: number; y: number; touch: boolean }): void;
  /** The pointer moved; a mouse press becomes a drag past DRAG_THRESHOLD_PX, a touch hold is cancelled. */
  move(pointer: { x: number; y: number }): void;
  /** Over a month cell or an all-day row. */
  overDay(date: string): void;
  /** Over a week or day time slot, at the raw time the calendar reports. */
  overTime(date: string, time: string): void;
  /** Released: the move to save, or null when it was a click, a cancel, or no change. */
  release(): CalendarMove | null;
  cancel(): void;
}
export function useCalendarDrag(isPending: (taskId: string) => boolean): CalendarDrag;
```

New keys in `calendar.json`, English then Hindi:

| Key | en | hi |
|---|---|---|
| `move.button` | `Move` | `खिसकाएँ` |
| `move.date` | `Date` | `तारीख` |
| `move.time` | `Time` | `समय` |
| `move.save` | `Save` | `सहेजें` |
| `move.cancel` | `Cancel` | `रद्द करें` |
| `move.moved` | `Moved to {when}` | `{when} पर खिसकाया गया` |
| `undo` | `Undo` | `पहले जैसा करें` |
| `errors.save` | `Couldn't save. Try again.` | `सहेजा नहीं जा सका। फिर से कोशिश करें।` |

**Spec:**
- §2 M2: "pressing on an event and moving it more than `4` px starts a drag; a press without movement is still a click that opens the details."
- §2 M2: "On touch, pressing and holding an event for `HOLD_MS = 300` starts a drag; a shorter touch scrolls or taps as now."
- §2 M3: "A task with no time stays without one unless it is dropped on a time slot. A drop outside the calendar, or back where it started, changes nothing. Escape during a drag cancels it."
- §2 M4: "While a task's save is in flight it can't be picked up again."

**Tags:** none

**Knowledge:**
- `domain/local-dates`: calendar moves snap wall-clock times to `15` minutes with `snapTime`, and click-to-add rounds down to the half hour with `floorHalfHour`.

**Acceptance:**
- `snapTime('17:07', 15)` is `17:00`; `snapTime('17:08', 15)` is `17:15`; `snapTime('23:53', 15)` is `23:45`, never `24:00`.
- `floorHalfHour('09:29')` is `09:00`; `floorHalfHour('09:30')` is `09:30`; `floorHalfHour('00:00')` is `00:00`.
- A todo task pressed with the mouse and moved 3 px stays `pressed`; moved 5 px it is `dragging`; released while `pressed`, `release()` returns `null` (a click).
- A touch press becomes `dragging` only after `HOLD_MS` (fake timers); a `move` of more than `DRAG_THRESHOLD_PX` before then cancels it back to `idle`.
- A done task's press leaves the state `idle`; so does a press on a task whose `isPending` is true.
- Dragging a task dated `2026-11-05` at `09:00`, `overDay('2026-11-07')` then `release()` returns date `2026-11-07`, time `09:00`.
- `overTime('2026-11-07', '17:08')` then `release()` returns time `17:15`.
- A task with no time: `overDay` keeps time `null`; `overTime('2026-11-07', '10:02')` gives `10:00`.
- Released over its own date and time, `release()` returns `null`.
- Released with no target (outside the calendar), `release()` returns `null`.
- `cancel()` while dragging returns the state to `idle`, and a later `release()` returns `null`.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `src/lib/dates.test.ts` and `src/components/calendar/useCalendarDrag.test.ts`. Create the functions with their real signatures first.

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/lib/dates.test.ts src/components/calendar/useCalendarDrag.test.ts -t "snapTime|floorHalfHour|drag"`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation** to the Interfaces, and add the strings to both `calendar.json` files

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/lib/dates.test.ts src/components/calendar/useCalendarDrag.test.ts -t "snapTime|floorHalfHour|drag"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/dates.ts src/lib/dates.test.ts src/components/calendar/useCalendarDrag.ts src/components/calendar/useCalendarDrag.test.ts src/i18n/locales/en/calendar.json src/i18n/locales/hi/calendar.json
git commit -m "feat(calendar): drag logic and time snapping for moving tasks"
```

### Task 2: The add screen reads a date and time

**Files:**
- Modify: `src/views/TaskAddView.vue`
- Modify: `src/views/TaskAddView.test.ts`

**Interfaces:**
- Consumes: existing `parseYmd` and `parseHm` in `src/lib/dates.ts`; the add screen's reading of its address once on open, and its route replacement with `/add` (quick-capture plan).
- Produces: `/add?date=YYYY-MM-DD&time=HH:mm` fills the date and time fields; Task 3 links to it.

**Spec:**
- §2 A2: "The add screen reads `date` (`YYYY-MM-DD`) and `time` (`HH:mm`) once when it opens"
- §2 A2: "A value that isn't a valid date or time is ignored, and the field keeps its usual default. Nothing is saved until the user presses Add."
- §4: "they only fill fields, are checked with the existing `parseYmd` and `parseHm`, and are dropped from the address once read."

**Tags:** `security`

**Knowledge:**
- `features/add-task`: the add screen fills its date and time from `?date=` and `?time=`, checked with `parseYmd` and `parseHm`, and then clears the address.

**Acceptance:**
- `/add?date=2026-11-06&time=14:30` opens with the date `2026-11-06`, the time `14:30`, and "No due date" off; nothing is saved.
- `/add?date=2026-11-06` opens with that date and an empty time.
- `/add?date=2026-02-31` and `/add?date=tomorrow` keep the usual default date; `/add?time=25:00` keeps an empty time.
- After reading, the route is replaced with `/add` and no query.
- `/add?date=2026-11-06&title=Call` fills both the date and the title (the share values still work beside them).

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `src/views/TaskAddView.test.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/views/TaskAddView.test.ts -t "date|time"`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation**: read `date` and `time` beside the share values

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/views/TaskAddView.test.ts -t "date|time"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/views/TaskAddView.vue src/views/TaskAddView.test.ts
git commit -m "feat(add): fill the date and time from the address"
```

### Task 3: Drag to move and click to add on the calendar

**Files:**
- Modify: `src/views/CalendarView.vue`
- Create: `src/views/CalendarView.test.ts`
- Modify: `e2e/calendar.spec.ts`

**Interfaces:**
- Consumes: `useCalendarDrag`, `CalendarMove`, `SNAP_MINUTES` (Task 1); `floorHalfHour` (Task 1); the strings `move.moved`, `undo`, `errors.save` (Task 1); `/add?date&time` (Task 2); existing `tasksStore.update(task, patch)`, `ui.showSnack`, `relativeDayLabel`, `formatTime12`; `UNDO_TIMEOUT_MS` (board-fixes plan).
- Produces, in `src/views/CalendarView.vue`, the one save path a move takes, which Task 4's Move button uses too:

```ts
/** Saves the new date and time, offers Undo, and on failure says so; never retries. */
async function moveTask(task: Task, date: string, time: string | null): Promise<boolean>;
```

On touch, `v-calendar` sends `touchmove` to the element the touch started on, so the view finds the day cell or time slot under the finger with `document.elementFromPoint` and feeds `overDay` or `overTime`.

**Spec:**
- §2 A1: "Clicking a day's number still opens that day's view, and clicking an event still opens its details, as now."
- §2 M2: "While dragging, the event shows where it would land (the day cell, or the slot and its time)."
- §2 M4: "The event stays at its new place while saving; if the save fails, it goes back and the snackbar says"
- §2 M5: "After a move is saved, the snackbar says where it went"
- §2 M5: "Undo saves the date and time it had before."

**Tags:** `failure-paths`, `screen`

**Knowledge:**
- `features/calendar`: a todo task is dragged to another day (month) or day and time in `15`-minute steps (week, day), press and hold on touch, with Undo; clicking empty space opens `/add` with the date, and in a time slot the time rounded down to the half hour.

**Acceptance:**
- In month view, clicking empty space in the cell for `2026-11-06` navigates to `/add?date=2026-11-06`; clicking its day number opens the day view, as now.
- In week view, clicking the slot at `14:20` on `2026-11-06` navigates to `/add?date=2026-11-06&time=14:00`; clicking the all-day row navigates to `/add?date=2026-11-06`.
- Clicking an event opens its details, and doesn't navigate.
- In month view, dragging a todo task from `2026-11-05` to `2026-11-07` calls `update` with exactly `{ date: '2026-11-07', time: <its time> }`, and the event shows on `2026-11-07` while saving.
- When that save succeeds, the snackbar says `Moved to Saturday, 7 Nov, 9:00 AM` (the task's time) with Undo and a timeout of `8000`; Undo calls `update` with `{ date: '2026-11-05', time: '09:00' }`.
- When the save rejects, the event is back on `2026-11-05` and the snackbar says "Couldn't save. Try again." with no Undo.
- A done task's event can't be dragged: pressing and moving it changes nothing, and clicking it opens its details.
- Escape during a drag ends it with no save.
- e2e: a mouse drag in month view moves a task to another day, and in week view to another time; the stored `date` and `time` match. Runs when the developer asks.

- [ ] **Step 1: Write the failing tests** for each unit Acceptance case, in `src/views/CalendarView.test.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/views/CalendarView.test.ts`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation**: the calendar's prefixed event handlers feeding `useCalendarDrag`, the landing preview, `moveTask` with its undo snack, the empty-space clicks; then the two e2e cases in `e2e/calendar.spec.ts`

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/views/CalendarView.test.ts`
Expected: PASS. The e2e cases run when the developer asks.

- [ ] **Step 5: Commit**

```bash
git add src/views/CalendarView.vue src/views/CalendarView.test.ts e2e/calendar.spec.ts
git commit -m "feat(calendar): drag tasks to another day or time, and add from empty space"
```

### Task 4: The Move button in the details dialog

**Files:**
- Modify: `src/components/calendar/TaskDetailsDialog.vue`
- Create: `src/components/calendar/TaskDetailsDialog.test.ts`
- Modify: `src/views/CalendarView.vue` (`@move` calls `moveTask`; the dialog is told whether it worked)

**Interfaces:**
- Consumes: `moveTask(task, date, time)` (Task 3); the strings `move.*` and `errors.save` (Task 1); existing `DateField` and `TimeField` from `src/components/fields/`.
- Produces:

```ts
// src/components/calendar/TaskDetailsDialog.vue, added
defineProps<{ task: Task | null; moving: 'saving' | 'failed' | null }>();
defineEmits<{ close: []; move: [task: Task, date: string, time: string | null] }>();
```

**Spec:**
- §2 B1: "The task details dialog shows **Move** for a todo task."
- §2 B1: "Save moves the task as M4 and M5 do and closes the dialog; a failed save keeps the fields open with"
- §2 B1: "A done task has no Move button."
- §2 B2: "The Move button, its fields, Save and Cancel are reachable with Tab and work with Enter and Escape, as the dialog's other controls do."

**Tags:** `failure-paths`, `screen`

**Knowledge:**
- `features/calendar`: the task details dialog has a Move button for todo tasks, with date and time fields, for keyboard and screen-reader users.

**Acceptance:**
- A todo task's dialog shows a "Move" button; a done task's doesn't.
- Pressing Move shows a date field holding the task's date and a time field holding its time, with Save and Cancel.
- Changing the date to `2026-11-09` and pressing Save emits `move` with the task, `2026-11-09` and its time.
- Clearing the time and pressing Save emits `move` with time `null`.
- Cancel and Escape close the fields without emitting `move`, leaving the dialog open on the details.
- With `moving` `'saving'`, Save shows its loading state and doesn't emit again; with `'failed'`, the fields stay open and say "Couldn't save. Try again.".
- In the view, a `move` from the dialog calls `moveTask`; when it succeeds the dialog closes and the undo snack shows.
- Tab reaches Move, the date field, the time field, Save and Cancel in that order; Enter on Save saves.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `src/components/calendar/TaskDetailsDialog.test.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/components/calendar/TaskDetailsDialog.test.ts`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation**: the Move form in the dialog and the `@move` wiring in `CalendarView.vue`

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/components/calendar/TaskDetailsDialog.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/TaskDetailsDialog.vue src/components/calendar/TaskDetailsDialog.test.ts src/views/CalendarView.vue
git commit -m "feat(calendar): move a task from its details"
```
