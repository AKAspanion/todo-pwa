# Faster capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:implement-with-subagents by default, or ga:implement. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tasks can be added from Home in one line with the date typed in English or Hindi words, from the keyboard, from the installed app's icon shortcuts, or by sharing text to the app.

**Architecture:** A pure parser in `src/lib/parseWhen.ts` reads a fixed set of date and time phrases. A `QuickAdd` field at the top of the Todo column uses it and saves through the existing `tasksStore.add`. A `useShortcuts` composable handles the global keys, and cards handle their own. The web manifest gains shortcuts and a share target that the add screen reads once.

**Tech Stack:** Vue 3.5 (`<script setup lang="ts">`), Vuetify 4, Pinia, vue-i18n 11, dayjs, vite-plugin-pwa 2 (manifest in `vite.config.ts`), Vitest with `@vue/test-utils`, Playwright for `e2e/shell.spec.ts`.

**Spec:** `docs/specs/2026-11-03-quick-capture.md`

**Builds after:** `docs/plans/2026-11-03-board-fixes.md` (`src/lib/taskLimits.ts`, Undo on delete, the card without its "Delete?" step) and `docs/plans/2026-11-03-home-views.md` (`HomeView` in `src/stores/tasks.ts`, the views on Home). Their code is taken as already there.

## Global Constraints

- §2 W2: "the parser returns `'YYYY-MM-DD'` and `'HH:mm'`, never an instant."
- §2 W3: "Only quick add uses the parser. The add screen keeps its pickers and reads no dates from text."
- §2 K2: "A shortcut does nothing while the focus is in a text field, a text area or a `contenteditable`, while a dialog or menu is open, or with Ctrl, Alt or Meta held"
- §4: "The parser runs on at most the title limit plus a little (`TITLE_MAX` × 2 characters) of input; longer text skips parsing"
- Shortcut targets: quick add's field carries `data-shortcut="quick-add"` and Home's search field `data-shortcut="search"`. The key handler focuses the first `input` or `textarea` inside the element with that attribute.
- Every new string goes in `src/i18n/locales/en/tasks.json` and `src/i18n/locales/hi/tasks.json`, with the same keys.
- No change to `firestore.rules`; no new dependency.

## Checkpoints

None (`run.checkpoints: none`). The run stops only where the developer names a stop.

---

### Task 1: The parser, the strings and the manifest

**Files:**
- Create: `src/lib/parseWhen.ts`
- Test: `src/lib/parseWhen.test.ts`
- Modify: `src/i18n/locales/en/tasks.json`
- Modify: `src/i18n/locales/hi/tasks.json`
- Modify: `vite.config.ts` (the manifest: `shortcuts`, `share_target`)
- Test: `e2e/shell.spec.ts` (beside its manifest checks)

**Interfaces:**
- Consumes: existing `parseLocalDate` in `src/lib/dates.ts`; `TITLE_MAX` from `src/lib/taskLimits.ts` (built by the board-fixes plan).
- Produces:

```ts
// src/lib/parseWhen.ts
/** Longer input isn't parsed: TITLE_MAX × 2. */
export const PARSE_MAX: number;
export interface ParsedWhen {
  /** The text less the words read, spaces closed up and trimmed. */
  title: string;
  date: string | null; // 'YYYY-MM-DD'
  time: string | null; // 'HH:mm'
  /** A day or a time was read. */
  matched: boolean;
}
export function parseWhen(text: string, today: string): ParsedWhen;
```

```ts
// vite.config.ts, in the manifest
shortcuts: [
  { name: 'Add task', url: '/add', icons: [{ src: '/img/icons/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' }] },
  { name: 'Today', url: '/home', icons: [{ src: '/img/icons/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' }] },
],
share_target: { action: '/add', method: 'GET', params: { title: 'title', text: 'text', url: 'url' } },
```

New keys in `tasks.json`, English then Hindi:

