# AI Task Assists Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:implement-with-subagents by default, or ga:implement. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pro accounts can press Suggest (labels), Rewrite or Translate (description) on the add screen and in the edit form, each answered through part A's request function by way of a kind registry.

**Architecture:** Three new `aiRequests` kinds, admitted by `firestore.rules` with a per-kind input check; `runAiRequest` keeps part A's claim, count and expiry and looks the kind up in `functions/src/ai/kinds.ts` for its schema, prompt, check, token cap, timeout and retries; the providers take a per-request timeout and retry count; two components on the forms apply answers with Undo and drop answers whose field changed meanwhile.

**Tech Stack:** Vue 3 + Vuetify + Pinia + vue-i18n (web app at the repository root); Firebase Auth and Firestore; Cloud Functions on Node 22 with firebase-functions v2 (`functions/`); `@anthropic-ai/sdk`, `@google/genai` and `zod` (added by part A); Vitest against the Firebase emulators; GitHub Actions.

**Spec:** `docs/specs/2026-11-03-ai-task-assists.md`

## Global Constraints

- Build after part A (`docs/plans/2026-11-03-ai-foundation.md`) is merged, and after the usability board-fixes work, which adds `src/lib/taskLimits.ts`, is on the base branch. This plan consumes code from both.
- §1: "A suggestion only ever adds the account's own labels, at most `SUGGEST_LABELS_MAX = 3` of them, and never removes one the person picked."
- §1: "Each assist spends exactly one request, and only when pressed."
- §4.4: "the person's text goes in the user message, never in the system prompt, and the provider gets no tools."
- §5: "Part A §5 applies whole."
- Every visible string is in `src/i18n/locales/en/ai.json` and `src/i18n/locales/hi/ai.json`, with the same keys.
- No `any` and no `@ts-ignore`; no provider SDK imported outside `functions/src/ai/claude.ts` and `functions/src/ai/gemini.ts`.

## Checkpoints

None. The policy's `run.checkpoints` is `none`, and this plan adds no stop.

---

### Task 1: Foundation: the new kinds' contracts and rules

**Files:**
- Modify: `functions/src/ai/types.ts`
- Modify: `src/types/models.ts`
- Modify: `firestore.rules`
- Test: `tests/rules/firestore.rules.test.ts`

**Interfaces:**
- Consumes: existing `AiRequestKind`, `AiProvider`, `ParseTaskInput`, `ParseTaskResult` in `functions/src/ai/types.ts` and `src/types/models.ts` (part A); existing `aiRequests` create rule and the task `title` and `description` checks in `firestore.rules` (part A).
- Produces, in `functions/src/ai/types.ts` (Tasks 2, 3), with the same types in `src/types/models.ts` (Task 4):

