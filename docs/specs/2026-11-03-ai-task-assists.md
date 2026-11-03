# Task assists: suggest labels, rewrite and translate (AI part B)

- **Date:** 2026-11-03
- **Status:** written, waiting for the developer's review
- **Part of:** [decisions/ai-features-roadmap](../../knowledge/decisions/ai-features-roadmap.md), part B
- **Builds on:** [the AI foundation spec](2026-11-03-ai-foundation.md) (part A), whose Pro claim, consent, request
  documents, claiming, counting, expiry and provider layer this part uses unchanged;
  [decisions/ai-assists-on-request](../../knowledge/decisions/ai-assists-on-request.md)
- **Build after:** part A, and the usability board-fixes branch, which moves the title and description limits into
  `src/lib/taskLimits.ts` and makes the edit form check them

## 1. Goal

On the add screen and in the edit form, a Pro account can ask for three things, each with one press:

- **Suggest labels**: some of their own labels that fit the task, added to the selection.
- **Rewrite**: the description made clearer, in the same language and script.
- **Translate**: the description in the app's other language, English into Hindi or Hindi into English.

Success is:

- Each assist spends exactly one request, and only when pressed.
- A rewrite or translation can be undone in one tap, and never overwrites typing done while it was working.
- A suggestion only ever adds the account's own labels, at most `SUGGEST_LABELS_MAX = 3` of them, and never removes
  one the person picked.

## 2. Out of scope

- Breaking a task into steps: part B2, after the usability roadmap's checklists
  ([decisions/ai-features-roadmap](../../knowledge/decisions/ai-features-roadmap.md)).
- Creating labels. A suggestion picks only from labels that exist
  ([decisions/labels-create-only](../../knowledge/decisions/labels-create-only.md)).
- Rewriting or translating the title. Only the description is rewritten.
- Languages other than English and Hindi.
- Assists anywhere but the add screen and the edit form.

## 3. What the person sees

All of it shows only to a Pro account (`isPro`, part A §4.1). The first press of any assist from an account without
consent opens part A's consent dialog first (part A §3.2), which covers these requests too.

### 3.1 Suggest labels

- A "Suggest" button with a sparkle icon at the end of the labels row, on the add screen
  (`src/views/TaskAddView.vue`) and in the edit form (`src/components/tasks/TaskEditForm.vue`).
- Hidden when the account has no labels. Disabled while the title is empty after trimming.
- On press, the button shows progress. The answer's labels are added to the selection; labels already selected
  stay, and none is removed.
