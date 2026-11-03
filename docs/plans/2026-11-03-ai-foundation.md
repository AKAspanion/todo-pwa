# AI Foundation and Fill from Text Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: the project's workflow policy names the executor (`run.executor`): ga:implement-with-subagents by default, or ga:implement. Follow the policy and this plan's Checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pro accounts fill the add screen's form from one sentence of plain words, through a Firestore-triggered function that calls Claude or Gemini behind one provider interface, within a monthly limit.

**Architecture:** The app writes an `aiRequests` document that `firestore.rules` admits only from a Pro account with consent; `answerAiRequest`, a Firestore-triggered Cloud Function, claims and counts it in one transaction, asks the configured provider for a task in a Zod-defined shape, checks the answer and writes it back; the add screen listens and fills its form. Pro is a custom claim set by an admin script.

**Tech Stack:** Vue 3 + Vuetify + Pinia + vue-i18n (web app at the repository root, built by Vite); Firebase Auth, Firestore and Hosting; Cloud Functions on Node 22 with firebase-functions v2 and firebase-admin (`functions/`); `@anthropic-ai/sdk`, `@google/genai` and `zod` (new, in `functions/`); Vitest against the Firebase emulators; GitHub Actions (`.github/workflows/ci.yml`, `.github/workflows/deploy.yml`).

**Spec:** `docs/specs/2026-11-03-ai-foundation.md`

## Global Constraints

- §1: "No account can make more than `AI_MONTHLY_LIMIT = 300` provider calls in a calendar month."
- §3.1: "The box takes at most `AI_TEXT_MAX = 500` characters, counted as the add screen already counts them (code points)."
- §4.5: "the model from `AI_MODEL` (`claude-haiku-5-5` to start)"
- §5: "`answerAiRequest` has an event trigger only, and the entry-point test in `functions/src/reminders.test.ts` keeps failing on any HTTP or callable export."
- §4.3: "It logs the request id, kind, outcome, provider and duration; never the text, the answer or the labels."
- §5: "Secrets stay in Secret Manager, bound only to `answerAiRequest`; neither the app nor any log sees them."
- Every visible string is in `src/i18n/locales/en/ai.json` and `src/i18n/locales/hi/ai.json`, with the same keys (`knowledge/project/conventions.md`).
- No `any` and no `@ts-ignore` (`./eslint.config.js`); new stores use the setup style.
- No provider SDK is imported outside `functions/src/ai/claude.ts` and `functions/src/ai/gemini.ts`.

## Checkpoints

None. The policy's `run.checkpoints` is `none`, and this plan adds no stop. The build runs in a later session.

---

### Task 1: Foundation: dependencies, contracts and rules

**Files:**
- Modify: `functions/package.json` (dependencies `@anthropic-ai/sdk`, `@google/genai`, `zod`; script `"pro": "tsx scripts/grant-pro.ts"`)
- Modify: `functions/package-lock.json`
- Create: `functions/src/ai/types.ts`
- Modify: `src/types/models.ts`
- Modify: `firestore.rules`
- Test: `tests/rules/firestore.rules.test.ts`

**Interfaces:**
- Consumes: existing `isUser(uid)`, `createdKeys()` and the task date and time patterns in `firestore.rules`.
- Produces, in `functions/src/ai/types.ts` (Tasks 2, 3, 4):

```ts
export const AI_MONTHLY_LIMIT = 300;
export const AI_TEXT_MAX = 500;

export type AiRequestKind = 'parseTask';
export type AiRequestStatus = 'pending' | 'working' | 'done' | 'error';
export type AiErrorCode = 'limit' | 'not-pro' | 'invalid' | 'failed';

export interface ParseTaskInput { text: string; today: string; now: string; timeZone: string }
export interface ParseTaskResult {
  title: string; description: string; indefinite: boolean;
  date: string | null; time: string | null; labelIds: string[];
}

export interface AiProvider {
  readonly name: 'claude' | 'gemini';
  generateObject<T>(request: {
    system: string; prompt: string; schema: z.ZodType<T>; maxOutputTokens: number;
  }): Promise<T>;
}

export class AiOutputError extends Error {}
export class AiProviderError extends Error {}
```

- Produces, in `src/types/models.ts` (Task 5): `AI_TEXT_MAX = 500`, `ParseTaskInput`, `ParseTaskResult`, `AiRequestStatus`, `AiErrorCode` with the same shapes, and

```ts
export interface AiRequest {
  id: string; uid: string; kind: 'parseTask'; input: ParseTaskInput;
  status: AiRequestStatus; result: ParseTaskResult | null; error: AiErrorCode | null;
}
export interface AiUsage { month: string; count: number; limit: number }
```