```ts
export const SUGGEST_LABELS_MAX = 3;

export type AiRequestKind = 'parseTask' | 'suggestLabels' | 'rewriteDescription' | 'translateDescription';

export interface SuggestLabelsInput { title: string; description: string }
export interface SuggestLabelsResult { labelIds: string[] }
export interface DescriptionInput { text: string }
export interface RewriteResult { description: string }
export interface TranslateResult { description: string; language: 'en' | 'hi' }

export interface AiProvider {
  readonly name: 'claude' | 'gemini';
  generateObject<T>(request: {
    system: string; prompt: string; schema: z.ZodType<T>; maxOutputTokens: number;
    timeoutMs?: number; retries?: number;
  }): Promise<T>;
}

export interface AiKind<I, R> {
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

- Produces, in `src/types/models.ts`: `AiRequest.kind` widened to `AiRequestKind`, and `AiRequest.result` to `ParseTaskResult | SuggestLabelsResult | RewriteResult | TranslateResult | null`.

**Spec:**
- §4.2: "`'suggestLabels'`: `input` has exactly `title` and `description`, checked as the task rules check a task's `title` and `description`, so any task that can be saved can be sent."
- §4.2: "`'rewriteDescription'` and `'translateDescription'`: `input` has exactly `text`, a string of at least 1 character and no longer than the task rules allow a `description`."
- §4.2: "Any other `kind` is refused."
- §4.2: "Everything else in the rule, the `pro` claim and consent included, is unchanged."

**Tags:** security

**Knowledge:** `data/model`: `aiRequests.kind` takes four values, each with its own `input` shape.

**Acceptance:**
- Given a Pro user with consent, when they create a `'suggestLabels'` request with `input` `{ title: 'Pay electricity bill', description: '' }`, then it is allowed.
- Given the same, when `input` has an extra key `labels`, or lacks `description`, then it is refused.
- Given the same, when `input.title` is empty, or one character longer than the task rules allow a title, then it is refused.
- Given the same, when `input.description` is one character longer than the task rules allow a description, then it is refused.
- Given a Pro user with consent, when they create a `'rewriteDescription'` or `'translateDescription'` request with `input` `{ text: 'kal doodh lana' }`, then it is allowed.
- Given the same, when `input.text` is `''`, or one character longer than the task rules allow a description, or `input` has an extra key, then it is refused.
- Given a Pro user with consent, when `kind` is `'summarise'`, then it is refused.
- Given a user without the `pro` claim, or without consent, when they create a request of any new kind with a good input, then it is refused.
- Given part A's `'parseTask'` cases, when the rules tests run, then they still pass.

- [ ] **Step 1: Widen the contracts** in `functions/src/ai/types.ts` and `src/types/models.ts` to the Interfaces

- [ ] **Step 2: Write the failing rules tests** for each Acceptance case, in `tests/rules/firestore.rules.test.ts`, in a `describe` block per new kind

- [ ] **Step 3: Run them to verify they fail**

Run: `npm run test:rules -- tests/rules/firestore.rules.test.ts`
Expected: FAIL on the new allowed cases; part A's cases pass

- [ ] **Step 4: Extend the `aiRequests` create rule** in `firestore.rules` with one input check per new kind

- [ ] **Step 5: Run them to verify they pass**

Run: `npm run test:rules -- tests/rules/firestore.rules.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add functions/src/ai/types.ts src/types/models.ts firestore.rules tests/rules/firestore.rules.test.ts
git commit -m "feat(ai): contracts and rules for the task assist kinds"
```

---

### Task 2: Providers take a per-request timeout and retry count

**Files:**
- Modify: `functions/src/ai/claude.ts`
- Modify: `functions/src/ai/gemini.ts`
- Test: `functions/src/ai/claude.test.ts`
- Test: `functions/src/ai/gemini.test.ts`

**Interfaces:**
- Consumes: `AiProvider` with `timeoutMs?` and `retries?` from `functions/src/ai/types.ts` (Task 1); existing `claudeProvider()` and `geminiProvider()` (part A).
- Produces: both providers honour `timeoutMs` and `retries` per request; their signatures are unchanged.

**Spec:**
- §4.3: "`AiProvider.generateObject` gains two optional fields, `timeoutMs` and `retries`, passed to the SDK as that request's options. Without them each provider keeps part A's client defaults (`timeout: 20_000`, `maxRetries: 1`)."

**Tags:** failure-paths

**Knowledge:** `integrations/ai-providers`: a request may set its own timeout and retry count; otherwise the client's defaults apply.

**Acceptance:**
- Given a replaced Anthropic client, when `generateObject` runs with `timeoutMs: 45_000` and `retries: 0`, then `messages.parse` received request options `{ timeout: 45_000, maxRetries: 0 }`.
- Given a replaced Anthropic client, when `generateObject` runs without them, then `messages.parse` received no per-request timeout or retry option, and the client keeps `timeout: 20_000` and `maxRetries: 1`.
- Given a replaced Gemini client, when `generateObject` runs with `timeoutMs: 45_000` and `retries: 0`, then the request carries a 45,000 ms timeout and is attempted once, in the form the `@google/genai` documentation gives for per-request options.
- Given a replaced Gemini client, when `generateObject` runs without them, then it keeps part A's defaults.
- Given part A's provider cases, when the tests run, then they still pass.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `functions/src/ai/claude.test.ts` and `functions/src/ai/gemini.test.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm --prefix functions run test -- src/ai/claude.test.ts src/ai/gemini.test.ts`
Expected: FAIL on the new assertions; part A's cases pass

- [ ] **Step 3: Pass `timeoutMs` and `retries` through** as each SDK's per-request options, checking the `@google/genai` form against its documentation first

- [ ] **Step 4: Run them to verify they pass**

Run: `npm --prefix functions run test -- src/ai/claude.test.ts src/ai/gemini.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add functions/src/ai/claude.ts functions/src/ai/gemini.ts functions/src/ai/claude.test.ts functions/src/ai/gemini.test.ts
git commit -m "feat(ai): per-request timeout and retries in both providers"
```

---

### Task 3: The kind registry and the three assist kinds

**Files:**
- Create: `functions/src/ai/kinds.ts`
- Test: `functions/src/ai/kinds.test.ts`
- Create: `functions/src/ai/suggestLabels.ts`
- Test: `functions/src/ai/suggestLabels.test.ts`
- Create: `functions/src/ai/rewriteDescription.ts`
- Test: `functions/src/ai/rewriteDescription.test.ts`
- Create: `functions/src/ai/translateDescription.ts`
- Test: `functions/src/ai/translateDescription.test.ts`
- Modify: `functions/src/ai/parseTask.ts`
- Modify: `functions/src/ai/answer.ts`
- Test: `functions/src/ai/answer.test.ts`

**Interfaces:**
- Consumes: `AiKind`, `AiRequestKind`, `SUGGEST_LABELS_MAX`, `SuggestLabelsInput`, `SuggestLabelsResult`, `DescriptionInput`, `RewriteResult`, `TranslateResult` from `functions/src/ai/types.ts` (Task 1); existing `runAiRequest()`, `parseTaskSchema`, `parseTaskPrompt()`, `checkParseTaskResult()` (part A).
- Produces:

```ts
// functions/src/ai/kinds.ts
export const aiKinds: { [K in AiRequestKind]: AiKind<unknown, unknown> };
export function kindFor(kind: string): AiKind<unknown, unknown> | null;