- The snackbar says "Added 1 label" or "Added 2 labels" (the number added that weren't already selected), with Undo,
  which puts the selection back as it was before the answer.
- When the answer adds nothing new, the snackbar says "No other labels fit this task." with no Undo.

### 3.2 Rewrite and translate

- A small menu button with a sparkle icon beside the description field on both forms, holding "Rewrite" and
  "Translate". Disabled while the description is empty after trimming.
- **Rewrite** returns the description clearer and tidier, in the same language and script, keeping its meaning and
  its Markdown (lists, links, emphasis). It adds no facts.
- **Translate** returns the description in English when it is mostly Hindi or Hinglish, and in Hindi (Devanagari)
  when it is mostly English, keeping its Markdown.
- On press, the field shows a progress bar and stays editable. The answer replaces the description at once, and the
  snackbar says "Description rewritten", "Translated to Hindi" or "Translated to English", with Undo, which puts back
  the description as it was when the request was sent.

### 3.3 One request at a time

- While any AI request from the screen is out (Fill from text on the add screen, or an assist), every AI button on
  that screen is disabled. The form itself stays editable.
- Leaving the add screen, or closing the edit form, before the answer comes cancels the request as part A §3.1 does.

### 3.4 When the field changed meanwhile

- The app remembers the description (for Rewrite and Translate) or the label selection (for Suggest) as it was when
  the request was sent. If it is different when the answer comes, the answer is not applied, and the snackbar says:
  - "The description changed, so the rewrite wasn't applied."
  - "The description changed, so the translation wasn't applied."
  - "The labels changed, so the suggestions weren't applied."
- The request still counts: the provider was paid for it.

### 3.5 Messages

All in English and Hindi, in `src/i18n/locales/en/ai.json` and `src/i18n/locales/hi/ai.json`, beside part A's.

| When | Message |
|---|---|
| The month's limit is reached | "You've used this month's 300 AI requests. They reset on the 1st." Every AI button is disabled until then. This is part A's message, which says "AI requests" because the limit is shared by every kind. |
| Pro was revoked (`'not-pro'`) | "AI help isn't available on this account." |
| The answer couldn't be used, or the provider failed | "Couldn't do that. Try again, or edit it yourself." Nothing on the form changes. |
| The device is offline | "Will finish when you're back online." beside the button that was pressed. |
| No answer after `AI_STILL_WAITING_MS = 15_000` | "Still working…" beside that button; it keeps waiting. |

## 4. Design

### 4.1 Request kinds

Three new `kind` values for `aiRequests` (part A §4.2). Every other field, and the request's life from `'pending'` to
`'done'` or `'error'`, is as part A has it.

| Kind | `input` | `result` |
|---|---|---|
| `'suggestLabels'` | `{ title, description }` | `{ labelIds: string[] }` |
| `'rewriteDescription'` | `{ text }` | `{ description: string }` |
| `'translateDescription'` | `{ text }` | `{ description: string; language: 'en' \| 'hi' }` |

`language` is the language the description was translated into, which the snackbar names.

### 4.2 Rules

`firestore.rules`' create rule for `aiRequests` (part A §4.4) accepts these kinds beside `'parseTask'`, each with its
own `input` check. Everything else in the rule, the `pro` claim and consent included, is unchanged.

- `'suggestLabels'`: `input` has exactly `title` and `description`, checked as the task rules check a task's
  `title` and `description`, so any task that can be saved can be sent.
- `'rewriteDescription'` and `'translateDescription'`: `input` has exactly `text`, a string of at least 1 character
  and no longer than the task rules allow a `description`.
- Any other `kind` is refused.

### 4.3 The kind registry

Part A's `runAiRequest` asks for a `parseTask` answer directly. This part turns that step into a lookup, so a new kind
is one entry and no change to the claim, the count or the expiry.

- **`functions/src/ai/kinds.ts`** maps each kind to an `AiKind`:

  ```ts
  interface AiKind<I, R> {
    readonly kind: AiRequestKind;
    readonly needsLabels: boolean;
    readonly maxOutputTokens: number;
    readonly timeoutMs: number;
    readonly retries: number;
    inputSchema: z.ZodType<I>;
    resultSchema: z.ZodType<R>;
    prompt(input: I, labels: { id: string; label: string }[]): { system: string; prompt: string };
    check(raw: R, input: I, ownLabelIds: Set<string>): R | null;
  }
  ```

  `parseTask` (part A's `functions/src/ai/parseTask.ts`) becomes the first entry, unchanged in behaviour. Each new
  kind has its own module beside it: `suggestLabels.ts`, `rewriteDescription.ts`, `translateDescription.ts`.
- **`runAiRequest`**, after claiming and counting exactly as part A §4.3 step 1 says: finds the kind (a kind with no
  entry is answered `'invalid'`, though the rules never let one in); parses `input` with `inputSchema` (a failure is
  `'invalid'`); reads the account's labels only when `needsLabels`; asks the provider with the kind's prompt, schema,
  `maxOutputTokens`, `timeoutMs` and `retries`; and writes `check`'s result, or `'invalid'` when `check` returns
  `null`. The outcomes and their mapping from `AiOutputError` and `AiProviderError` are part A's.
- **Per-request timeout and retries.** `AiProvider.generateObject` gains two optional fields, `timeoutMs` and
  `retries`, passed to the SDK as that request's options. Without them each provider keeps part A's client defaults
  (`timeout: 20_000`, `maxRetries: 1`). A long rewrite takes longer than a fill, and one call with its retries must
  stay inside the function's `timeoutSeconds: 60`.

| Kind | `needsLabels` | `maxOutputTokens` | `timeoutMs` | `retries` |
|---|---|---|---|---|
| `parseTask` | yes | `4_000` | `20_000` | `1` |
| `suggestLabels` | yes | `2_000` | `20_000` | `1` |
| `rewriteDescription` | no | `12_000` | `45_000` | `0` |
| `translateDescription` | no | `12_000` | `45_000` | `0` |

`12_000` leaves room for a full 5,000-character description in Devanagari, which takes more tokens than English,
plus Haiku 5.5's adaptive thinking, which counts against the cap.

### 4.4 Prompts and checks

As in part A: the person's text goes in the user message, never in the system prompt, and the provider gets no tools.

- **`suggestLabels`**: the system prompt lists the account's labels as id and name, and says to pick at most 3 that
  clearly fit the task, or none, and never to invent one. The user message is the title and description.
  `check` keeps ids that are the account's own, distinct, in the order given, at most `SUGGEST_LABELS_MAX = 3`. An
  empty list is a valid answer, not an error.
- **`rewriteDescription`**: the system prompt says to rewrite for clarity in the same language and script, keep the
  meaning and the Markdown, add nothing that isn't there, and return only the description. `check` requires a
  description of 1 to 5,000 code points after trimming.
- **`translateDescription`**: the system prompt says to translate into English when the text is mostly Hindi or
  Hinglish, otherwise into Hindi in Devanagari, keep the Markdown, and say which language it translated into.
  `check` requires the same length as a rewrite, and `language` of `'en'` or `'hi'`.

### 4.5 The app

- **`src/services/ai.ts`** (part A) gains `requestAssist(uid, kind, input)`, which creates a request of any of the
  three new kinds and returns its id; `watchRequest` and `cancelRequest` serve every kind.
- **`src/stores/ai.ts`** (part A) gains `assist(kind, input)`, resolving to the result or `null`, and keeps its one
  request in flight for the whole screen, which is what disables every AI button (§3.3).
- **`src/components/ai/SuggestLabelsButton.vue`** and **`src/components/ai/DescriptionAssistMenu.vue`** each take
  the field's current value and emit what to apply. The form that uses them owns the "changed meanwhile" check
  (§3.4) and the snackbar's Undo, since it owns the field.
- **`TaskAddView.vue`** and **`TaskEditForm.vue`** show both components to Pro accounts. The edit form takes
  `TITLE_MAX` and `DESCRIPTION_MAX` from `src/lib/taskLimits.ts`, which the board-fixes branch adds.

## 5. Hostile input and integrity

Part A §5 applies whole. In addition:

- **Label suggestions can't add another account's label**: `check` drops every id the account doesn't own, and a
  task's label ids pass the task rules again on save.
- **A rewrite can't grow past what a task can store**: `check` refuses more than 5,000 code points, and the form
  saves through the normal path, which the task rules check.
- **A description is the person's own text**, sent only on their behalf, so an instruction hidden in it can only
  change their own rewrite. The answer is applied to the form and nothing else; it is never run, fetched or rendered
  as anything but the description's Markdown, which the app already sanitises.
- **Undo is local**: it restores the form's own copy and sends nothing.

## 6. Testing

Built test first. Each task runs only the tests it writes.

- **`functions/src/ai/kinds.test.ts`**: every `AiRequestKind` has an entry; each entry's numbers match §4.3's
  table.
- **`functions/src/ai/answer.test.ts`** (part A's, extended): a request of each new kind is answered through its
  entry; an input that fails `inputSchema` is `'invalid'` and counted; labels are read only for kinds that need them;
  the kind's `timeoutMs` and `retries` reach the provider; part A's cases still pass.
- **`functions/src/ai/suggestLabels.test.ts`**, **`rewriteDescription.test.ts`**, **`translateDescription.test.ts`**:
  each prompt keeps the text out of `system`; each `check` at its limits (4 ids cut to 3, a foreign id dropped, an
  empty list kept; 5,000 and 5,001 code points; a blank rewrite; a `language` of `'fr'`).
- **`functions/src/ai/claude.test.ts`** and **`gemini.test.ts`** (part A's, extended): `timeoutMs` and `retries`
  reach the SDK as request options; without them the client defaults apply.
- **`tests/rules/firestore.rules.test.ts`**: each new kind allowed with a good input and refused with an extra key, a
  missing key, an empty `text`, a `text` longer than a description may be, or a title longer than a task's.
- **`src/components/ai/SuggestLabelsButton.test.ts`** and **`DescriptionAssistMenu.test.ts`**, on both forms: hidden
  without Pro; Suggest hidden with no labels and disabled with an empty title; labels added without removing any, and
  Undo; "No other labels fit this task."; a rewrite and a translation applied with the right snackbar, and Undo; the
  three "changed meanwhile" messages; the limit, not-available, failure, offline and still-working messages; every AI
  button disabled while one request is out; closing the edit form cancels a pending request.

## 7. What this binds later

- Part B2 (steps), and every later part, adds its kinds through the registry in §4.3, like these.