- Produces, in `firestore.rules`: the rules for `aiRequests/{id}`, `users/{uid}` and `aiUsage/{uid}` (Tasks 3, 5).

**Spec:**
- §4.4: "**create**: `isUser(request.resource.data.uid)`, `request.auth.token.pro == true`, the account's `users/{uid}` document has `aiConsentAt`, the keys are exactly `uid`, `kind`, `input`, `status`, `createdAt`, `kind == 'parseTask'`, `status == 'pending'`, `createdAt == request.time`, and `input` has exactly `text` (a string of 1–500 characters), `today` and `now` (matching the patterns tasks already use) and `timeZone` (1–64 characters)."
- §4.4: "**update**: never."
- §4.4: "**create**: `isUser(uid)`, keys exactly `aiConsentAt`, `aiConsentAt == request.time`."
- §4.4: "`aiUsage/{uid}`: **read** `isUser(uid)`; nothing else."
- §4.1: "Nobody may change or delete it from a client."

**Tags:** security

**Knowledge:** `data/model`: three new collections, `aiRequests`, `aiUsage` and the `users/{uid}` document, each owned by the uid it carries; `security/roles`: Pro is the `pro` custom claim, which only the Admin SDK can set, and the rules require it to create an AI request.

**Acceptance:**
- Given a signed-in user with `pro: true` and a `users/{uid}` document holding `aiConsentAt`, when they create an `aiRequests` document with exactly `uid` (their own), `kind: 'parseTask'`, `input` `{ text: 'call mom tomorrow 7pm', today: '2026-11-03', now: '10:30', timeZone: 'Asia/Kolkata' }`, `status: 'pending'` and `createdAt` the server time, then it is allowed.
- Given the same user without the `pro` claim, when they create that document, then it is refused.
- Given a Pro user with no `users/{uid}` document, when they create that document, then it is refused.
- Given a Pro user with consent, when they create a request whose `uid` is another user's, then it is refused.
- Given a Pro user with consent, when the request has an extra key `result`, then it is refused.
- Given a Pro user with consent, when `status` is `'done'`, then it is refused.
- Given a Pro user with consent, when `kind` is `'summarise'`, then it is refused.
- Given a Pro user with consent, when `input.text` is `''`, then it is refused; when it is 500 characters, it is allowed; when it is 501, it is refused.
- Given a Pro user with consent, when `input.today` is `'3/11/2026'` or `input.now` is `'7pm'`, then it is refused.
- Given a Pro user with consent, when `input.timeZone` is 65 characters, then it is refused.
- Given an existing request, when its owner updates any field, then it is refused; when its owner deletes it, it is allowed; when another user reads or deletes it, it is refused.
- Given a user with no `users/{uid}` document, when they create it with only `aiConsentAt` at the server time, then it is allowed; with an extra key, or with `aiConsentAt` set to a client time, it is refused.
- Given an existing `users/{uid}` document, when its owner updates or deletes it, then it is refused; when another user reads it, it is refused.
- Given an `aiUsage/{uid}` document, when its owner reads it, then it is allowed; when its owner or anyone else writes it, or another user reads it, it is refused.
- Given the existing `users/{uid}/devices/{token}` rules, when the device tests already in the file run, then they still pass.

- [ ] **Step 1: Add the dependencies and the `pro` script** to `functions/package.json`, install them so `functions/package-lock.json` updates, and write `functions/src/ai/types.ts` and the additions to `src/types/models.ts` to the Interfaces

Run: `npm --prefix functions install @anthropic-ai/sdk @google/genai zod`
Expected: `functions/package.json` and `functions/package-lock.json` list the three packages

- [ ] **Step 2: Write the failing rules tests** for each Acceptance case, in `tests/rules/firestore.rules.test.ts`, in a new `describe` block per collection

- [ ] **Step 3: Run them to verify they fail**

Run: `npm run test:rules -- tests/rules/firestore.rules.test.ts`
Expected: FAIL on the new allowed cases (the collections have no rules yet, so every write is refused); the existing tests pass

- [ ] **Step 4: Write the rules** for `aiRequests/{id}`, `users/{uid}` and `aiUsage/{uid}` in `firestore.rules`, in the file's style

- [ ] **Step 5: Run them to verify they pass**

Run: `npm run test:rules -- tests/rules/firestore.rules.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add functions/package.json functions/package-lock.json functions/src/ai/types.ts src/types/models.ts firestore.rules tests/rules/firestore.rules.test.ts
git commit -m "feat(ai): AI request contracts, dependencies and security rules"
```

