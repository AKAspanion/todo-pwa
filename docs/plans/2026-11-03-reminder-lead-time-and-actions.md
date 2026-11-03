# Reminder lead time and actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:implement-with-subagents by default, or ga:implement. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each task picks how long before it is due to be reminded, a reminder opens its task, it can be marked done or snoozed from the notification, and the app's icon counts what is due.

**Architecture:** Tasks gain `remindBefore` and `notifyAt`, worked out in the tasks service and checked by the rules. The reminder run reads `notifyAt` over a five-minute window and sends a data-only push. The service worker shows it with two actions and opens `/home?task=…&do=…`, which Home reads once to open, mark done or snooze the task. The add screen and edit form pick the lead time; the notifications screen snoozes; a small composable keeps the icon badge.

**Tech Stack:** Vue 3.5, Vuetify 4, Pinia, vue-i18n 11, Firebase 13 modular SDK, vite-plugin-pwa 2 (`injectManifest`, `src/sw.ts`), firebase-functions 7 (v2) and firebase-admin 14 on Node 22 in `functions/`, Firestore rules and indexes, Vitest against the emulators.

**Spec:** `docs/specs/2026-11-03-reminder-lead-time-and-actions.md`

**Builds after:** parts 1–5 (`docs/plans/2026-11-03-board-fixes.md` to `docs/plans/2026-11-03-task-priority-and-checklist.md`): Undo, the views, the focusable card, the add screen's address reading, and the priority and checklist fields. Their code is taken as already there.

## Global Constraints

- §2 L1: "one of `REMIND_BEFORE_OPTIONS = [0, 5, 15, 30, 60, 1440]`. A new task is `60` unless the user picks another."
- §2 L2: "A save that changes none of them keeps `notifyAt` and `reminded` as they are, so an edit to the title doesn't undo a snooze."
- §2 R1: "The open lower bound keeps"
- §2 S1: "It never times out or retries."
- §2 X1: "The push's own texts (its title, body and button labels) stay English"
- Deploy order (§2 M2): rules, indexes and hosting first; then the migration; then the functions. No task deploys anything.
- New app strings go in `src/i18n/locales/en/tasks.json` and `src/i18n/locales/hi/tasks.json`, with the same keys.

## Checkpoints

None (`run.checkpoints: none`). The run stops only where the developer names a stop.

---

### Task 1: The fields, the rules, the index, snooze in the store, and the strings

**Files:**
- Modify: `src/types/models.ts`
- Modify: `src/lib/dates.ts`
- Modify: `src/lib/dates.test.ts`
- Modify: `src/lib/taskLimits.ts`
- Modify: `src/services/tasks.ts`
- Modify: `src/services/tasks.test.ts`
- Modify: `src/services/legacy.ts`
- Modify: `src/services/legacy.test.ts`
- Modify: `firestore.rules`
- Modify: `tests/rules/firestore.rules.test.ts`
- Modify: `firestore.indexes.json`
- Modify: `src/stores/tasks.ts`
- Modify: `src/stores/tasks.test.ts`
- Modify: `src/i18n/locales/en/tasks.json`
- Modify: `src/i18n/locales/hi/tasks.json`

**Interfaces:**
- Consumes: existing `computeRemindAt` in `src/lib/dates.ts`; `normalise`, `storedFields` and the schedule-changed test in `src/services/tasks.ts`; `taskFromDoc` in `src/services/legacy.ts`.
- Produces:

```ts
// src/types/models.ts
// Task gains:      remindBefore: number; notifyAt: Date | null;
// TaskInput gains: remindBefore?: number;

// src/lib/taskLimits.ts
export const REMIND_BEFORE_OPTIONS: readonly number[]; // [0, 5, 15, 30, 60, 1440]
export const DEFAULT_REMIND_BEFORE = 60;
export const SNOOZE_MINUTES: readonly number[]; // [15, 60]
export function isRemindBefore(value: unknown): value is number;

// src/lib/dates.ts
export function computeNotifyAt(remindAt: Date | null, remindBefore: number): Date | null;

// src/services/tasks.ts
/** Writes only notifyAt and reminded. */
export function setReminderState(task: Task, notifyAt: Date | null, reminded: boolean): Promise<Task>;

// src/stores/tasks.ts (actions)
/** notifyAt = now + minutes, reminded false; resolves with the state it replaced, for Undo. */
snooze(task: Task, minutes: number): Promise<{ notifyAt: Date | null; reminded: boolean }>;
setReminderState(task: Task, notifyAt: Date | null, reminded: boolean): Promise<void>;
```