| Key | en | hi |
|---|---|---|
| `quickAdd.label` | `Add a task` | `कार्य जोड़ें` |
| `quickAdd.ignore` | `Ignore this date` | `यह तारीख अनदेखा करें` |
| `card.label` | `Task: {title}` | `कार्य: {title}` |
| `shortcuts.title` | `Keyboard shortcuts` | `कीबोर्ड शॉर्टकट` |
| `shortcuts.quickAdd` | `Add a task` | `कार्य जोड़ें` |
| `shortcuts.search` | `Search tasks` | `कार्य खोजें` |
| `shortcuts.help` | `Show this list` | `यह सूची दिखाएँ` |
| `shortcuts.toggle` | `Mark the focused task done or not done` | `चुने गए कार्य को पूरा या अधूरा करें` |
| `shortcuts.edit` | `Edit the focused task` | `चुने गए कार्य को बदलें` |
| `shortcuts.delete` | `Delete the focused task` | `चुने गए कार्य को हटाएँ` |
| `shortcuts.close` | `Close` | `बंद करें` |

The parser's phrases, from §2 W1. It reads whole words only, ignoring case, in both languages whatever the app's language, at most one day and one time; later ones stay in the title.
- Days: `today`/`आज`; `tomorrow`/`कल`; `day after tomorrow`/`परसों`; weekday names in full and as three letters (`monday`, `mon`) and in Hindi (`सोमवार`, `मंगलवार`, `बुधवार`, `गुरुवार` or `गुरूवार`, `शुक्रवार`, `शनिवार`, `रविवार`), each optionally after `next`, `on` or `अगले`, meaning the soonest such day after today; `in N days`, `N दिन में`, `N दिन बाद` for N from 1 to `365`; `5 nov`, `nov 5`, `5 november` and `5 नवंबर` (Hindi months also in their other common spelling, `नवम्बर`, `सितम्बर`, `दिसम्बर`, `फरवरी`), meaning the soonest such date on or after today; `5/11` and `5-11` as day/month, the same way.
- Times: `5pm`, `5 pm`, `5:30pm`, each optionally after `at`; `17:00` and `at 17:00`; `at 9` and `9 बजे` as `09:00`; `सुबह N बजे` as N am, `दोपहर N बजे` and `शाम N बजे` as N pm, `रात N बजे` as N pm for N from 6 to 11 and N am otherwise. `12am` is `00:00`, `12pm` is `12:00`.

**Spec:**
- §2 W1: "It reads at most one day and one time; later ones stay in the title."
- §2 W2: "An hour over 23, a minute over 59, a 13pm, a 31 Feb, or a number that isn't next to a date or time word is left in the title as typed."
- §2 S1: "The web manifest gains two shortcuts"
- §2 S2: "The web manifest gains a share target, `GET /add` with the parameters `title`, `text` and `url`."

**Tags:** none

**Knowledge:**
- `features/add-task`: tasks can also be added from Home's quick add, whose dates in words are read by `parseWhen` in `src/lib/parseWhen.ts` (English and Hindi phrases).
- `features/offline-and-updates`: the web manifest has "Add task" and "Today" shortcuts and a `GET /add` share target.

**Acceptance:** with today `2026-11-03`, a Tuesday, unless said otherwise:
- `Pay rent tomorrow 5pm` gives title `Pay rent`, date `2026-11-04`, time `17:00`, `matched` true.
- `friday` gives `2026-11-06`; `next friday` and `on fri` give `2026-11-06`; `tuesday` gives `2026-11-10`, never today.
- `in 3 days` gives `2026-11-06`; `in 400 days` and `in 0 days` stay in the title.
- `5 nov`, `nov 5` and `5/11` give `2026-11-05`; `2 nov` gives `2027-11-02`; `31/2` and `31 feb` stay in the title.
- `call mom कल शाम 5 बजे` gives title `call mom`, `2026-11-04`, `17:00`; `परसों` gives `2026-11-05`; `गुरूवार` and `गुरुवार` give `2026-11-05`; `5 नवम्बर` and `5 नवंबर` give `2026-11-05`.
- `रात 10 बजे` gives `22:00`; `रात 2 बजे` gives `02:00`; `सुबह 9 बजे` gives `09:00`; `at 9` gives `09:00`; `12am` gives `00:00`; `12pm` gives `12:00`.
- `13pm`, `25:00` and `9:75` stay in the title, with no time read.
- `Room 5` and `buy 3 apples` read nothing: `matched` false, title unchanged.
- `today tomorrow` reads today; `tomorrow` stays in the title.
- `TODAY` reads today; `todayish` and `Mondays` read nothing.
- `tomorrow` alone gives an empty title, `2026-11-04`, `matched` true.
- With today `2026-12-31`: `tomorrow` gives `2027-01-01`; `jan 5` gives `2027-01-05`.
- `5pm` alone gives time `17:00` and date `null`.
- Text of `PARSE_MAX` + 1 characters ending in `tomorrow` is returned whole as the title, with `matched` false.
- e2e: the built manifest has the two shortcuts with names `Add task` and `Today` and URLs `/add` and `/home`, and `share_target` with `action` `/add`, `method` `GET` and the three params.