---

### Task 2: Provider layer: Claude and Gemini behind one interface

**Files:**
- Create: `functions/src/ai/claude.ts`
- Create: `functions/src/ai/gemini.ts`
- Create: `functions/src/ai/index.ts`
- Test: `functions/src/ai/claude.test.ts`
- Test: `functions/src/ai/gemini.test.ts`
- Test: `functions/src/ai/index.test.ts`
- Modify: `functions/.env.example`
- Modify: `.github/workflows/deploy.yml` (the step that writes `functions/.env`, near line 124)

**Interfaces:**
- Consumes: `AiProvider`, `AiOutputError`, `AiProviderError` from `functions/src/ai/types.ts` (Task 1).
- Produces (Task 3):

```ts
// functions/src/ai/index.ts
export const aiProvider: StringParam;   // defineString('AI_PROVIDER', { default: 'claude' })
export const aiModel: StringParam;      // defineString('AI_MODEL', { default: 'claude-haiku-5-5' })
export const anthropicKey: SecretParam; // defineSecret('ANTHROPIC_API_KEY')
export const geminiKey: SecretParam;    // defineSecret('GEMINI_API_KEY')
export function providerFromConfig(): AiProvider;

// functions/src/ai/claude.ts
export function claudeProvider(options: { apiKey: string; model: string; client?: Anthropic }): AiProvider;

// functions/src/ai/gemini.ts
export function geminiProvider(options: { apiKey: string; model: string; client?: GoogleGenAI }): AiProvider;
```

The optional `client` is how the tests replace each SDK; production code never passes it.

**Spec:**
- §4.5: "It throws `AiOutputError` when the provider returned nothing that fits the schema (a refusal, a cut-off answer, unparseable output), and `AiProviderError` for anything else (network, rate limit, server error, timeout)."
- §4.5: "`@anthropic-ai/sdk`, `client.messages.parse` with `output_config.format` from `zodOutputFormat(schema)` (`@anthropic-ai/sdk/helpers/zod`) and `output_config.effort: 'low'`, a short extraction that doesn't need deep thinking."
- §4.5: "The client is built once per instance with `timeout: 20_000` (milliseconds) and `maxRetries: 1`, so a call and its one retry stay well inside the function's 60 seconds."
- §4.5: "`@google/genai`, asking for JSON in the shape of the same schema converted to JSON Schema, then parsing it with the same Zod schema. The exact binding is checked against the `@google/genai` documentation when it is built."
- §4.5: "`providerFromConfig()` picks the provider from the param `AI_PROVIDER` (`claude` or `gemini`) and the model from `AI_MODEL` (`claude-haiku-5-5` to start), both `defineString` params set in `functions/.env` and declared in `functions/.env.example`, as `APP_URL` is."
- §4.5: "Both must exist in Secret Manager for the function to deploy; the unused one may hold a placeholder."

**Tags:** security, failure-paths

**Knowledge:** `apps/functions`: `functions/src/ai/` holds the provider layer, and only `claude.ts` and `gemini.ts` import a provider SDK; `operations/environment`: `AI_PROVIDER` and `AI_MODEL` are functions params with defaults, and `ANTHROPIC_API_KEY` and `GEMINI_API_KEY` are Secret Manager secrets; `integrations/ai-providers` (new): Claude through `messages.parse` with a Zod output format, Gemini through its JSON-schema response mode, both behind `AiProvider`.

**Acceptance:**
- Given a replaced Anthropic client whose `messages.parse` returns `stop_reason: 'end_turn'` and a `parsed_output` matching the schema, when `generateObject` runs, then it resolves to that object, and the request named the model passed in, `output_config.effort: 'low'` and the `maxOutputTokens` given as `max_tokens`.
- Given `stop_reason: 'refusal'`, then `generateObject` rejects with `AiOutputError`.
- Given `stop_reason: 'max_tokens'`, then it rejects with `AiOutputError`.
- Given `stop_reason: 'end_turn'` and `parsed_output: null`, then it rejects with `AiOutputError`.
- Given `messages.parse` throws `Anthropic.RateLimitError`, then it rejects with `AiProviderError`; given `Anthropic.APIConnectionError`, then `AiProviderError`; given `Anthropic.InternalServerError`, then `AiProviderError`.
- Given `claudeProvider` builds its own client, then that client has `timeout: 20_000` and `maxRetries: 1`.
- Given a replaced Gemini client that returns JSON text matching the schema, when `generateObject` runs, then it resolves to the parsed object, and the request asked for JSON with the schema converted to JSON Schema, for the model passed in.
- Given the Gemini client returns text that isn't JSON, or JSON that fails the schema, or no text, then it rejects with `AiOutputError`.
- Given the Gemini client throws, then it rejects with `AiProviderError`.
- Given `AI_PROVIDER` is `claude`, when `providerFromConfig()` runs, then the provider's `name` is `'claude'`; given `gemini`, then `'gemini'`.
- Given `AI_PROVIDER` is `openai`, when `providerFromConfig()` runs, then it throws an error whose message names `AI_PROVIDER` and the two accepted values.
- Given an error from either provider, when it is wrapped, then the wrapping error's message holds the SDK error's class name or status only, never the request's prompt.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `functions/src/ai/claude.test.ts`, `functions/src/ai/gemini.test.ts` and `functions/src/ai/index.test.ts`, with each SDK client replaced through the `client` option and each module created with its real exports so the tests fail on behaviour

