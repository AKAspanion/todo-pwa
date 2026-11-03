# Spec: Calendar — move tasks and add from empty space

_2026-11-03 · status: approved 2026-11-03 · part 4 of [decisions/usability-roadmap](../../knowledge/decisions/usability-roadmap.md) · decisions: [decisions/calendar-move-and-add](../../knowledge/decisions/calendar-move-and-add.md) · builds after part 3, `docs/plans/2026-11-03-quick-capture.md`_

## §1 Goal

A todo task can be moved to another day or time from the calendar, by dragging it or with a Move button, and a
task can be added from an empty day or time slot. No new task fields, no change to `firestore.rules`, and no new
dependency.

## §2 Behaviour

### Adding

**A1 Empty space adds.** Clicking empty space opens `/add` with the date filled in:

| Where | Opens |
|---|---|
| A month cell, outside its day number and its events | `/add?date=<that day>` |
| A week or day time slot | `/add?date=<that day>&time=<the time, rounded down to :00 or :30>` |
| The all-day row of a week or day view | `/add?date=<that day>` |

Clicking a day's number still opens that day's view, and clicking an event still opens its details, as now.

**A2 The add screen reads them.** The add screen reads `date` (`YYYY-MM-DD`) and `time` (`HH:mm`) once when it
opens, beside part 3's `title`, `text` and `url`, and then replaces the address with plain `/add`. A value that
isn't a valid date or time is ignored, and the field keeps its usual default. Nothing is saved until the user
presses Add.

### Moving by drag

**M1 What moves.** Only todo tasks. A done task's event can't be picked up; clicking it opens its details as now.

**M2 Picking up.** With a mouse, pressing on an event and moving it more than `4` px starts a drag; a press
without movement is still a click that opens the details. On touch, pressing and holding an event for
`HOLD_MS = 300` starts a drag; a shorter touch scrolls or taps as now. While dragging, the event shows where it
would land (the day cell, or the slot and its time).

**M3 Where it lands.**

| View | Drop on | New date | New time |
|---|---|---|---|
| Month | a day cell | that day | unchanged |
| Week, Day | a time slot | that day | the slot's time, rounded to the nearest `SNAP_MINUTES = 15` |
| Week, Day | the all-day row | that day | unchanged |

A task with no time stays without one unless it is dropped on a time slot. A drop outside the calendar, or back
where it started, changes nothing. Escape during a drag cancels it.

**M4 Saving.** A drop saves only `date` and `time` through the tasks store's `update`, as an edit does, so
`timeZone`, `remindAt` and `reminded` are worked out again ([data/task](../../knowledge/data/task.md)). The event
stays at its new place while saving; if the save fails, it goes back and the snackbar says
"Couldn't save. Try again." The save never times out or retries
([decisions/saves-never-time-out](../../knowledge/decisions/saves-never-time-out.md)). While a task's save is in
flight it can't be picked up again.

**M5 Undo.** After a move is saved, the snackbar says where it went, such as "Moved to Friday, 6 Nov, 5:00 PM",
and offers **Undo** for part 1's `UNDO_TIMEOUT_MS = 8000`. Undo saves the date and time it had before.

### Moving with the Move button

**B1 The button.** The task details dialog shows **Move** for a todo task. It opens date and time fields
(`DateField` and `TimeField` from `src/components/fields/`, as the add screen uses) filled with the task's date and time, with Save and
Cancel. Save moves the task as M4 and M5 do and closes the dialog; a failed save keeps the fields open with
"Couldn't save. Try again.". A done task has no Move button.

**B2 Keyboard.** The Move button, its fields, Save and Cancel are reachable with Tab and work with Enter and
Escape, as the dialog's other controls do.

### Text

**T1** New strings go in `src/i18n/locales/{en,hi}/calendar.json` with the same keys in both: Move, Save, Cancel,
the date and time labels, "Moved to {when}", and Undo where the calendar namespace needs its own.

## §3 Design

- `src/components/calendar/useCalendarDrag.ts`: the drag state machine (idle, pressed, dragging, saving) fed by
  `v-calendar`'s forwarded events (`mousedown:event`, `mousemove:time`, `mousemove:day`, `mouseup:time`,
  `mouseup:day`, and the `touch*` ones), returning where the event would land. Pure enough to test without a
  browser: it takes the timestamps the calendar passes and returns the target date and time.
- `src/lib/dates.ts`: `snapTime(hhmm, minutes)` and `floorHalfHour(hhmm)`, wall-clock arithmetic only.
- `src/views/CalendarView.vue`: wires the drag, the empty-space clicks and the undo snack.
- `src/components/calendar/TaskDetailsDialog.vue`: the Move button and its fields, emitting
  `move: [task: Task, date: string, time: string | null]`; the view saves.
- `src/views/TaskAddView.vue`: reads `date` and `time`.

## §4 Security and hostile input

- `date` and `time` in the add screen's address come from a link anyone could craft: they only fill fields, are
  checked with the existing `parseYmd` and `parseHm`, and are dropped from the address once read.
- A move writes through the existing update rule; nothing new reaches Firestore.

## §5 Tests

Written first, each run alone:

- `src/lib/dates.test.ts`: `snapTime` at `17:07` → `17:00`, `17:08` → `17:15`, `23:53` → `23:45` (never past the
  day); `floorHalfHour` at `09:29` → `09:00`, `09:30` → `09:30`.
- `src/components/calendar/useCalendarDrag.test.ts`: the table of M3, a press without movement is a click, a hold
  under `HOLD_MS` doesn't start, Escape cancels, a drop on the start changes nothing, a done task can't start.
- `src/views/CalendarView.test.ts`: A1's three openings, M4's failure putting the event back, M5's Undo.
- `src/components/calendar/TaskDetailsDialog.test.ts`: B1 and B2.
- `src/views/TaskAddView.test.ts`: A2's valid and invalid values and the address replaced.
- `e2e/calendar.spec.ts`: a mouse drag in month view and in week view, run when the developer asks.

## §6 Out of scope

Dragging to resize a task (tasks have no length); moving several tasks at once; dragging from Home's board onto
the calendar; changing the week's first day.
