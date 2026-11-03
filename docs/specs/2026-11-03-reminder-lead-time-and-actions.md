# Spec: Reminders — lead time, open the task, Mark done, snooze, badge

_2026-11-03 · status: approved 2026-11-03 · part 6 of [decisions/usability-roadmap](../../knowledge/decisions/usability-roadmap.md) · decisions: [decisions/reminder-lead-time-and-actions](../../knowledge/decisions/reminder-lead-time-and-actions.md) · builds after part 5, `docs/plans/2026-11-03-task-priority-and-checklist.md`_

## §1 Goal

Each task chooses how long before it is due to be reminded; a reminder opens its task; it can be marked done or
snoozed from the notification; and the app's icon counts what is due.

## §2 Behaviour

### Lead time

**L1 The choice.** The add screen and the edit form have a "Remind me" control with: At the due time, 5 minutes
before, 15 minutes before, 30 minutes before, 1 hour before, 1 day before. Stored as `remindBefore`, minutes, one of
`REMIND_BEFORE_OPTIONS = [0, 5, 15, 30, 60, 1440]`. A new task is `60` unless the user picks another. Quick add
(part 3) and a calendar move (part 4) keep the task's `remindBefore` (`60` for a new task). An indefinite task shows
the control disabled.

**L2 When to send.** `notifyAt` is the moment the reminder is due to go: `remindAt` (the due instant, as now) minus
`remindBefore` minutes, or `null` when `remindAt` is `null` (indefinite or done). It is worked out in
`src/services/tasks.ts` on every save that changes `date`, `time`, `indefinite`, `status` or `remindBefore`, and then
`reminded` is `false`. A save that changes none of them keeps `notifyAt` and `reminded` as they are, so an edit to
the title doesn't undo a snooze.

**L3 A moment already past.** When `notifyAt` is at or before the moment of saving, no reminder will be sent (the
run never sends late, R1). The form says "This reminder time has passed" under the control; it doesn't block the
save.

**L4 Old tasks.** A task stored without `remindBefore` reads as `60`; one without `notifyAt` reads as `null` until
it is next saved or migrated (M1).

### The run

**R1 Window.** `sendReminders` still runs `every 5 minutes`. It sends tasks with `reminded == false` and `notifyAt`
in `(now, now + RUN_INTERVAL_MS]`, `RUN_INTERVAL_MS = 5 * 60 * 1000`, earliest `notifyAt` first, through the index
`tasks (reminded ASC, notifyAt ASC)`. The open lower bound keeps "never sent late"; a reminder goes up to five
minutes early. The limits (`MAX_REMINDERS_PER_RUN`, `MAX_REMINDERS_PER_OWNER`, `REMINDER_CONCURRENCY`), the
dead-token handling and the notification document stay as they are.

**R2 The message.** The push becomes data-only: `data: { title, body, taskId }` with the same `REMINDER_TITLE` and
`reminderBody` text as now, and no `notification` part, so the service worker shows it (A1). The body still names
the due time, not the moment it was sent.

### Actions

**A1 The notification.** The service worker shows the reminder with its title, body and icon, the `taskId` in its
data, and two buttons: **Mark done** (`action: 'done'`) and **Snooze 15 min** (`action: 'snooze'`). Browsers that
show no buttons (iOS) show the reminder alone.

**A2 What a click opens.** The service worker opens or focuses the app at:

| Click | Address |
|---|---|
| The notification itself | `/home?task=<taskId>` |
| Mark done | `/home?task=<taskId>&do=done` |
| Snooze 15 min | `/home?task=<taskId>&do=snooze` |

An open window is focused and told the address by message, as the current `OPEN_NOTIFICATIONS` handshake does, so
nothing typed in an open form is lost; with none, a new window opens there. A foreground reminder's snackbar
**View** opens the same `/home?task=<taskId>`.

