# Spec: Recurring tasks

_2026-11-03 · status: approved 2026-11-03 · part 7 of [decisions/usability-roadmap](../../knowledge/decisions/usability-roadmap.md) · decisions: [decisions/recurring-tasks](../../knowledge/decisions/recurring-tasks.md) (grilled with the developer) · builds after part 6, `docs/plans/2026-11-03-reminder-lead-time-and-actions.md`_

## §1 Goal

A dated task can repeat. Finishing an occurrence keeps it in Done and creates the next one, which carries the task
forward with its checklist unticked and its own reminder.

## §2 Behaviour

### The rule

**R1 Shape.** `repeat` is `null` or:

```ts
interface RepeatRule {
  freq: 'day' | 'week' | 'month' | 'year';
  interval: number;      // 1–99
  weekdays: number[];    // 'week' only: 0 (Sunday) – 6, distinct, 1–7 of them; [] otherwise
  start: string;         // 'YYYY-MM-DD', the date the schedule counts from
  until: string | null;  // 'YYYY-MM-DD', the last date an occurrence may have; null: never ends
}
```

**R2 Pattern dates.** The dates a rule allows, never before `start`:

| `freq` | Dates |
|---|---|
| `day` | `start` + k × `interval` days |
| `week` | each listed weekday in the weeks `start`'s week + k × `interval` weeks; weeks begin on Sunday, as the calendar's do |
| `month` | `start`'s month + k × `interval` months, on `start`'s day, or the month's last day when it is shorter |
| `year` | `start`'s year + k × `interval` years, on `start`'s month and day; 29 February falls on 28 February in other years |

Dates are local wall-clock values ([domain/local-dates](../../knowledge/domain/local-dates.md)); a pattern is computed
directly for k, never by stepping one day at a time, so a rule far in the past costs the same as a new one.

**R3 The next date.** `nextOccurrence(rule, occurrenceDate, today)` is the first pattern date after both
`occurrenceDate` and `today`, or `null` when that date is after `until`.

**R4 Requirements.** A repeating task has a date; "No due date" is off and disabled while Repeat is set. The time
stays optional. Done tasks can't change their rule (they have no edit form).

### Finishing an occurrence

**F1 One path.** Every way of marking a task done goes through one store action, `complete(task)`: the check
button, a drag to Done, the `x` key (part 3), the reminder's Mark done (part 6), and part 1's Undo of a move back.
For a task without `repeat`, `complete` is the status change it is today.

**F2 The next occurrence.** For a repeating todo task whose `spawnedNext` is `false`, `complete` writes in one
batch: the task with `status: 'done'` and `spawnedNext: true`; and, when `nextOccurrence` gives a date, a new task
under the document id `<seriesId>_<date>`, copying the finished one (title, description, labels, priority,
`remindBefore`, time, `repeat`, `seriesId`), with that date, `status: 'todo'`, `spawnedNext: false`, the checklist
items all unticked, and `timeZone`, `remindAt`, `notifyAt` and `reminded` worked out as for a new task. When
`nextOccurrence` gives `null`, only the task is written, and the snackbar adds "That was the last one.".

**F3 Twice.** The predictable id means two devices finishing the same occurrence write the same next occurrence,
not two. A task whose `spawnedNext` is already `true` (reopened, then done again) is marked done without creating
anything.

**F4 Undo.** Part 1's Undo after marking a repeating task done writes in one batch: the task back to `todo` with
`spawnedNext: false`, and the deletion of the occurrence `complete` created. A failed batch says "Couldn't save. Try
again." and changes nothing.

**F5 Reopening later.** Moving a done occurrence back to todo any other way only reopens it (`spawnedNext` stays
`true`); the occurrence it created stays.

### Editing, skipping, deleting

**E1 Edits** change only that occurrence; the next one copies it, so they carry forward. Turning Repeat on gives the
task a new `seriesId` (when it has none) and a rule whose `start` is the task's date. Changing the rule sets its
`start` to the task's date. Turning Repeat off sets `repeat` to `null` and keeps `seriesId`.

**E2 Moves don't move the schedule.** A calendar move (part 4), a new date in the edit form without touching
Repeat, or a snooze (part 6) changes only that occurrence; `repeat.start` stays, so the next date follows the
original schedule.

**E3 Skip.** A repeating todo card has **Skip** (an icon button labelled "Skip to the next date"). It moves the task
to `nextOccurrence(rule, its date, today)` through the store's `update`, with Undo restoring the date; nothing goes
into Done. When there is no next date, Skip is disabled.

**E4 Delete** works as part 1's: the occurrence is deleted at once, with Undo. Deleting the todo occurrence ends the
series; its done occurrences stay.

### Showing it