```
// firestore.rules
taskFields() gains 'remindBefore', 'notifyAt'
validTaskFields gains:
  remindBefore in [0, 5, 15, 30, 60, 1440]
  notifyAt == null || notifyAt is timestamp

// firestore.indexes.json gains, beside the (reminded, remindAt) index:
{ "collectionGroup": "tasks", "queryScope": "COLLECTION",
  "fields": [ { "fieldPath": "reminded", "order": "ASCENDING" },
              { "fieldPath": "notifyAt", "order": "ASCENDING" } ] }
```

New keys in `tasks.json`, English then Hindi:

| Key | en | hi |
|---|---|---|
| `remind.label` | `Remind me` | `याद दिलाएँ` |
| `remind.options.0` | `At the due time` | `नियत समय पर` |
| `remind.options.5` | `5 minutes before` | `5 मिनट पहले` |
| `remind.options.15` | `15 minutes before` | `15 मिनट पहले` |
| `remind.options.30` | `30 minutes before` | `30 मिनट पहले` |
| `remind.options.60` | `1 hour before` | `1 घंटा पहले` |
| `remind.options.1440` | `1 day before` | `1 दिन पहले` |
| `remind.passed` | `This reminder time has passed` | `याद दिलाने का यह समय निकल चुका है` |
| `open.missing` | `That task no longer exists.` | `वह कार्य अब मौजूद नहीं है।` |
| `snooze.done` | `Snoozed until {time}` | `{time} तक टाला गया` |
| `snooze.15` | `Snooze 15 min` | `15 मिनट टालें` |
| `snooze.60` | `Snooze 1 hour` | `1 घंटा टालें` |
| `errors.snooze` | `Couldn't snooze. Try again.` | `टाला नहीं जा सका। फिर से कोशिश करें।` |

**Spec:**
- §2 L2: "`notifyAt` is the moment the reminder is due to go: `remindAt` (the due instant, as now) minus `remindBefore` minutes, or `null` when `remindAt` is `null` (indefinite or done)."
- §2 L4: "A task stored without `remindBefore` reads as `60`; one without `notifyAt` reads as `null` until it is next saved or migrated (M1)."
- §2 S1: "Snoozing sets `notifyAt` to now plus `15` or `60` minutes and `reminded` to `false`, changing nothing else"
- §2 D1: "the `(reminded, remindAt)` index stays until the migration has run, then is removed in a later change."

**Tags:** `security`

**Knowledge:**
- `data/task`: a task stores `remindBefore` (minutes, one of `[0, 5, 15, 30, 60, 1440]`) and `notifyAt`, the moment its reminder is due, recomputed only when the date, time, indefinite flag, status or lead time changes.
- `domain/legacy-documents`: a task without `remindBefore` reads as `60`, and without `notifyAt` as `null` until saved or migrated.

