# Spec: Home views — Today, Upcoming, Overdue, No date, All

_2026-11-03 · status: approved 2026-11-03 · part 2 of [decisions/usability-roadmap](../../knowledge/decisions/usability-roadmap.md) · decisions: [decisions/home-views](../../knowledge/decisions/home-views.md) · builds after part 1, `docs/plans/2026-11-03-board-fixes.md`_

## §1 Goal

A todo task from an earlier day never drops out of sight: Home opens on Today, which lists overdue tasks first,
and the user can switch to Upcoming, Overdue, No date or All, or pick a day. No new task fields and no change to
`firestore.rules`.

## §2 Behaviour

**V1 Views.** A row of chips sits above the date bar: **Today**, **Upcoming**, **Overdue**, **No date**, **All**,
one of them selected at a time. Picking a day in the date bar (or from its calendar) selects that day as the view,
and no chip is selected. Picking a chip leaves no day selected in the date bar. Pressing the selected day again
returns to Today. Home opens on Today every time it loads; the view isn't remembered.

**V2 Which todo tasks each view shows.** `today` is the device's local date as Home already computes it
(`todayYmd`, recomputed at midnight and when the app becomes visible, D3 of the 2026-11-02 spec). A task is
*undated* when it is indefinite or has no date.

| View | Todo tasks shown |
|---|---|
| Today | overdue tasks, then tasks dated `today` |
| Upcoming | tasks dated after `today` and at most `UPCOMING_DAYS = 7` days after it |
| Overdue | tasks dated before `today` |
| No date | undated tasks |
| All | every todo task |
| A day | tasks dated that day; undated tasks no longer show on a day |

**V3 Overdue.** A todo task is overdue when its date is before `today`. The time of day doesn't count: a task due
today at 9:00 is today's at 10:00. Done tasks are never overdue.

**V4 The Overdue group.** In Today, the Todo column shows an **Overdue** group above today's tasks, with a heading
and its count, in the theme's error colour; it isn't shown when it is empty. Its cards are ordinary cards: they are
checked, dragged, edited and deleted as any other, and a task dropped on the group from Done becomes todo. Other
views have no group.

**V5 Done tasks.** Every view shows every done task in the Done column, narrowed by search and labels only, as the
board does today.

**V6 Search and labels** narrow every view, as they narrow the board today.

**V7 Order.** Within each list, the existing order holds: by date, then time, undated last (`compareTasks`, D9).
The Overdue group is in that order too, so the oldest overdue task is first.

**V8 The header.** It counts the todo tasks the view shows, the Overdue group included:

| View | Header | Date line |
|---|---|---|
| Today | "3 tasks today" (as now) | today's long date (as now) |
| Upcoming | "3 tasks in the next 7 days" | none |
| Overdue | "3 tasks overdue" | none |
| No date | "3 tasks with no date" | none |
| All | "3 tasks to do" (as now) | none |
| A day | as now: "3 tasks tomorrow", "3 tasks on Friday, 6 November" | that day's long date |

**V9 Midnight.** When `today` changes, Today, Upcoming and Overdue follow it, so yesterday's unfinished tasks join
the Overdue group without a reload. A picked day stays picked.

**V10 Text.** New strings go in `src/i18n/locales/en/tasks.json` and `src/i18n/locales/hi/tasks.json`, with the
same keys: the five chip names, the view row's label, the Overdue group heading, and the four new headers.

## §3 Design

- `src/stores/tasks.ts`: the filter takes the view and today instead of a date, and returns the Overdue group
  separately:

  ```ts
  export type HomeView =
    | { kind: 'today' | 'upcoming' | 'overdue' | 'undated' | 'all' }
    | { kind: 'day'; date: string };
  export interface TaskFilter { text: string; labelIds: string[]; view: HomeView; today: string }
  export interface TasksByStatus { todo: Task[]; done: Task[]; overdue: Task[] }
  ```

  `overdue` is filled only in Today; elsewhere it is empty and the view's tasks are all in `todo`. `byStatus`
  returns an empty `overdue`. The date arithmetic (`isOverdue`, `isUpcoming`) goes in `src/lib/dates.ts`, beside
  the other wall-clock helpers, comparing `'YYYY-MM-DD'` values and never parsing them as UTC
  ([domain/local-dates](../../knowledge/domain/local-dates.md)).
- `src/components/tasks/ViewChips.vue`: the chip row; its model is the view kind, or `null` while a day is picked.
- `src/components/DateBar.vue`: pressing the selected day sets the model to `null`, as now; Home reads `null` as
  "back to Today".
- `src/views/HomeView.vue`: holds the view, builds the filter, and computes the header and date line.
- `src/components/tasks/TaskBoard.vue` and `TaskColumn.vue`: an `overdue` list, drawn as a group above the Todo
  column's list, each its own drop target in the `tasks` group.

## §4 Security and hostile input

Nothing new reaches Firestore: the views only choose among tasks already loaded. A legacy date such as `"NA"`
already reads as undated ([domain/legacy-documents](../../knowledge/domain/legacy-documents.md)), so it shows in No
date and All, never as overdue.

## §5 Tests

Written first, each run alone:

- `src/lib/dates.test.ts`: `isOverdue` and `isUpcoming` at the edges (yesterday, today, today + 7, today + 8),
  across a month end and a DST change.
- `src/stores/tasks.test.ts`: each view's todo tasks per V2, the Overdue group only in Today, done tasks in every
  view, search and labels in every view, undated tasks absent from a day.
- `src/components/tasks/ViewChips.test.ts`: one chip selected, none while a day is picked.
- `src/components/tasks/TaskBoard.test.ts`: the Overdue group's heading and count, absent when empty; a drop on it
  from Done marks the task todo.
- `src/views/HomeView.test.ts`: opens on Today; a chip clears the picked day; pressing the picked day returns to
  Today; each header of V8.
- The e2e cases that assume Home opens on a pressed date-bar day (`e2e/home.spec.ts`, the midnight case;
  `e2e/smoke.spec.ts`, "see it on Home under tomorrow" and "sees none of it") are updated to the views. They run
  when the developer asks.

## §6 Out of scope

Remembering the last view; a time-of-day overdue (decided against, V3); views on the calendar; archived tasks.