// functions/src/ai/parseTask.ts gains
export const parseTaskKind: AiKind<ParseTaskInput, ParseTaskResult>;
// functions/src/ai/suggestLabels.ts
export const suggestLabelsKind: AiKind<SuggestLabelsInput, SuggestLabelsResult>;
// functions/src/ai/rewriteDescription.ts
export const rewriteDescriptionKind: AiKind<DescriptionInput, RewriteResult>;
// functions/src/ai/translateDescription.ts
export const translateDescriptionKind: AiKind<DescriptionInput, TranslateResult>;
```

`runAiRequest` keeps its signature and outcomes (part A).

**Spec:**
- §4.3: "finds the kind (a kind with no entry is answered `'invalid'`, though the rules never let one in); parses `input` with `inputSchema` (a failure is `'invalid'`); reads the account's labels only when `needsLabels`; asks the provider with the kind's prompt, schema, `maxOutputTokens`, `timeoutMs` and `retries`; and writes `check`'s result, or `'invalid'` when `check` returns `null`."
- §4.3: "`parseTask` (part A's `functions/src/ai/parseTask.ts`) becomes the first entry, unchanged in behaviour."
- §4.3: "| `parseTask` | yes | `4_000` | `20_000` | `1` |"
- §4.3: "| `suggestLabels` | yes | `2_000` | `20_000` | `1` |"
- §4.3: "| `rewriteDescription` | no | `12_000` | `45_000` | `0` |"
- §4.3: "| `translateDescription` | no | `12_000` | `45_000` | `0` |"
- §4.4: "`check` keeps ids that are the account's own, distinct, in the order given, at most `SUGGEST_LABELS_MAX = 3`. An empty list is a valid answer, not an error."
- §4.4: "`check` requires a description of 1 to 5,000 code points after trimming."
- §4.4: "`check` requires the same length as a rewrite, and `language` of `'en'` or `'hi'`."
- §3.4: "The request still counts: the provider was paid for it."

**Tags:** security, failure-paths

**Knowledge:** `domain/ai-requests`: a request's kind selects its schema, prompt, check, token cap, timeout and retries from `functions/src/ai/kinds.ts`; claiming, counting and expiry are the same for every kind.

**Acceptance:**
- Given `aiKinds`, then it has an entry for each of `'parseTask'`, `'suggestLabels'`, `'rewriteDescription'` and `'translateDescription'`, with `needsLabels`, `maxOutputTokens`, `timeoutMs` and `retries` exactly as the spec's table gives them; `kindFor('summarise')` is `null`.
- Given a Pro user's `'suggestLabels'` request and labels `l1` "bills", `l2` "ghar", `l3` "kaam", `l4` "health", when the fake provider returns `labelIds: ['l1', 'l4', 'l1', 'x9', 'l2', 'l3']`, then the request is `'done'` with `labelIds: ['l1', 'l4', 'l2']`.
- Given the provider returns `labelIds: []`, then the request is `'done'` with `labelIds: []`.
- Given a `'rewriteDescription'` request, when the fake provider returns a description of 5,000 code points, then it is `'done'`; of 5,001, then `'invalid'`; of only spaces, then `'invalid'`.
- Given a `'translateDescription'` request, when the fake provider returns `{ description: 'Buy milk tomorrow', language: 'en' }`, then it is `'done'` with that result; with `language: 'fr'`, then `'invalid'`.
- Given a request whose stored `input` fails its kind's `inputSchema` (written straight to the emulator, past the rules), then it is `'invalid'`, the provider isn't called, and it is counted.
- Given a request whose `kind` has no entry (written past the rules), then it is `'invalid'` and the provider isn't called.
- Given a `'rewriteDescription'` request, then the labels are not read and the provider received `maxOutputTokens: 12_000`, `timeoutMs: 45_000` and `retries: 0`; given a `'suggestLabels'` request, then the labels are read and it received `2_000`, `20_000` and `1`.
- Given each new kind's prompt, then the person's title, description or text is in `prompt` and not in `system`; the suggest prompt's `system` lists the labels by id and name.
- Given part A's `runAiRequest` cases, the claim, the limit, the count and `expireAt` included, when the tests run, then they still pass for `'parseTask'`, and a `'suggestLabels'` request at `count: 300` is answered `'limit'` without a provider call.

- [ ] **Step 1: Write the failing tests** for each Acceptance case: the registry in `functions/src/ai/kinds.test.ts`; each kind's prompt and check in its own test file; the dispatch and the part A regressions in `functions/src/ai/answer.test.ts`, against the Firestore emulator with a fake provider

- [ ] **Step 2: Run them to verify they fail**

Run: `npm --prefix functions run test -- src/ai/kinds.test.ts src/ai/suggestLabels.test.ts src/ai/rewriteDescription.test.ts src/ai/translateDescription.test.ts src/ai/answer.test.ts`
Expected: FAIL on the new assertions; part A's cases pass

- [ ] **Step 3: Write the minimal implementation** to the Interfaces: the three kind modules, `parseTaskKind` built from part A's schema, prompt and check, the registry, and the lookup in `runAiRequest`

- [ ] **Step 4: Run them to verify they pass**

Run: `npm --prefix functions run test -- src/ai/kinds.test.ts src/ai/suggestLabels.test.ts src/ai/rewriteDescription.test.ts src/ai/translateDescription.test.ts src/ai/answer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add functions/src/ai/kinds.ts functions/src/ai/kinds.test.ts functions/src/ai/suggestLabels.ts functions/src/ai/suggestLabels.test.ts functions/src/ai/rewriteDescription.ts functions/src/ai/rewriteDescription.test.ts functions/src/ai/translateDescription.ts functions/src/ai/translateDescription.test.ts functions/src/ai/parseTask.ts functions/src/ai/answer.ts functions/src/ai/answer.test.ts
git commit -m "feat(ai): kind registry with suggest, rewrite and translate"
```

---

### Task 4: Suggest, Rewrite and Translate on both forms

**Files:**
- Modify: `src/services/ai.ts`
- Test: `src/services/ai.test.ts`
- Modify: `src/stores/ai.ts`
- Create: `src/components/ai/SuggestLabelsButton.vue`
- Test: `src/components/ai/SuggestLabelsButton.test.ts`
- Create: `src/components/ai/DescriptionAssistMenu.vue`
- Test: `src/components/ai/DescriptionAssistMenu.test.ts`
- Modify: `src/views/TaskAddView.vue`
- Modify: `src/components/tasks/TaskEditForm.vue`
- Modify: `src/i18n/locales/en/ai.json`
- Modify: `src/i18n/locales/hi/ai.json`

**Interfaces:**
- Consumes: `AiRequestKind`, `SuggestLabelsInput`, `SuggestLabelsResult`, `DescriptionInput`, `RewriteResult`, `TranslateResult`, `AiRequest` from `src/types/models.ts` (Task 1); the new kinds' rules (Task 1); existing `watchRequest()`, `cancelRequest()`, `useAiStore`, `FillFromText.vue` and `AiConsentDialog.vue` (part A); existing `isPro` in `src/stores/session.ts` (part A); existing `useUiStore().showSnack(text, { actionLabel, action })`; existing `TITLE_MAX` and `DESCRIPTION_MAX` in `src/lib/taskLimits.ts` (board-fixes). This task's tests write each answer straight into the emulator, so they need no function running.
- Produces:

```ts
// src/services/ai.ts gains
export function requestAssist(
  uid: string,
  kind: 'suggestLabels' | 'rewriteDescription' | 'translateDescription',
  input: SuggestLabelsInput | DescriptionInput,
): Promise<string>;   // the request id