**A3 Home opens the task.** Home reads `task` and `do` once, then replaces the address with plain `/home`. It picks
the day view of the task's date, or No date for an undated task (part 2's views), scrolls to its card, focuses it
and outlines it for `HIGHLIGHT_MS = 2000`. Then, for `do=done` on a todo task, it marks it done as the check button
does, with part 1's Undo; for `do=snooze` it snoozes it 15 minutes (S1). A task that doesn't exist (deleted, or not
the user's) shows "That task no longer exists." and changes nothing; `do` on a done task does nothing more than
open it. A signed-out click goes through sign-in and back, as any address does.

### Snooze

**S1 What it does.** Snoozing sets `notifyAt` to now plus `15` or `60` minutes and `reminded` to `false`, changing
nothing else, through a store action that saves only those two fields. The snackbar says "Snoozed until 5:15 PM"
with Undo, which restores the `notifyAt` and `reminded` it had. A snooze may move `notifyAt` past the due time.
It never times out or retries.

**S2 Where.** On the push (15 minutes, A1) and on the notifications screen, where each reminder whose task is still
todo shows **Snooze 15 min** and **Snooze 1 hour** beside its delete button. A reminder whose task is done or gone
shows no snooze buttons. Each reminder in the list also opens its task (A3) when pressed.

### Badge

**B1** Where the browser has `navigator.setAppBadge`, the app's icon shows the number of todo tasks that are overdue
or dated today (part 2's `isOverdue`, and `date == today`), or no badge when that is `0`. It updates whenever the
tasks change while the app is open and when the day changes (D3), and is cleared on sign-out. While the app is
closed it keeps its last number; no push changes it. Where the API is missing, nothing happens.

### Storage, rules and migration

**D1 Fields.** `remindBefore` (integer) and `notifyAt` (timestamp or `null`) join the task's stored fields
(`storedFields`, `taskFields()`). `firestore.rules` checks `remindBefore in [0, 5, 15, 30, 60, 1440]` and
`notifyAt == null || notifyAt is timestamp`. `firestore.indexes.json` gains `tasks (reminded ASC, notifyAt ASC)`;
the `(reminded, remindAt)` index stays until the migration has run, then is removed in a later change.

**M1 Migration.** `functions/scripts/migrate-legacy.ts` gains a step: a task without `remindBefore` gets `60`, and
without `notifyAt` gets `remindAt` minus 60 minutes, or `null` when `remindAt` is `null`. Fields a task already has
are left alone; `--dry-run` writes nothing; running it again changes nothing, as the script already promises.

**M2 Deploy order.** (1) A push to `master` deploys the rules, the indexes and hosting, as now; until the functions
change, the old run still reads `remindAt` and sends as before. (2) The developer runs the migration. (3) The
developer deploys the functions by the manual run. Reminders keep going throughout. The steps are added to
[operations/deploy](../../knowledge/operations/deploy.md).

### Text

**X1** New strings go in `src/i18n/locales/{en,hi}/*.json` with the same keys: the Remind me control and its six
options, "This reminder time has passed", "That task no longer exists.", "Snoozed until {time}", the snooze buttons.
The push's own texts (its title, body and button labels) stay English, as the reminder's title and body are today:
the function doesn't know the user's language.

## §3 Design

- `src/lib/dates.ts`: `computeNotifyAt(remindAt, remindBefore)`.
- `src/services/tasks.ts`: `remindBefore` and `notifyAt` in `normalise`, `storedFields`, the schedule-changed test;
  `snoozeTask(task, minutes)` writing `notifyAt` and `reminded` only. `src/services/legacy.ts` reads them (L4).
- `functions/src/dueTasks.ts`: `RUN_INTERVAL_MS`, `dueWindow` over it; `functions/src/reminders.ts`: the query on
  `notifyAt` and the data-only message.
- `src/sw.ts`: shows the data message with its actions, and routes clicks per A2.
- `src/pwa/useMessaging.ts`: the foreground View opens the task; the window message carries the address.
- `src/views/HomeView.vue`: A3. `src/views/NotificationsView.vue`: S2. `src/pwa/useBadge.ts`: B1.

## §4 Security and hostile input

- `task` and `do` in Home's address can come from any link: `task` is only looked up among the user's own loaded
  tasks (never fetched by id), `do` is one of `done` or `snooze` or ignored, and both leave the address once read.
  A crafted link can at most mark one of the user's own tasks done, with Undo shown.
- The service worker only builds same-origin addresses from a `taskId` in the push's data, encoded with
  `encodeURIComponent`; it never opens a URL the push names.
- `remindBefore` and `notifyAt` are checked by the rules on every write. A client could set any `notifyAt` on its
  own tasks, which only changes when it is itself reminded; the per-owner limit still bounds a run.

## §5 Tests

Written first, each run alone:

- `src/lib/dates.test.ts`: `computeNotifyAt` for each option, across a DST change, `null` in, `null` out.
- `src/services/tasks.test.ts`: L2's recompute and keep rules; `snoozeTask` writes only its two fields.
- `tests/rules/firestore.rules.test.ts`: `remindBefore: 7` refused; `notifyAt: 'soon'` refused; both valid allowed.
- `functions/src/dueTasks.test.ts` and `functions/src/reminders.test.ts`: R1's window edges (exactly `now`
  excluded, `now + 5 min` included), the data-only message, nothing else changed.
- `functions/scripts/migrate-legacy.test.ts`: M1, including a second run changing nothing.
- The service worker's click routing as a pure function, `clickTarget(action, taskId)` in
  `src/pwa/reminderClick.ts`, tested in `src/pwa/reminderClick.test.ts`, so `src/sw.ts` only calls it.
- `src/views/HomeView.test.ts`: A3, including a missing task and `do` on a done task.
- `src/views/NotificationsView.test.ts`: S2. `src/pwa/useBadge.test.ts`: B1.

## §6 Out of scope

Several reminders per task; a reminder for an undated task; translating the push's text; badge counts sent by
push; a custom snooze length.
