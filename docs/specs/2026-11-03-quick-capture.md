# Spec: Faster capture — quick add, dates in words, keyboard shortcuts, app shortcuts and share target

_2026-11-03 · status: approved 2026-11-03 · part 3 of [decisions/usability-roadmap](../../knowledge/decisions/usability-roadmap.md) · decisions: [decisions/quick-capture](../../knowledge/decisions/quick-capture.md) · builds after part 2, `docs/plans/2026-11-03-home-views.md`_

## §1 Goal

A task can be added from Home in one line, with its date typed in words, from the keyboard, from the installed
app's icon, or by sharing text to the app. No new task fields and no change to `firestore.rules`.

## §2 Behaviour

### Quick add

**Q1 The field.** A one-line field, "Add a task", sits at the top of the Todo column on Home, in every view.
Enter saves; Escape clears it and leaves it. While the save is in flight the field is read-only, and after
`SLOW_SAVE_MS` (15 s, as the board) it says it is still saving; it never times out or retries
([decisions/saves-never-time-out](../../knowledge/decisions/saves-never-time-out.md)). When the save succeeds the
field empties and keeps focus, ready for the next task. A failed save keeps the text and says
"Couldn't save. Try again.".

**Q2 The title.** The title is the text with any recognised date and time words taken out and the spaces around them
closed up. It follows the add screen's limits (`TITLE_MAX`, part 1's `src/lib/taskLimits.ts`); over it, the field
says the title is too long and doesn't save. Text that is only spaces, or only date words, doesn't save: the field
says "Enter the task's title" (`tasks.form.titleRequired`).

**Q3 The date found.** When the text holds a date or a time, a chip under the field shows what was found before
saving, in the words a card uses for when a task is due (`relativeDayLabel` and `formatTime12`), such as
"Tomorrow, 5:00 PM" or "Friday, 6 Nov". Its ✕ ignores it: the task is saved with the whole text as its title and the
default date of Q4. Typing again parses again, and a new parse brings the chip back.

**Q4 The default date.** A task with no date in its text gets: the picked day in a day view; no date (indefinite)
in the No date view; today in every other view. It has no time unless one was typed. A time typed with no day
gets the default date, or today in the No date view.

**Q5 Labels.** A quick-added task has no labels. A label filter on Home doesn't add any.

### Dates in words

**W1 What is read.** The parser (`src/lib/parseWhen.ts`) reads only whole words, ignoring case, anywhere in the
text, in both languages whatever the app's language is. It reads at most one day and one time; later ones stay in
the title.

| Kind | English | Hindi | Means |
|---|---|---|---|
| Day | `today` | `आज` | today |
| Day | `tomorrow` | `कल` | tomorrow (`कल` is always read as tomorrow) |
| Day | `day after tomorrow` | `परसों` | today + 2 |
| Day | `monday` … `sunday`, `mon` … `sun`, optionally after `next` or `on` | `सोमवार` … `रविवार`, optionally after `अगले` | the soonest such day after today; today is never chosen |
| Day | `in N days` | `N दिन में`, `N दिन बाद` | today + N, N from 1 to `365` |
| Day | `5 nov`, `nov 5`, `5 november` | `5 नवंबर` | the soonest such date on or after today |
| Day | `5/11`, `5-11` | — | day/month, the soonest on or after today |
| Time | `5pm`, `5 pm`, `5:30pm`, `at 5pm` | — | 17:00, 17:30 |
| Time | `17:00`, `at 17:00` | — | 17:00 |
| Time | `at 9` | `9 बजे` | 09:00 |
| Time | — | `सुबह N बजे`, `दोपहर N बजे`, `शाम N बजे`, `रात N बजे` | N am; N pm for दोपहर, शाम; N pm for रात from 6 to 11, else N am |

**W2 What isn't.** An hour over 23, a minute over 59, a 13pm, a 31 Feb, or a number that isn't next to a date or
time word is left in the title as typed. Dates are local wall-clock values
([domain/local-dates](../../knowledge/domain/local-dates.md)): the parser returns `'YYYY-MM-DD'` and `'HH:mm'`,
never an instant.

**W3 Where.** Only quick add uses the parser. The add screen keeps its pickers and reads no dates from text.

### Keyboard shortcuts