**S1** A repeating task's card and the calendar's task details show a repeat icon and a summary, such as
"Every day", "Every 2 weeks on Mon, Wed", "Every month on the 31st", "Every year on 29 Feb", followed by
"until 31 Dec 2026" when it ends, in the app's language.

**S2** The calendar shows only stored occurrences; no future dates are computed for display.

### Setting it

**U1 The Repeat control** on the add screen and in the edit form: Never; Every day; Every week on <the date's
weekday>; Every month on the <the date's day>; Every year on <the date's day and month>; Custom…. Custom opens:
every N (1–99) days, weeks, months or years; for weeks, weekday chips (at least one); Ends: Never, or On <date>
(not before the task's date). The presets follow the task's date as it changes until Custom is used.

**U2 Quick add** (part 3's parser) also reads, in either language, one repeat phrase: `every day`, `daily`,
`every week`, `weekly`, `every <weekday>` (and its short form), `every month`, `monthly`, `every year`, `yearly`;
`रोज़`, `रोज`, `हर दिन`, `हर हफ़्ते`, `हर हफ्ते`, `हर <weekday>`, `हर महीने`, `हर साल`. With no day typed, the task
starts on the first matching day on or after today (today counts here, unlike a lone weekday in part 3). The chip
shows the date and the repeat summary.

### Storage and rules

**D1 Fields.** `repeat` (`null` or the map of R1), `seriesId` (`null` or a string of 1–`64` characters) and
`spawnedNext` (boolean) join the task's stored fields. Old tasks read as `repeat: null`, `seriesId: null`,
`spawnedNext: false`. A malformed `repeat` reads as `null`.

**D2 Rules.** `firestore.rules` checks `repeat` is `null`, or a map whose keys are exactly `freq`, `interval`,
`weekdays`, `start`, `until`, with `freq` one of the four, `interval` an integer 1–`99`, `weekdays` a list of at most
`7`, `start` matching `YYYY-MM-DD`, and `until` `null` or matching it. `seriesId` is `null` or a string of at most
`64`; `spawnedNext` a boolean. The app checks the rest (distinct weekdays 0–6, at least one for `week`) before saving.

### Text

**X1** New strings in `src/i18n/locales/{en,hi}/tasks.json` with the same keys: the Repeat control and Custom
form, the summaries, Skip, "That was the last one.".

## §3 Design

- `src/lib/recurrence.ts`: `isRepeatRule`, `patternDatesAfter`/`nextOccurrence`, `formatRepeat(rule, locale)`.
  Pure, no Vue or Firebase.
- `src/services/tasks.ts`: the three fields in `normalise` and `storedFields`; `completeTask(task)` and
  `undoComplete(task, nextId)` as batches. `src/services/legacy.ts` reads them (D1).
- `src/stores/tasks.ts`: `complete`, `undoComplete`, `skip`. Part 1's board, part 3's keys, part 4's calendar and
  part 6's Mark done call `complete` instead of a status update.
- `src/components/tasks/RepeatPicker.vue`, `RepeatSummary.vue`.
- `src/lib/parseWhen.ts`: `repeat` in its result (U2).

## §4 Security and hostile input

- `repeat` is checked by the rules on every write that carries it; `interval` is bounded so no rule asks for an
  unbounded computation, and R2's computation is direct, not a loop over days.
- The next occurrence's id is built from the task's own `seriesId` and a date, and is written through the ordinary
  create or update rule for the caller's own tasks; a `seriesId` can't reach another user's documents.
- `seriesId` is limited to `64` characters so ids stay within Firestore's limits.

## §5 Tests

Written first, each run alone:

- `src/lib/recurrence.test.ts`: every row of R2 (including every 2 weeks on Mon, Wed across a month end; monthly on
  the 31st through February in a leap and a common year; yearly on 29 Feb), R3 (done early, on time, late, far
  late), `until` (the last one, past it), and a start 50 years back computed without stepping days.
- `tests/rules/firestore.rules.test.ts`: D2's refusals (`interval: 0`, `interval: 100`, `freq: 'hour'`, an extra key,
  `weekdays` of 8, a `seriesId` of 65) and acceptances.
- `src/services/tasks.test.ts`: F2's batch and copied fields, F3 (twice, and `spawnedNext` true), F4.
- `src/stores/tasks.test.ts`: `complete`, `undoComplete`, `skip`, E2.
- `src/lib/parseWhen.test.ts`: U2's phrases.
- Component tests for the picker (U1), the summary (S1) and the card's Skip (E3).

## §6 Out of scope

Computed future occurrences on the calendar; "the 2nd Tuesday" patterns; a number of occurrences as an end;
bulk-editing done history; repeating undated tasks.