- [ ] **Step 2: Run them to verify they fail**

Run: `npm --prefix functions run test -- src/ai/claude.test.ts src/ai/gemini.test.ts src/ai/index.test.ts`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation** to the Interfaces; check the `@google/genai` call shape against its documentation before writing `gemini.ts`

- [ ] **Step 4: Run them to verify they pass**

Run: `npm --prefix functions run test -- src/ai/claude.test.ts src/ai/gemini.test.ts src/ai/index.test.ts`
Expected: PASS

- [ ] **Step 5: Declare the params** in `functions/.env.example` (`AI_PROVIDER=claude`, `AI_MODEL=claude-haiku-5-5`, each with a comment saying what it chooses) and make the deploy workflow's `functions/.env` step write them from the repository variables `AI_PROVIDER` and `AI_MODEL`, falling back to `claude` and `claude-haiku-5-5`

- [ ] **Step 6: Commit**

```bash
git add functions/src/ai/claude.ts functions/src/ai/gemini.ts functions/src/ai/index.ts functions/src/ai/claude.test.ts functions/src/ai/gemini.test.ts functions/src/ai/index.test.ts functions/.env.example .github/workflows/deploy.yml
git commit -m "feat(ai): Claude and Gemini providers behind one interface"
```

---

### Task 3: The request function: claim, count, ask, check, answer

**Files:**
- Create: `functions/src/ai/parseTask.ts`
- Create: `functions/src/ai/answer.ts`
- Test: `functions/src/ai/parseTask.test.ts`
- Test: `functions/src/ai/answer.test.ts`
- Modify: `functions/src/index.ts`
- Modify: `functions/src/reminders.test.ts` (the `functions entry point` block only)
- Modify: `README.md` (a new "AI features" section after "Deploy & CI setup")

**Interfaces:**
- Consumes: `AI_MONTHLY_LIMIT`, `ParseTaskInput`, `ParseTaskResult`, `AiProvider`, `AiOutputError`, `AiProviderError`, `AiErrorCode` from `functions/src/ai/types.ts` (Task 1); `providerFromConfig()`, `anthropicKey`, `geminiKey` from `functions/src/ai/index.ts` (Task 2); the `aiRequests`, `aiUsage` and `users/{uid}` rules (Task 1).
- Produces:

```ts
// functions/src/ai/parseTask.ts
export const parseTaskSchema: z.ZodType<ParseTaskResult>;   // fields and types only, no length limits
export const PARSE_TASK_MAX_OUTPUT_TOKENS = 4_000;
export function parseTaskPrompt(input: ParseTaskInput, labels: { id: string; label: string }[]): { system: string; prompt: string };
export function checkParseTaskResult(raw: ParseTaskResult, ownLabelIds: Set<string>): ParseTaskResult | null;

// functions/src/ai/answer.ts
export interface ClaimsReader { proOf(uid: string): Promise<boolean> }
export type AiOutcome = 'done' | AiErrorCode | 'skipped';
export function runAiRequest(db: Firestore, auth: ClaimsReader, provider: AiProvider, requestId: string, now: Date): Promise<AiOutcome>;
export const answerAiRequest: CloudFunction<FirestoreEvent<QueryDocumentSnapshot | undefined, { requestId: string }>>;
```

`'skipped'` is the outcome when the request isn't `'pending'` (a repeated trigger).