**Acceptance:**
- `computeNotifyAt` of 17:00 UTC with `60` is 16:00 UTC, with `0` is 17:00, with `1440` is 17:00 the day before; `null` gives `null`. Across the New York DST end (2026-11-01), a 09:00 local task with `1440` notifies exactly 24 hours earlier in UTC.
- `createTask` with no `remindBefore` stores `remindBefore: 60` and `notifyAt` an hour before `remindAt`; an indefinite task stores `notifyAt: null`.
- `updateTask` changing `time` recomputes `notifyAt` and sets `reminded` false; changing `remindBefore` from `60` to `15` does the same; changing only the title keeps `notifyAt` and `reminded` exactly as stored; marking done sets `notifyAt` `null`.
- `setReminderState` writes only `notifyAt` and `reminded`: the stored `title`, `date` and `remindAt` are unchanged.
- The store's `snooze(task, 15)` at 17:00 sets `notifyAt` 17:15 and `reminded` false, and resolves with the previous `notifyAt` and `reminded`; when the save rejects the task in the store is unchanged and the call rejects.
- `taskFromDoc` reads a missing `remindBefore`, and `remindBefore: 7`, as `60`; a missing or non-timestamp `notifyAt` as `null`.
- Rules: a create with `remindBefore: 60` and a timestamp `notifyAt` is allowed; `remindBefore: 7`, `remindBefore: '60'` and `notifyAt: 'soon'` are refused; a create without either field is refused; an owner's update setting only `notifyAt` and `reminded` is allowed; another user's is refused.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `src/lib/dates.test.ts`, `src/services/tasks.test.ts`, `src/services/legacy.test.ts`, `src/stores/tasks.test.ts` and `tests/rules/firestore.rules.test.ts`. Add the types and functions with their real signatures first.

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/lib/dates.test.ts src/services/tasks.test.ts src/services/legacy.test.ts src/stores/tasks.test.ts tests/rules/firestore.rules.test.ts -t "notifyAt|remindBefore|snooze|setReminderState|computeNotifyAt"`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation**: the types, the helpers, the service and reader changes, the rules, the index, the store actions and the strings

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/lib/dates.test.ts src/services/tasks.test.ts src/services/legacy.test.ts src/stores/tasks.test.ts tests/rules/firestore.rules.test.ts -t "notifyAt|remindBefore|snooze|setReminderState|computeNotifyAt"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/models.ts src/lib/dates.ts src/lib/dates.test.ts src/lib/taskLimits.ts src/services/tasks.ts src/services/tasks.test.ts src/services/legacy.ts src/services/legacy.test.ts firestore.rules tests/rules/firestore.rules.test.ts firestore.indexes.json src/stores/tasks.ts src/stores/tasks.test.ts src/i18n/locales/en/tasks.json src/i18n/locales/hi/tasks.json
git commit -m "feat(tasks): reminder lead time, notifyAt and snooze"
```

### Task 2: The run reads notifyAt, sends data-only, and the migration fills it

**Files:**
- Modify: `functions/src/dueTasks.ts`
- Modify: `functions/src/dueTasks.test.ts`
- Modify: `functions/src/reminders.ts`
- Modify: `functions/src/reminders.test.ts`
- Modify: `functions/scripts/migrate-legacy.ts`
- Modify: `functions/scripts/migrate-legacy.test.ts`

**Interfaces:**
- Consumes: existing `runReminders`, `remindTask`, `reminderMessage`, the limits and `settleWithConcurrency` in `functions/`; the stored field names `notifyAt` and `remindBefore` from the spec (§2 D1), not Task 1's code.
- Produces:

```ts
// functions/src/dueTasks.ts
export const RUN_INTERVAL_MS = 5 * 60 * 1000;
/** (now, now + RUN_INTERVAL_MS] */
export function dueWindow(now: Date): { from: Date; to: Date };
// REMINDER_WINDOW_MS is removed.

// functions/src/reminders.ts: the message each device gets
{ token, data: { title: REMINDER_TITLE, body, taskId }, webpush: { headers: { Urgency: 'high' } } }
```

**Spec:**
- §2 R1: "It sends tasks with `reminded == false` and `notifyAt` in `(now, now + RUN_INTERVAL_MS]`, `RUN_INTERVAL_MS = 5 * 60 * 1000`, earliest `notifyAt` first, through the index `tasks (reminded ASC, notifyAt ASC)`."
- §2 R1: "The limits (`MAX_REMINDERS_PER_RUN`, `MAX_REMINDERS_PER_OWNER`, `REMINDER_CONCURRENCY`), the dead-token handling and the notification document stay as they are."
- §2 R2: "The body still names the due time, not the moment it was sent."
- §2 M1: "a task without `remindBefore` gets `60`, and without `notifyAt` gets `remindAt` minus 60 minutes, or `null` when `remindAt` is `null`. Fields a task already has are left alone"

**Tags:** `failure-paths`

**Knowledge:**
- `domain/reminder-schedule`: a task is due for a reminder when `reminded` is false and `notifyAt` is in `(now, now + 5 min]`; the push is data-only (`title`, `body`, `taskId`), shown by the service worker.
- `operations/deploy`: for this change, the rules, indexes and hosting deploy first, then the migration runs, then the functions deploy by the manual run.