**K1 Keys.** On Home: `n` puts the focus in quick add; `/` in the search field; `?` opens a dialog listing every
shortcut. On a card with the focus: `x` checks or unchecks it; `e` opens its edit form (a todo task only);
`Delete` or `Backspace` deletes it, with part 1's Undo. `?` works on every signed-in screen.

**K2 When keys do nothing.** A shortcut does nothing while the focus is in a text field, a text area or a
`contenteditable`, while a dialog or menu is open, or with Ctrl, Alt or Meta held, so typing and the browser's own
shortcuts are never taken over.

**K3 Cards take focus.** Each card is reachable with Tab (`tabindex="0"`), shows a focus ring, and is labelled with
its title for screen readers. The card's buttons keep working as now.

### App shortcuts and share target

**S1 Icon shortcuts.** The web manifest gains two shortcuts: "Add task" opening `/add`, and "Today" opening
`/home`.

**S2 Share target.** The web manifest gains a share target, `GET /add` with the parameters `title`, `text` and
`url`. The add screen reads them once when it opens: `title` fills the title, or, without one, the first line of
`text`; the description is the rest of `text`, then `url` on a line of its own. Nothing is saved until the user
presses Add. Values too long for the limits fill the fields and show the add screen's "too long" messages. A share
while signed out goes through sign-in and back to `/add` with the shared values, unless the address is longer than
`MAX_REDIRECT_LENGTH = 2048` (`src/router/guard.ts`), when it lands on Home as any over-long redirect does.

**S3 Android.** The Android app isn't changed in this part ([decisions/quick-capture](../../knowledge/decisions/quick-capture.md)).

**S4 Text.** New strings go in `src/i18n/locales/{en,hi}/tasks.json` (quick add, the found-date chip, the shortcut
dialog) with the same keys in both; the manifest's shortcut names are English, as its `name` is.

## §3 Design

- `src/lib/parseWhen.ts`: `parseWhen(text: string, today: string): { title: string; date: string | null; time: string | null; matched: boolean }`. Pure, with no Vue or Firebase in it.
- `src/components/tasks/QuickAdd.vue`: the field, the chip and the save, through `tasksStore.add` (existing).
  It takes the view and today from Home to work out Q4's default.
- `src/composables/useShortcuts.ts` for the global keys, mounted by the app shell. `src/composables/` is a new
  folder, for composables that belong to no one area (`src/pwa/` holds the PWA's own); it is added to
  [project/conventions](../../knowledge/project/conventions.md). The card keys live in
  `src/components/tasks/TaskCard.vue`; `src/components/layout/ShortcutsDialog.vue` lists them.
- `vite.config.ts`: `shortcuts` and `share_target` in the manifest.
- `src/views/TaskAddView.vue`: reads the shared query once on open.

## §4 Security and hostile input

- Shared text comes from another app and is untrusted. It only fills form fields; the description is rendered
  through the existing sanitised Markdown ([security/data-protection](../../knowledge/security/data-protection.md)),
  and nothing is saved without the user pressing Add.
- Shared values never go into a URL the app builds: the add screen reads them and then replaces the address with
  plain `/add`, so a reload or the history doesn't keep them.
- The parser runs on at most the title limit plus a little (`TITLE_MAX` × 2 characters) of input; longer text skips
  parsing, so a pasted wall of text can't stall typing.

## §5 Tests

Written first, each run alone:

- `src/lib/parseWhen.test.ts`: every row of W1 in both languages; W2's refusals; a weekday on that same weekday
  (next week); `5 nov` after 5 November (next year); a month end and the year end; two days in one text (the first
  wins); date words alone (empty title).
- `src/components/tasks/QuickAdd.test.ts`: Q1–Q5, the chip and its ✕, a failed save, a slow save.
- `src/composables/useShortcuts.test.ts` and `src/components/tasks/TaskCard.test.ts`: K1–K3, keys ignored in a
  field, in a dialog and with a modifier.
- `src/views/TaskAddView.test.ts`: S2's mapping of `title`, `text` and `url`, the address replaced, over-long values.
- `e2e/shell.spec.ts`, beside its existing manifest checks: the built manifest carries S1's shortcuts and S2's share
  target. It runs when the developer asks.

## §6 Out of scope

Recurring phrases such as "every Monday" (part 7, Recurring tasks); labels typed as `#label`; parsing on the add
screen; the Android app's share target; a shortcut to add from any screen.