**Spec:**
- §4.3: "**Claim, in one transaction:** read the request; stop if its `status` isn't `'pending'` (a trigger can run twice for one document)."
- §4.3: "Read the user's claims through the Admin SDK; without `pro`, set `error: 'not-pro'` and stop."
- §4.3: "Read `aiUsage/{uid}`; if its `month` is the current UTC month and `count >= AI_MONTHLY_LIMIT`, set `error: 'limit'` and stop."
- §4.3: "Every write here also sets `expireAt` to one day after `now`."
- §4.3: "`title` 1–200 code points after trimming, `description` at most 5,000, `date` `'YYYY-MM-DD'` and a real day or `null`, `time` `'HH:mm'` or `null`, `time` `null` whenever `date` is, `indefinite` a boolean (and `date` and `time` both `null` when it is true)."
- §4.3: "`labelIds` is reduced to ids of the user's own labels, made distinct; an unknown id is dropped, not an error."
- §4.3: "A failed or invalid request still counts against the month: the provider was paid for it."
- §4.3: "The function runs with `timeoutSeconds: 60` and `maxInstances: 10`, which caps how many provider calls can run at once whatever the number of requests."
- §4.5: "The person's text goes in the user message, never in the system prompt."
- §7: "Create the TTL policy on the `aiRequests` collection group's `expireAt` field."

**Tags:** security, failure-paths

**Knowledge:** `apps/functions`: a third export, `answerAiRequest`, triggered by creating an `aiRequests` document, and still nothing answers HTTP or callable requests; `domain/ai-requests` (new): how a request is claimed, counted, answered and expired, and why a failed one still counts; `operations/deploy`: the AI secrets and the TTL policy are one-time setup steps; `integrations/cloud-billing`: AI spend shares the budget.

**Acceptance:**
- Given a `'pending'` request from a Pro user with two labels, `l1` "ghar" and `l2` "kaam", and a fake provider returning `{ title: 'Doodh lana', description: '', indefinite: false, date: '2026-11-03', time: '19:00', labelIds: ['l1'] }`, when `runAiRequest` runs at `2026-11-03T05:00:00Z`, then the request is `status: 'done'` with that `result`, `aiUsage/{uid}` is `{ month: '2026-11', count: 1, limit: 300 }`, `expireAt` is `2026-11-04T05:00:00Z`, and it returns `'done'`.
- Given that request was already answered, when `runAiRequest` runs on it again, then nothing changes, the provider isn't called, the count stays `1`, and it returns `'skipped'`.
- Given the same request started twice at once, when both runs finish, then the provider was called once and the count is `1`.
- Given a user whose claims have no `pro`, when `runAiRequest` runs, then the request is `status: 'error'`, `error: 'not-pro'`, the provider isn't called, and the count is unchanged.
- Given `aiUsage/{uid}` is `{ month: '2026-11', count: 299 }`, when a request runs in November 2026, then it is answered and the count is `300`; given `count: 300`, then the request is `error: 'limit'`, the provider isn't called and the count stays `300`.
- Given `aiUsage/{uid}` is `{ month: '2026-10', count: 300 }`, when a request runs on `2026-11-01T00:00:00Z`, then it is answered and the usage is `{ month: '2026-11', count: 1, limit: 300 }`.
- Given the provider returns `labelIds: ['l1', 'l1', 'someone-elses']`, then the result's `labelIds` is `['l1']` and the request is `'done'`.
- Given the provider returns a title that is empty after trimming, or 201 code points, then the request is `error: 'invalid'`; given 200 code points of Devanagari, then it is `'done'`.
- Given a description of 5,001 characters, then `'invalid'`; of 5,000, then `'done'`.
- Given `date: '2026-02-30'`, or `date: '03-11-2026'`, or `time: '7pm'`, then `'invalid'`.
- Given `date: null` and `time: '19:00'`, then `'invalid'`; given `indefinite: true` with `date: '2026-11-03'`, then `'invalid'`; given `indefinite: true` with `date` and `time` `null`, then `'done'`.
- Given the provider throws `AiOutputError`, then the request is `error: 'invalid'` and counted; given `AiProviderError`, then `error: 'failed'` and counted.
- Given any outcome other than `'skipped'`, then the request has `expireAt` one day after `now`.
- Given the request's text is "kal shaam 7 baje doodh lana", when the function logs, then no log line contains that text, the answer's title or a label name; it logs the request id, kind, outcome, provider name and duration.
- Given `parseTaskPrompt` with that text and those labels, then the text is in `prompt` and not in `system`, and `system` holds today's date, the time, the zone and both labels by id and name.
- Given the functions entry point, when it is imported, then its exports are exactly `answerAiRequest`, `sendReminders` and `stopBillingOnBudget`; `answerAiRequest` has an event trigger on `aiRequests/{requestId}` creation, `timeoutSeconds: 60`, `maxInstances: 10` and the secrets `ANTHROPIC_API_KEY` and `GEMINI_API_KEY`; and no export has an HTTP or callable trigger.