- [ ] **Step 1: Write the failing tests** for each parser case, in `src/lib/parseWhen.test.ts`. Create `src/lib/parseWhen.ts` with its real signature first, returning the text unparsed, so the tests fail on behaviour.

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/lib/parseWhen.test.ts`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation** of `parseWhen`, add the strings to both `tasks.json` files, add the manifest entries to `vite.config.ts`, and add the manifest case to `e2e/shell.spec.ts`

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/lib/parseWhen.test.ts`
Expected: PASS. The e2e case runs when the developer asks.

- [ ] **Step 5: Commit**

```bash
git add src/lib/parseWhen.ts src/lib/parseWhen.test.ts src/i18n/locales/en/tasks.json src/i18n/locales/hi/tasks.json vite.config.ts e2e/shell.spec.ts
git commit -m "feat(tasks): read dates in English and Hindi words, and add app shortcuts and a share target"
```

### Task 2: Quick add on Home

**Files:**
- Create: `src/components/tasks/QuickAdd.vue`
- Create: `src/components/tasks/QuickAdd.test.ts`
- Modify: `src/components/tasks/TaskColumn.vue` (a `top` slot, rendered above the Todo column's list)
- Modify: `src/components/tasks/TaskBoard.vue` (passes a `todo-top` slot to the Todo column)
- Modify: `src/views/HomeView.vue` (puts `QuickAdd` in that slot; `data-shortcut="search"` on the search field)

**Interfaces:**
- Consumes: `parseWhen` and `PARSE_MAX` (Task 1); the strings `quickAdd.*` (Task 1); `TITLE_MAX` and `charCount` from `src/lib/taskLimits.ts` and the string `tasks.form.titleTooLong` (board-fixes plan); `HomeView` from `src/stores/tasks.ts` (home-views plan); existing `tasksStore.add(input: TaskInput): Promise<Task>`, `relativeDayLabel`, `formatTime12`, the strings `tasks.form.titleRequired`, `tasks.errors.save`, `tasks.errors.slowSave`, `tasks.card.when`.
- Produces:

```ts
// src/components/tasks/QuickAdd.vue
defineProps<{ view: HomeView; today: string }>();
// its field's wrapper carries data-shortcut="quick-add"
```

**Spec:**
- §2 Q1: "Enter saves; Escape clears it and leaves it."
- §2 Q1: "When the save succeeds the field empties and keeps focus, ready for the next task."
- §2 Q2: "Text that is only spaces, or only date words, doesn't save"
- §2 Q3: "Its ✕ ignores it: the task is saved with the whole text as its title and the default date of Q4."
- §2 Q4: "A task with no date in its text gets: the picked day in a day view; no date (indefinite) in the No date view; today in every other view. It has no time unless one was typed."
- §2 Q4: "A time typed with no day gets the default date, or today in the No date view."
- §2 Q5: "A quick-added task has no labels."

**Tags:** `failure-paths`, `screen`

**Knowledge:**
- `features/task-board`: quick add at the top of the Todo column saves a task from one line; its date is the one typed in words, else the picked day, no date in the No date view, or today.

**Acceptance:** with today `2026-11-03`:
- In Today, typing `Pay rent tomorrow 5pm` and Enter calls `add` with title `Pay rent`, `indefinite` false, date `2026-11-04`, time `17:00`, `labelIds` `[]`; the field then empties and keeps focus.
- While typing `Pay rent tomorrow 5pm`, a chip shows `Tomorrow, 5:00 PM` (the card's wording) before Enter.
- Pressing the chip's ✕ (labelled "Ignore this date") and Enter calls `add` with title `Pay rent tomorrow 5pm`, date `2026-11-03`, time `null`; typing a further character brings the chip back.
- In a day view on `2026-11-06`, `Buy milk` saves with date `2026-11-06`, time `null`.
- In No date, `Buy milk` saves with `indefinite` true and date and time `null`; `Buy milk 5pm` saves with date `2026-11-03`, time `17:00`.
- In Upcoming, Overdue and All, `Buy milk` saves with date `2026-11-03`.
- Under a label filter, the saved task's `labelIds` is `[]`.
- `   ` and `tomorrow` alone don't call `add`, and the field says "Enter the task's title".
- A title of 201 characters after the date words are removed doesn't call `add`, and the field says "Keep the title under 200 characters".
- Escape empties the field and moves the focus out of it.
- Given `add` rejects, the text stays and the field says "Couldn't save. Try again."
- Given `add` doesn't answer, the field is read-only, Enter doesn't call `add` again, and after 15 s it says "Still saving. Check your connection."
- The field's wrapper carries `data-shortcut="quick-add"`; Home's search field carries `data-shortcut="search"`.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `src/components/tasks/QuickAdd.test.ts`. Create `QuickAdd.vue` with its real props first.

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/components/tasks/QuickAdd.test.ts`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation**: `QuickAdd.vue`, the column's `top` slot, the board's `todo-top` slot, and Home placing it and marking the search field

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/components/tasks/QuickAdd.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/tasks/QuickAdd.vue src/components/tasks/QuickAdd.test.ts src/components/tasks/TaskColumn.vue src/components/tasks/TaskBoard.vue src/views/HomeView.vue
git commit -m "feat(home): quick add with dates in words"
```

### Task 3: Keyboard shortcuts

**Files:**
- Create: `src/composables/useShortcuts.ts`
- Create: `src/composables/useShortcuts.test.ts`
- Create: `src/components/layout/ShortcutsDialog.vue`
- Modify: `src/App.vue` (mounts the shortcuts and the dialog)
- Modify: `src/components/tasks/TaskCard.vue` (focusable, labelled, the card keys)
- Modify: `src/components/tasks/TaskCard.test.ts`

**Interfaces:**
- Consumes: the strings `shortcuts.*` and `card.label` (Task 1); the `data-shortcut` targets in Global Constraints, looked up in the page when a key is pressed, so this task needs no other task's code for them; the card's existing `toggle` and `remove` events and its edit mode.
- Produces:

```ts
// src/composables/useShortcuts.ts
/** The key is typed into something, or a dialog or menu is open, or a modifier is held. */
export function shouldIgnoreKey(event: KeyboardEvent): boolean;
/** Listens on document while the calling component is mounted. */
export function useShortcuts(options: { openHelp: () => void }): void;

// src/components/layout/ShortcutsDialog.vue
const open = defineModel<boolean>({ required: true });
```

**Spec:**
- §2 K1: "On Home: `n` puts the focus in quick add; `/` in the search field; `?` opens a dialog listing every shortcut."
- §2 K1: "`?` works on every signed-in screen."
- §2 K3: "shows a focus ring, and is labelled with its title for screen readers."

**Tags:** `screen`

**Knowledge:**
- `features/keyboard-shortcuts` (new): keys `n`, `/` and `?` on Home, and `x`, `e`, `Delete` or `Backspace` on a focused card; keys are ignored while typing, in a dialog or with a modifier.
- `project/conventions`: `src/composables/` holds composables that belong to no one area; `src/pwa/` keeps the PWA's own.

**Acceptance:**
- Given an element with `data-shortcut="quick-add"` holding an input, pressing `n` on the page focuses that input and types no `n` into it; `/` does the same for `data-shortcut="search"`.
- Given no such element on the screen, `n` and `/` do nothing and throw nothing.
- `?` opens the shortcuts dialog titled "Keyboard shortcuts", listing the six shortcuts; its Close button and Escape close it.
- With the focus in an input, a textarea or a `contenteditable`, `n`, `/` and `?` do nothing.
- With a dialog open (an element with `role="dialog"` shown) or a menu open, `n` does nothing.
- With Ctrl, Alt or Meta held, `n` and `/` do nothing.
- A card has `tabindex="0"` and the accessible name "Task: Pay rent" for a task titled `Pay rent`.
- On a focused todo card, `x` emits `toggle`; `e` opens its edit form; `Delete` and `Backspace` emit `remove`.
- On a focused done card, `e` does nothing (a done task has no edit).
- While the card's edit form is open, typing `x` or `Backspace` in its title field neither toggles nor removes the card.
- While the card is pending, `x`, `e` and `Delete` do nothing.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `src/composables/useShortcuts.test.ts` and `src/components/tasks/TaskCard.test.ts`. Create `useShortcuts.ts` and `ShortcutsDialog.vue` with their real signatures first.

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/composables/useShortcuts.test.ts src/components/tasks/TaskCard.test.ts`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation**: the composable, the dialog mounted in `App.vue` for signed-in screens, and the card's focus and keys

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/composables/useShortcuts.test.ts src/components/tasks/TaskCard.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/composables/useShortcuts.ts src/composables/useShortcuts.test.ts src/components/layout/ShortcutsDialog.vue src/App.vue src/components/tasks/TaskCard.vue src/components/tasks/TaskCard.test.ts
git commit -m "feat(shell): keyboard shortcuts for adding, searching and the focused task"
```

### Task 4: The add screen reads a share

**Files:**
- Modify: `src/views/TaskAddView.vue`
- Create: `src/views/TaskAddView.test.ts`

**Interfaces:**
- Consumes: the share target's `GET /add?title&text&url` (Task 1's manifest); existing `useRoute` and `useRouter`, and the add screen's own fields and limits.
- Produces: nothing other tasks use.

**Spec:**
- §2 S2: "The add screen reads them once when it opens: `title` fills the title, or, without one, the first line of `text`; the description is the rest of `text`, then `url` on a line of its own. Nothing is saved until the user presses Add."
- §2 S2: "Values too long for the limits fill the fields and show the add screen's"
- §4: "the add screen reads them and then replaces the address with plain `/add`, so a reload or the history doesn't keep them."

**Tags:** `security`

**Knowledge:**
- `features/add-task`: opened by the share target, the add screen fills the title and description from `title`, `text` and `url`, then replaces the address with `/add`; nothing saves until Add.

**Acceptance:**
- `/add?title=Read%20this&text=Worth%20it&url=https%3A%2F%2Fexample.com%2Fa` fills the title `Read this` and the description `Worth it` then `https://example.com/a` on its own line.
- `/add?text=Line%20one%0ALine%20two&url=https%3A%2F%2Fexample.com` fills the title `Line one` and the description `Line two` then `https://example.com` on its own line.
- `/add?url=https%3A%2F%2Fexample.com` fills an empty title and the description `https://example.com`.
- After reading, the route is replaced with `/add` and no query, and no task is saved until Add is pressed.
- A `title` of 201 characters fills the title and shows "Keep the title under 200 characters" once the form validates; nothing is saved.
- A `text` holding `<img src=x onerror=alert(1)>` fills the description as plain text; the page gains no `img` element.
- A query value given twice (`?title=a&title=b`) uses the first.
- `/add` with no query opens empty, as now.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `src/views/TaskAddView.test.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/views/TaskAddView.test.ts`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation**: read the query once on open, fill the fields, replace the route

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/views/TaskAddView.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/views/TaskAddView.vue src/views/TaskAddView.test.ts
git commit -m "feat(add): fill the add screen from a share"
```