**Acceptance:**
- `dueWindow` at 12:00:00 is from 12:00:00 (excluded) to 12:05:00 (included).
- A run at 12:00 sends a task with `notifyAt` 12:05 and `remindAt` 13:00, and doesn't send one with `notifyAt` exactly 12:00, one at 12:05:01, or one with `reminded: true`.
- The body of that reminder names the due time from `remindAt` and the task's zone, as now (`Upcoming task "…" at 1:00 PM`).
- Each device's message has `data` with `title` `Task reminder`, the body and the `taskId`, and no `notification` part.
- A task with a `remindAt` in the window but no `notifyAt` isn't sent (the migration fills it).
- The per-run and per-owner limits, dead-token deletion and the notification document behave as their existing tests say.
- Migration: a task with `remindAt` 13:00 and neither new field gets `remindBefore: 60` and `notifyAt` 12:00; one with `remindAt: null` gets `notifyAt: null`; one with `remindBefore: 15` and a `notifyAt` keeps both; `--dry-run` writes nothing; a second run changes nothing.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `functions/src/dueTasks.test.ts`, `functions/src/reminders.test.ts` and `functions/scripts/migrate-legacy.test.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm --prefix functions run test -- src/dueTasks.test.ts src/reminders.test.ts scripts/migrate-legacy.test.ts`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation**: the window, the query on `notifyAt`, the data-only message, and the migration step

- [ ] **Step 4: Run them to verify they pass**

Run: `npm --prefix functions run test -- src/dueTasks.test.ts src/reminders.test.ts scripts/migrate-legacy.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add functions/src/dueTasks.ts functions/src/dueTasks.test.ts functions/src/reminders.ts functions/src/reminders.test.ts functions/scripts/migrate-legacy.ts functions/scripts/migrate-legacy.test.ts
git commit -m "feat(functions): send reminders at notifyAt as data-only pushes, and migrate notifyAt"
```

### Task 3: The notification's actions and Home opening the task

**Files:**
- Create: `src/pwa/reminderClick.ts`
- Create: `src/pwa/reminderClick.test.ts`
- Modify: `src/sw.ts`
- Modify: `src/pwa/useMessaging.ts`
- Modify: `src/pwa/useMessaging.test.ts`
- Modify: `src/views/HomeView.vue`
- Modify: `src/views/HomeView.test.ts`

**Interfaces:**
- Consumes: `snooze(task, minutes)` and `setReminderState` on the store, and the strings `open.missing`, `snooze.done`, `errors.snooze` (Task 1); the data-only push `{ title, body, taskId }` (spec §2 R2); existing `safeRedirect` in `src/router/guard.ts`; Home's views, the focusable card and the check button's status change with Undo (parts 1–3).
- Produces:

```ts
// src/pwa/reminderClick.ts
export type ReminderAction = 'done' | 'snooze' | '';
/** The same-origin path a click opens: /home?task=<encoded id>[&do=done|snooze]. */
export function clickTarget(action: string, taskId: unknown): string;
/** The message an open window gets: { type: 'OPEN_PATH', path }. */
export const OPEN_PATH = 'OPEN_PATH';
export const HIGHLIGHT_MS = 2000;
```

**Spec:**
- §2 A1: "two buttons: **Mark done** (`action: 'done'`) and **Snooze 15 min** (`action: 'snooze'`). Browsers that show no buttons (iOS) show the reminder alone."
- §2 A2: "An open window is focused and told the address by message, as the current `OPEN_NOTIFICATIONS` handshake does, so nothing typed in an open form is lost; with none, a new window opens there."
- §2 A3: "Home reads `task` and `do` once, then replaces the address with plain `/home`."
- §2 A3: "A task that doesn't exist (deleted, or not the user's) shows"
- §4: "`task` is only looked up among the user's own loaded tasks (never fetched by id), `do` is one of `done` or `snooze` or ignored"

**Tags:** `security`, `failure-paths`, `screen`

**Knowledge:**
- `integrations/fcm`: a reminder shows Mark done and Snooze 15 min; clicking it opens `/home?task=<id>`, and the buttons add `do=done` or `do=snooze`; an open window is focused and routed by an `OPEN_PATH` message.