- [ ] **Step 1: Write the failing tests** for each Acceptance case: the prompt and check cases in `functions/src/ai/parseTask.test.ts`; the `runAiRequest` cases in `functions/src/ai/answer.test.ts`, against the Firestore emulator with a fake `AiProvider`, a fake `ClaimsReader` and a spied logger, clearing the emulator before each test as `functions/src/reminders.test.ts` does; the entry-point case in the `functions entry point` block of `functions/src/reminders.test.ts`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm --prefix functions run test -- src/ai/parseTask.test.ts src/ai/answer.test.ts src/reminders.test.ts`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation** to the Interfaces: `parseTask.ts` (schema, prompt, check), `answer.ts` (`runAiRequest` and the `onDocumentCreated` trigger, which reads claims with the Admin SDK's `getUser(uid).customClaims` and binds both secrets), and the export in `functions/src/index.ts`

- [ ] **Step 4: Run them to verify they pass**

Run: `npm --prefix functions run test -- src/ai/parseTask.test.ts src/ai/answer.test.ts src/reminders.test.ts`
Expected: PASS

- [ ] **Step 5: Write the README's "AI features" section**: setting both secrets with `firebase functions:secrets:set`, the `AI_PROVIDER` and `AI_MODEL` params, creating the TTL policy on `aiRequests.expireAt`, granting and revoking Pro with `npm --prefix functions run pro -- <email>` and `--revoke`, that AI spend shares the kill-switch's budget, and that the privacy policy must name Anthropic and Google before Pro is granted to anyone

- [ ] **Step 6: Commit**

```bash
git add functions/src/ai/parseTask.ts functions/src/ai/answer.ts functions/src/ai/parseTask.test.ts functions/src/ai/answer.test.ts functions/src/index.ts functions/src/reminders.test.ts README.md
git commit -m "feat(ai): answer AI requests with a Firestore-triggered function"
```

---

### Task 4: Granting Pro by hand

**Files:**
- Create: `functions/src/admin/pro.ts`
- Test: `functions/src/admin/pro.test.ts`
- Create: `functions/scripts/grant-pro.ts`

**Interfaces:**
- Consumes: the `pro` script in `functions/package.json` (Task 1).
- Produces:

```ts
// functions/src/admin/pro.ts
export interface ProAuth {
  getUserByEmail(email: string): Promise<{ uid: string; customClaims?: Record<string, unknown> }>;
  setCustomUserClaims(uid: string, claims: Record<string, unknown> | null): Promise<void>;
}
export function setPro(auth: ProAuth, email: string, on: boolean): Promise<{ uid: string; pro: boolean }>;
```

`functions/scripts/grant-pro.ts` reads `<email>` and an optional `--revoke` from its arguments, calls `setPro` with the Admin SDK's Auth, and prints the uid and the claim's new state. It takes no other arguments.

**Spec:**
- §4.1: "trims and lower-cases the email, finds the user by it (and stops, naming the email, when there is none), merges `pro: true` into their existing claims (or removes `pro` with `--revoke`), and prints the uid and the claim's new state. It never prints a token."
- §4.1: "runs with the developer's own Google credentials, like `migrate-legacy.ts` beside it, and against the Auth emulator when `FIREBASE_AUTH_EMULATOR_HOST` is set."

**Tags:** security

**Knowledge:** `security/roles`: Pro is granted and revoked by `npm --prefix functions run pro -- <email> [--revoke]`, which keeps the account's other claims.

**Acceptance:**
- Given a user `alice@example.com` with claims `{ admin: true }`, when `setPro(auth, '  Alice@Example.com ', true)` runs, then `getUserByEmail` was called with `'alice@example.com'`, the claims set are `{ admin: true, pro: true }`, and it returns `{ uid, pro: true }`.
- Given that user now has `{ admin: true, pro: true }`, when `setPro(auth, 'alice@example.com', false)` runs, then the claims set are `{ admin: true }` and it returns `{ uid, pro: false }`.
- Given a user with no claims, when Pro is revoked, then the claims set are `{}` and nothing throws.
- Given no user has the email `nobody@example.com`, when `setPro` runs, then it rejects with an error whose message names `nobody@example.com`, and `setCustomUserClaims` is never called.
- Given `setPro` succeeds, then nothing it returns or throws contains an ID token or the account's other claim values beyond `pro`.
- Given the script is run with no email, then it prints its usage and exits with a non-zero status without calling Auth.

- [ ] **Step 1: Write the failing tests** for each Acceptance case, in `functions/src/admin/pro.test.ts`, with a fake `ProAuth`

- [ ] **Step 2: Run them to verify they fail**

Run: `npm --prefix functions run test -- src/admin/pro.test.ts`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation** of `setPro` in `functions/src/admin/pro.ts`, and `functions/scripts/grant-pro.ts` around it, with the argument handling the usage case needs kept in `pro.ts` so it is tested

- [ ] **Step 4: Run them to verify they pass**

Run: `npm --prefix functions run test -- src/admin/pro.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add functions/src/admin/pro.ts functions/src/admin/pro.test.ts functions/scripts/grant-pro.ts
git commit -m "feat(ai): admin script to grant and revoke Pro"
```

---

### Task 5: Fill from text on the add screen

**Files:**
- Create: `src/services/ai.ts`
- Test: `src/services/ai.test.ts`
- Create: `src/stores/ai.ts`
- Modify: `src/stores/session.ts`
- Test: `src/stores/session.test.ts`
- Create: `src/components/ai/FillFromText.vue`
- Create: `src/components/ai/AiConsentDialog.vue`
- Test: `src/components/ai/FillFromText.test.ts`
- Modify: `src/views/TaskAddView.vue`
- Create: `src/i18n/locales/en/ai.json`
- Create: `src/i18n/locales/hi/ai.json`

**Interfaces:**
- Consumes: `AI_TEXT_MAX`, `ParseTaskInput`, `ParseTaskResult`, `AiRequest`, `AiUsage` from `src/types/models.ts` (Task 1); the `aiRequests`, `users/{uid}` and `aiUsage/{uid}` rules (Task 1); existing `currentUid()`, `errorCode()` and the per-user store reset in `src/stores/session.ts`; existing `todayYmd()` in `src/lib/dates.ts`. This task's tests write each request's answer straight into the emulator, in the shape `AiRequest` gives, so they need no function running.
- Produces:

```ts
// src/services/ai.ts
export function requestParseTask(uid: string, input: ParseTaskInput): Promise<string>;   // the request id
export function watchRequest(id: string, onChange: (request: AiRequest) => void): () => void;
export function cancelRequest(id: string): Promise<void>;
export function watchUsage(uid: string, onChange: (usage: AiUsage | null) => void): () => void;
export function loadAiConsent(uid: string): Promise<boolean>;
export function giveAiConsent(uid: string): Promise<void>;