// src/stores/ai.ts gains
assist(kind: 'suggestLabels' | 'rewriteDescription' | 'translateDescription', input: SuggestLabelsInput | DescriptionInput): Promise<SuggestLabelsResult | RewriteResult | TranslateResult | null>;
busy: ComputedRef<boolean>;   // true while any request from the screen is out
```

`SuggestLabelsButton.vue` takes `title`, `description`, `selectedLabelIds` and `labels`, and emits `suggested(labelIds: string[], sentSelection: string[])`. `DescriptionAssistMenu.vue` takes `description` and emits `rewritten(result: RewriteResult | TranslateResult, mode: 'rewrite' | 'translate', sentDescription: string)`. The form compares the sent value with its current one (§3.4) and shows the snackbar.

**Spec:**
- §3.1: "Hidden when the account has no labels. Disabled while the title is empty after trimming."
- §3.1: "The answer's labels are added to the selection; labels already selected stay, and none is removed."
- §3.1: "The snackbar says "Added 1 label" or "Added 2 labels" (the number added that weren't already selected), with Undo, which puts the selection back as it was before the answer."
- §3.1: "When the answer adds nothing new, the snackbar says "No other labels fit this task." with no Undo."
- §3.2: "Disabled while the description is empty after trimming."
- §3.2: "The answer replaces the description at once, and the snackbar says "Description rewritten", "Translated to Hindi" or "Translated to English", with Undo, which puts back the description as it was when the request was sent."
- §3.3: "While any AI request from the screen is out (Fill from text on the add screen, or an assist), every AI button on that screen is disabled. The form itself stays editable."
- §3.3: "Leaving the add screen, or closing the edit form, before the answer comes cancels the request as part A §3.1 does."
- §3.4: "The description changed, so the rewrite wasn't applied."
- §3.4: "The description changed, so the translation wasn't applied."
- §3.4: "The labels changed, so the suggestions weren't applied."
- §3.5: "You've used this month's 300 AI requests. They reset on the 1st."
- §3.5: "AI help isn't available on this account."
- §3.5: "Couldn't do that. Try again, or edit it yourself."
- §3.5: "Will finish when you're back online."
- §3.5: "No answer after `AI_STILL_WAITING_MS = 15_000`"
- §4.5: "The edit form takes `TITLE_MAX` and `DESCRIPTION_MAX` from `src/lib/taskLimits.ts`, which the board-fixes branch adds."

**Tags:** screen, failure-paths, security

**Knowledge:** `features/add-task` and `features/task-board`: Pro accounts can suggest labels and rewrite or translate the description, each undoable; `security/data-protection`: a task's title and description go to the AI provider only when an assist is pressed, after consent.

**Acceptance:**
- Given an account without `pro`, when the add screen or the edit form opens, then neither Suggest nor the description menu is rendered.
- Given a Pro account with no labels, then Suggest is hidden; with labels and a title of only spaces, then Suggest is disabled; with a title, then it is enabled.
- Given a Pro account and a description of only spaces, then the description menu is disabled.
- Given a Pro account without consent, when Suggest, Rewrite or Translate is pressed, then part A's consent dialog opens first and no request exists until Agree.
- Given the selection `['l2']`, when Suggest is answered `labelIds: ['l1', 'l2']`, then the selection is `['l2', 'l1']` and the snackbar says "Added 1 label" with Undo; Undo makes it `['l2']` again.
- Given the selection `[]`, when Suggest is answered `['l1', 'l3']`, then the snackbar says "Added 2 labels".
- Given the selection `['l1']`, when Suggest is answered `['l1']` or `[]`, then the selection is unchanged and the snackbar says "No other labels fit this task." with no action.
- Given the selection changed from `['l2']` to `['l2', 'l3']` while Suggest was working, when the answer comes, then the selection stays `['l2', 'l3']` and the snackbar says "The labels changed, so the suggestions weren't applied."
- Given the description "kal doodh lana", when Rewrite is answered `{ description: 'Kal doodh lana hai.' }`, then the field shows that and the snackbar says "Description rewritten" with Undo; Undo puts back "kal doodh lana".
- Given Translate is answered `{ description: 'कल दूध लाना है।', language: 'hi' }`, then the snackbar says "Translated to Hindi"; with `language: 'en'`, "Translated to English".
- Given the description was edited while Rewrite was working, when the answer comes, then the field keeps the edit and the snackbar says "The description changed, so the rewrite wasn't applied."; for Translate, "The description changed, so the translation wasn't applied."
- Given Fill from text or any assist is out on the add screen, then Fill, Suggest and the description menu are all disabled, and the title, description, date, time and labels stay editable.
- Given a request ends `error: 'limit'`, then the snackbar says "You've used this month's 300 AI requests. They reset on the 1st." and every AI button stays disabled; `'not-pro'` gives "AI help isn't available on this account."; `'invalid'` or `'failed'` gives "Couldn't do that. Try again, or edit it yourself." and the form is unchanged.
- Given the device is offline, when an assist is pressed, then "Will finish when you're back online." shows beside its button; given no answer after 15,000 ms, then "Still working…" shows there and it keeps waiting.
- Given an assist is pending in the edit form, when the form is closed, then the request document is deleted; on the add screen, when the person leaves, the same.
- Given the edit form, then its title and description limits come from `src/lib/taskLimits.ts`, and a rewrite answer is applied only through the form's own field, which those limits check on save.
- Given each new string, then `en/ai.json` and `hi/ai.json` have the same keys, and the Hindi says the same as the English.

- [ ] **Step 1: Write the failing tests** for each Acceptance case: the service in `src/services/ai.test.ts` against the emulators; the two components in their test files, mounted inside the add screen and inside the edit form, writing each answer into the request document in the emulator

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/services/ai.test.ts src/components/ai/SuggestLabelsButton.test.ts src/components/ai/DescriptionAssistMenu.test.ts`
Expected: FAIL on the new assertions; part A's service cases pass

- [ ] **Step 3: Write the minimal implementation** to the Interfaces: `requestAssist`, the store's `assist` and `busy`, the two components, their use in `TaskAddView.vue` and `TaskEditForm.vue` with the changed-meanwhile check and the Undo snackbar, and the strings

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/services/ai.test.ts src/components/ai/SuggestLabelsButton.test.ts src/components/ai/DescriptionAssistMenu.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/ai.ts src/services/ai.test.ts src/stores/ai.ts src/components/ai/SuggestLabelsButton.vue src/components/ai/SuggestLabelsButton.test.ts src/components/ai/DescriptionAssistMenu.vue src/components/ai/DescriptionAssistMenu.test.ts src/views/TaskAddView.vue src/components/tasks/TaskEditForm.vue src/i18n/locales/en/ai.json src/i18n/locales/hi/ai.json
git commit -m "feat(ai): suggest labels, rewrite and translate on the task forms"
```