**Acceptance:**
- `clickTarget('', 'abc')` is `/home?task=abc`; `clickTarget('done', 'abc')` is `/home?task=abc&do=done`; `clickTarget('snooze', 'a/b?c')` is `/home?task=a%2Fb%3Fc&do=snooze`; `clickTarget('evil', 'abc')` is `/home?task=abc`; a missing or non-string `taskId` gives `/home`.
- The service worker shows a data message with its title, body, icon, the `taskId` in its data and actions `done` "Mark done" and `snooze` "Snooze 15 min".
- The page, on an `OPEN_PATH` message with `/home?task=abc`, routes there; with `//evil.example` or `https://evil.example/home`, routes to `/home` (through `safeRedirect`).
- A foreground reminder's View opens `/home?task=<taskId>`.
- Home at `/home?task=t1` for a task dated `2026-11-06` shows the day view of `2026-11-06`, focuses the card of `t1`, outlines it, and the address becomes `/home`; for an undated task, the No date view.
- `/home?task=t1&do=done` on a todo task marks it done and shows "Marked done" with Undo; on a done task, only opens it.
- `/home?task=t1&do=snooze` at 17:00 snoozes it to 17:15 and says "Snoozed until 5:15 PM" with Undo; Undo restores the previous `notifyAt` and `reminded`; a failed snooze says "Couldn't snooze. Try again."
- `/home?task=nope&do=done` says "That task no longer exists." and saves nothing; `do=delete` is ignored.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `src/pwa/reminderClick.test.ts`, `src/pwa/useMessaging.test.ts` and `src/views/HomeView.test.ts`. Create `reminderClick.ts` with its real signatures first.

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/pwa/reminderClick.test.ts src/pwa/useMessaging.test.ts src/views/HomeView.test.ts -t "clickTarget|OPEN_PATH|reminder|task="`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation**: `clickTarget`, the service worker's display and click handling through it, the page's `OPEN_PATH` handling, and Home's reading of `task` and `do`

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/pwa/reminderClick.test.ts src/pwa/useMessaging.test.ts src/views/HomeView.test.ts -t "clickTarget|OPEN_PATH|reminder|task="`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pwa/reminderClick.ts src/pwa/reminderClick.test.ts src/sw.ts src/pwa/useMessaging.ts src/pwa/useMessaging.test.ts src/views/HomeView.vue src/views/HomeView.test.ts
git commit -m "feat(pwa): reminders open their task, with Mark done and Snooze"
```

### Task 4: The lead-time picker

**Files:**
- Create: `src/components/tasks/RemindBeforePicker.vue`
- Create: `src/components/tasks/RemindBeforePicker.test.ts`
- Modify: `src/views/TaskAddView.vue`
- Modify: `src/views/TaskAddView.test.ts`
- Modify: `src/components/tasks/TaskEditForm.vue`
- Modify: `src/components/tasks/TaskEditForm.test.ts`

**Interfaces:**
- Consumes: `REMIND_BEFORE_OPTIONS`, `DEFAULT_REMIND_BEFORE`, `computeNotifyAt`, `TaskInput.remindBefore` and the strings `remind.*` (Task 1); existing `computeRemindAt` and `deviceTimeZone`.
- Produces:

```ts
// src/components/tasks/RemindBeforePicker.vue
const model = defineModel<number>({ required: true });
defineProps<{ date: string | null; time: string | null; indefinite: boolean; disabled?: boolean }>();
```

**Spec:**
- §2 L1: "The add screen and the edit form have a"
- §2 L1: "An indefinite task shows the control disabled."
- §2 L3: "The form says"
- §2 L3: "under the control; it doesn't block the save."

**Tags:** `screen`

**Knowledge:**
- `features/add-task`: the add screen and the edit form choose how long before the due time to be reminded, `1 hour before` by default, and warn when that moment has passed.

**Acceptance:**
- The picker lists "At the due time", "5 minutes before", "15 minutes before", "30 minutes before", "1 hour before" and "1 day before"; a new task on the add screen starts at "1 hour before".
- Choosing "15 minutes before" and pressing Add saves `remindBefore: 15`.
- The edit form starts from the task's `remindBefore` and emits it in its patch.
- With "No due date" on, the picker is disabled.
- At 17:00 on `2026-11-03`, a task for `2026-11-03` at `17:30` with "1 hour before" shows "This reminder time has passed", and Add still saves; with "15 minutes before" it shows nothing.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `src/components/tasks/RemindBeforePicker.test.ts`, `src/views/TaskAddView.test.ts` and `src/components/tasks/TaskEditForm.test.ts`. Create the picker with its real model and props first.

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/components/tasks/RemindBeforePicker.test.ts src/views/TaskAddView.test.ts src/components/tasks/TaskEditForm.test.ts -t "remind|Remind"`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation**: the picker, placed on the add screen and in the edit form

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/components/tasks/RemindBeforePicker.test.ts src/views/TaskAddView.test.ts src/components/tasks/TaskEditForm.test.ts -t "remind|Remind"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/tasks/RemindBeforePicker.vue src/components/tasks/RemindBeforePicker.test.ts src/views/TaskAddView.vue src/views/TaskAddView.test.ts src/components/tasks/TaskEditForm.vue src/components/tasks/TaskEditForm.test.ts
git commit -m "feat(tasks): choose how long before a task to be reminded"
```

### Task 5: Snooze on the notifications screen, and the icon badge

**Files:**
- Modify: `src/views/NotificationsView.vue`
- Create: `src/views/NotificationsView.test.ts`
- Create: `src/pwa/useBadge.ts`
- Create: `src/pwa/useBadge.test.ts`
- Modify: `src/App.vue` (starts the badge)

**Interfaces:**
- Consumes: `snooze`, `setReminderState`, `SNOOZE_MINUTES` and the strings `snooze.*`, `errors.snooze` (Task 1); `isOverdue` (home-views plan); `onDayChange` and `todayYmd`; `clickTarget` is not needed: a list item opens `/home?task=<id>` itself.
- Produces:

```ts
// src/pwa/useBadge.ts
/** The number the icon shows: todo tasks overdue or dated today. */
export function badgeCount(tasks: readonly Task[], today: string): number;
/** Keeps the badge in step with the tasks store while the app is open; clears it on sign-out. */
export function useBadge(): void;
```

**Spec:**
- §2 S2: "on the notifications screen, where each reminder whose task is still todo shows **Snooze 15 min** and **Snooze 1 hour** beside its delete button."
- §2 S2: "A reminder whose task is done or gone shows no snooze buttons. Each reminder in the list also opens its task (A3) when pressed."
- §2 B1: "or no badge when that is `0`."
- §2 B1: "Where the API is missing, nothing happens."

**Tags:** `screen`, `failure-paths`, `security`

**Knowledge:**
- `features/notifications`: each reminder on the notifications screen opens its task and, while the task is todo, snoozes it 15 minutes or 1 hour.
- `features/offline-and-updates`: the installed app's icon shows the count of todo tasks overdue or due today, kept while the app is open and cleared on sign-out.

**Acceptance:**
- A reminder for a todo task shows "Snooze 15 min" and "Snooze 1 hour"; pressing "Snooze 1 hour" at 17:00 calls `snooze` with `60` and says "Snoozed until 6:00 PM" with Undo; Undo calls `setReminderState` with the previous values.
- A reminder whose task is done, or whose task isn't among the loaded tasks, shows no snooze buttons.
- A failed snooze says "Couldn't snooze. Try again." and the list is unchanged.
- Pressing a reminder opens `/home?task=<its taskId>`.
- `badgeCount` with today `2026-11-03` counts a todo task dated `2026-11-02` and one dated `2026-11-03`, and not one dated `2026-11-04`, an undated one, or a done one dated `2026-11-02`.
- With `navigator.setAppBadge` present, a count of 2 calls it with `2`; a count of 0 calls `clearAppBadge`; signing out calls `clearAppBadge`; when the day changes the count is worked out again.
- Without `navigator.setAppBadge`, nothing is called and nothing throws.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `src/views/NotificationsView.test.ts` and `src/pwa/useBadge.test.ts`. Create `useBadge.ts` with its real signatures first.

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/views/NotificationsView.test.ts src/pwa/useBadge.test.ts`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation**: the snooze buttons and open-on-press in the notifications screen, `useBadge`, and starting it in `App.vue`

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/views/NotificationsView.test.ts src/pwa/useBadge.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/views/NotificationsView.vue src/views/NotificationsView.test.ts src/pwa/useBadge.ts src/pwa/useBadge.test.ts src/App.vue
git commit -m "feat(notifications): snooze from the list, and a badge on the app icon"
```