// src/stores/session.ts gains
isPro: Ref<boolean>;   // from the ID token's `pro` claim, refreshed once on each sign-in

// src/stores/ai.ts
export const useAiStore: StoreDefinition<'ai', ...>;
// state: consented: boolean | null; usage: AiUsage | null; pending: { id: string } | null; error: AiErrorCode | null
// actions: load(): Promise<void>; consent(): Promise<void>; fill(text: string): Promise<ParseTaskResult | null>; cancel(): Promise<void>
```

`FillFromText.vue` emits `filled(result: ParseTaskResult)`; `TaskAddView.vue` applies it to its form.

**Spec:**
- §3.1: "On the add screen (`src/views/TaskAddView.vue`), above the title, a one-line text box labelled "Fill from text", a "Fill" button, and a line under them: "N of 300 left this month"."
- §3.1: "The form's fields are replaced with the answer's, except that a date or time the answer leaves empty keeps what the form had. Labels are set to the answer's labels."
- §3.1: "Focus moves to the title, so the person reads what was filled. Nothing is saved until they press Save."
- §3.1: "Leaving the screen before the answer comes abandons the request: the listener stops and the document is left for the clean-up (§4.3)."
- §3.2: "What is sent: the text you ask it to work on (what you type or say into Fill from text, a task's title and description, or a question), your tasks' titles, dates, labels and descriptions when you sort them out or ask about them, a photo you choose, the names of the account's labels, today's date, the time and the time zone."
- §3.2: "Who gets it: "the AI service we use, Anthropic's Claude or Google's Gemini"."
- §3.2: "Agree and Not now. Agree records consent (§4.1) and then sends the request. Not now closes the dialog and sends nothing."
- §3.3: "You've used this month's 300 AI requests. They reset on the 1st."
- §3.3: "Fill from text isn't available on this account."
- §3.3: "Couldn't fill that in. Try rewording it, or fill the form yourself."
- §3.3: "Will fill when you're back online."
- §3.3: "No answer after `AI_STILL_WAITING_MS = 15_000`"
- §4.1: "on each sign-in it reads the ID token with a forced refresh once, so a claim granted since the last sign-in counts at once, and exposes `isPro`."
- §4.3: "the owner can delete it, and the app does when its screen closes on a still-`'pending'` request."

**Tags:** screen, failure-paths, security

**Knowledge:** `features/add-task`: Pro accounts can fill the form from plain words, which never saves the task; `security/data-protection`: an account's AI text, label names, date, time and zone go to the AI provider only after its one-time consent, and the request is deleted within a day; `apps/web`: `src/services/ai.ts` is the only code that touches the AI collections.

**Acceptance:**
- Given a signed-in account without the `pro` claim, when the add screen opens, then no "Fill from text" box is rendered.
- Given a Pro account, when the add screen opens with usage `{ month: <this UTC month>, count: 12, limit: 300 }`, then the box, a "Fill" button and "288 of 300 left this month" show; with no usage document, "300 of 300 left this month".
- Given the box is empty, or holds 501 code points, then Fill is disabled; given 500 code points, then it is enabled.
- Given a Pro account without consent, when Fill is pressed, then the consent dialog opens, naming "the AI service we use, Anthropic's Claude or Google's Gemini" and what is sent, and no request exists yet.
- Given the dialog, when Not now is pressed, then it closes and no `users/{uid}` document or request is written; when Agree is pressed, then `users/{uid}` gets `aiConsentAt` and one `aiRequests` document is created with the text, today's local date, the local time and the device's zone.
- Given a Pro account with consent, when Fill is pressed again in a later visit, then no dialog opens and the request is created.
- Given a request is out, then the box says "Filling…", the box and button are disabled, and the form's fields stay editable.
- Given the request is answered `'done'` with `{ title: 'Doodh lana', description: 'Amul, 1 litre', indefinite: false, date: '2026-11-04', time: '19:00', labelIds: ['l1'] }`, then the form shows those values, focus is on the title, the box is empty, and no task has been saved.
- Given the form's date is `2026-11-03` and time `10:30`, when the answer has `date: null` and `time: null`, then the form keeps `2026-11-03` and `10:30` and takes the other fields.
- Given the answer has `indefinite: true`, then the form is set to no date.
- Given the request ends `error: 'limit'`, then the screen says "You've used this month's 300 AI requests. They reset on the 1st." and Fill stays disabled; given usage already at `count: 300` for this month on opening, then Fill is disabled with the same message.
- Given the request ends `error: 'not-pro'`, then the screen says "Fill from text isn't available on this account."
- Given the request ends `error: 'invalid'` or `'failed'`, then the screen says "Couldn't fill that in. Try rewording it, or fill the form yourself." and the form is unchanged.
- Given the device is offline, when Fill is pressed, then Fill stays enabled and the box says "Will fill when you're back online."
- Given no answer after 15,000 ms, then the box says "Still working…" and keeps waiting; it sets no timeout that gives up.
- Given a request is still `'pending'`, when the person leaves the add screen, then the listener stops and the request document is deleted.
- Given the session store, when a user whose token has `pro: true` signs in, then `isPro` is `true` and the token was read with a forced refresh once; when one without it signs in, then `false`; when they sign out, then `isPro` is `false` and the AI store is reset.
- Given an answer arrives after the user signed out or changed, then it is dropped and the form isn't touched.
- Given each new string, then `en/ai.json` and `hi/ai.json` have the same keys, and the Hindi strings say the same as the English ones.

- [ ] **Step 1: Write the failing tests** for each Acceptance case: the service cases in `src/services/ai.test.ts` against the emulators; `isPro` and the reset in `src/stores/session.test.ts`; the screen cases in `src/components/ai/FillFromText.test.ts`, mounting the add screen with a Pro user and writing each answer into the request document in the emulator

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/services/ai.test.ts src/stores/session.test.ts src/components/ai/FillFromText.test.ts`
Expected: FAIL on the assertions

- [ ] **Step 3: Write the minimal implementation** to the Interfaces: the service, the `isPro` change in the session store (and the AI store's reset beside the other per-user stores), the AI store, the two components, the add screen's use of them, and the strings in `src/i18n/locales/en/ai.json` and `src/i18n/locales/hi/ai.json`

- [ ] **Step 4: Run them to verify they pass**

Run: `npm test -- src/services/ai.test.ts src/stores/session.test.ts src/components/ai/FillFromText.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/ai.ts src/services/ai.test.ts src/stores/ai.ts src/stores/session.ts src/stores/session.test.ts src/components/ai/FillFromText.vue src/components/ai/AiConsentDialog.vue src/components/ai/FillFromText.test.ts src/views/TaskAddView.vue src/i18n/locales/en/ai.json src/i18n/locales/hi/ai.json
git commit -m "feat(ai): fill the add form from plain words for Pro accounts"
```
