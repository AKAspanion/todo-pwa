# AI foundation and fill from text (AI part A)

- **Date:** 2026-11-03
- **Status:** written, waiting for the developer's review
- **Part of:** [decisions/ai-features-roadmap](../../knowledge/decisions/ai-features-roadmap.md), part A of seven
- **Builds on:** [decisions/ai-provider-switchable](../../knowledge/decisions/ai-provider-switchable.md),
  [decisions/ai-requests-via-firestore](../../knowledge/decisions/ai-requests-via-firestore.md),
  [decisions/ai-monthly-limit](../../knowledge/decisions/ai-monthly-limit.md),
  [decisions/pro-granted-by-admin-script](../../knowledge/decisions/pro-granted-by-admin-script.md)

## 1. Goal

A Pro account can type a task in plain words, in English, Hindi or Hinglish ("call mom tomorrow 7pm",
"kal shaam 7 baje doodh lana #ghar"), and have the add screen's form filled in from it: title, description, date,
time, "no date" and labels. The person checks the form and saves it as they do today.

Underneath, this part builds what every later AI part reuses: the Pro flag and the script that sets it, the AI
consent, the request documents and the function that answers them, the monthly limit, and a provider layer that
runs on Claude or Gemini.

Success is:

- A Pro account that has given consent gets a filled form from one sentence, usually within a few seconds.
- An account without Pro sees no AI anywhere, and can't make a request even by writing to Firestore itself.
- No account can make more than `AI_MONTHLY_LIMIT = 300` provider calls in a calendar month.
- Changing `AI_PROVIDER` from `claude` to `gemini` and redeploying the functions changes nothing else.

## 2. Out of scope

- Payments and plans of different sizes (part G). Pro is set by hand until then.
- Any AI outside the add screen: home quick add (usability part 3 can call the same request kind later), task
  assists (part B), voice and photos (part C), digests (part D), triage (part E), questions over tasks (part F).
- Showing non-Pro accounts that Pro exists (no upsell) until there is a way to buy it.
- Streaming answers. A request is answered once, whole.

## 3. What the person sees

### 3.1 The "Fill from text" box (Pro accounts only)

- On the add screen (`src/views/TaskAddView.vue`), above the title, a one-line text box labelled "Fill from text",
  a "Fill" button, and a line under them: "N of 300 left this month".
- The box takes at most `AI_TEXT_MAX = 500` characters, counted as the add screen already counts them (code
  points). Fill is disabled while the box is empty or over the limit.
- On Fill, the box and button disable and a progress indicator shows. When the answer comes:
  - The form's fields are replaced with the answer's, except that a date or time the answer leaves empty keeps
    what the form had. Labels are set to the answer's labels.
  - Focus moves to the title, so the person reads what was filled. Nothing is saved until they press Save.
  - The text box clears and the "left this month" line updates.
- The person can keep editing the form while a request is out; the answer still replaces the fields, so the box
  says "Filling…" and the form is not disabled. (Chosen over locking the form: a slow answer shouldn't trap
  someone who has given up on it.)
- Leaving the screen before the answer comes abandons the request: the listener stops and the document is left
  for the clean-up (§4.3).

### 3.2 Consent (first use only)

- The first Fill from an account that hasn't given consent opens a dialog before anything is sent:
  - What is sent: the text you ask it to work on (what you type or say into Fill from text, a task's title and description, or a question), your tasks' titles, dates, labels and descriptions when you sort them out or ask about them, a photo you choose, the names of the account's labels, today's date, the time and the time zone.
  - Who gets it: "the AI service we use, Anthropic's Claude or Google's Gemini".
  - That the request and its answer are deleted from the app within a day.
  - Agree and Not now. Agree records consent (§4.1) and then sends the request. Not now closes the dialog and sends
    nothing.
- Consent is per account, not per device, and is asked once.

### 3.3 Messages

All in English and Hindi, in `src/i18n/locales/en` and `src/i18n/locales/hi`.

| When | Message |
|---|---|
| The month's limit is reached | "You've used this month's 300 AI requests. They reset on the 1st." Fill stays disabled until then. |
| Pro was revoked while the screen was open (`'not-pro'`) | "Fill from text isn't available on this account." The box hides after the next token refresh. |
| The answer couldn't be used, or the provider failed | "Couldn't fill that in. Try rewording it, or fill the form yourself." |
| The device is offline | Fill stays enabled; the box says "Will fill when you're back online." The request waits in Firestore's queue. |
| No answer after `AI_STILL_WAITING_MS = 15_000` | The box says "Still working…"; it keeps waiting. There is no client timeout, as with saves ([decisions/saves-never-time-out](../../knowledge/decisions/saves-never-time-out.md)). |

## 4. Design

### 4.1 Pro and consent

- **Pro is a custom claim**, `pro: true`, on the Firebase Auth user. A client can never set its own claims, so
  nothing in `firestore.rules` has to stop it.
- **`functions/scripts/grant-pro.ts`**, run as `npm --prefix functions run pro -- <email> [--revoke]`:
  - trims and lower-cases the email, finds the user by it (and stops, naming the email, when there is none), merges `pro: true` into their existing claims (or removes `pro` with `--revoke`),
    and prints the uid and the claim's new state. It never prints a token.
  - runs with the developer's own Google credentials, like `migrate-legacy.ts` beside it, and against the Auth
    emulator when `FIREBASE_AUTH_EMULATOR_HOST` is set.
- **The app reads the claim** in the session store (`src/stores/session.ts`): on each sign-in it reads the ID token
  with a forced refresh once, so a claim granted since the last sign-in counts at once, and exposes `isPro`. A claim
  revoked while someone is signed in reaches the app at the next token refresh, within an hour; the function
  re-checks the claim on every request (§4.3), so a revoked account gets no answers in the meantime.
- **Consent** is `aiConsentAt`, a timestamp on a new document, `users/{uid}`. The owner may create it once with
  `aiConsentAt == request.time` and no other field, and may read it. Nobody may change or delete it from a client.
  The session store loads it with `isPro`.

### 4.2 Data

`src/types/models.ts` gains the client's view of these; each collection's rules are in §4.4.

**`aiRequests/{requestId}`**: one AI request and its answer.

| Field | Written by | Meaning |
|---|---|---|
| `uid` | client, on create | The owner. |
| `kind` | client, on create | `'parseTask'`. Later parts add kinds. |
| `input` | client, on create | For `parseTask`: `{ text, today: 'YYYY-MM-DD', now: 'HH:mm', timeZone }`, the device's local day, time and IANA zone, as the add screen already reads them. |
| `status` | client `'pending'`; then the function | `'pending'` → `'working'` → `'done'` or `'error'`. |
| `createdAt` | client, on create | `serverTimestamp()`. |
| `result` | the function | For `parseTask`: `{ title, description, indefinite, date, time, labelIds }`, the shape of `TaskInput`, with `date` and `time` `null` when the text gave none. |
| `error` | the function | `'limit'`, `'not-pro'`, `'invalid'` or `'failed'`. |
| `expireAt` | the function | When the clean-up deletes the document (§4.3). |

**`aiUsage/{uid}`**: `{ month: 'YYYY-MM', count, limit }`. `month` is the calendar month in UTC. Only the
function writes it; the owner reads it for the "left this month" line. `limit` is written from
`AI_MONTHLY_LIMIT` so the app never holds its own copy of the number.

### 4.3 The function

`answerAiRequest` in `functions/src/ai/answer.ts`, exported from `functions/src/index.ts`, triggered by
`onDocumentCreated('aiRequests/{requestId}')`. Its work is a plain function,
`runAiRequest(db, auth, provider, requestId, now)`, which the tests call directly, as `runReminders` is.

1. **Claim, in one transaction:** read the request; stop if its `status` isn't `'pending'` (a trigger can run
   twice for one document). Read the user's claims through the Admin SDK; without `pro`, set `error: 'not-pro'`
   and stop. Read `aiUsage/{uid}`; if its `month` is the current UTC month and `count >= AI_MONTHLY_LIMIT`, set
   `error: 'limit'` and stop. Otherwise write `count + 1` (or `1` for a new month) with `month` and `limit`, and set
   the request `'working'`. Every write here also sets `expireAt` to one day after `now`.
2. **Ask the provider:** read the user's labels (`types` where `uid` is theirs) and build the prompt (§4.5). Call
   `provider.generateObject(...)`.
3. **Check the answer** against the same limits the rules and the add screen enforce: `title` 1–200 code points
   after trimming, `description` at most 5,000, `date` `'YYYY-MM-DD'` and a real day or `null`, `time` `'HH:mm'` or
   `null`, `time` `null` whenever `date` is, `indefinite` a boolean (and `date` and `time` both `null` when it is
   true). `labelIds` is reduced to ids of the user's own labels, made distinct; an unknown id is dropped, not an
   error.
4. **Answer:** `status: 'done'` with `result`, or `status: 'error'` with `'invalid'` when step 3 fails or the
   provider returned nothing usable, or `'failed'` when the provider threw. A failed or invalid request still
   counts against the month: the provider was paid for it.

The function runs with `timeoutSeconds: 60` and `maxInstances: 10`, which caps how many provider calls can run at
once whatever the number of requests. It logs the request id, kind, outcome, provider and duration; never the text,
the answer or the labels.

**Clean-up:** a Firestore TTL policy on `aiRequests.expireAt` deletes requests about a day after they're claimed.
A request the rules refused never existed. A request the function never claimed (it crashed before step 1) has no
`expireAt`; the owner can delete it, and the app does when its screen closes on a still-`'pending'` request.

### 4.4 Rules

Added to `firestore.rules`, in the file's existing style (`isUser`, `createdKeys`):

- `aiRequests/{id}`:
  - **read**: `isUser(resource.data.uid)`.
  - **create**: `isUser(request.resource.data.uid)`, `request.auth.token.pro == true`, the account's
    `users/{uid}` document has `aiConsentAt`, the keys are exactly `uid`, `kind`, `input`, `status`, `createdAt`,
    `kind == 'parseTask'`, `status == 'pending'`, `createdAt == request.time`, and `input` has exactly `text` (a
    string of 1–500 characters), `today` and `now` (matching the patterns tasks already use) and `timeZone` (1–64
    characters).
  - **delete**: `isUser(resource.data.uid)`.
  - **update**: never.
- `users/{uid}` (the document itself; `devices` beneath it keeps its own rules):
  - **read**: `isUser(uid)`.
  - **create**: `isUser(uid)`, keys exactly `aiConsentAt`, `aiConsentAt == request.time`.
  - **update, delete**: never.
- `aiUsage/{uid}`: **read** `isUser(uid)`; nothing else.

The rules' 500-character check counts UTF-16 units while the app counts code points, so text the app allows always
fits the rules.

### 4.5 The provider layer

In `functions/src/ai/`, following [decisions/ai-provider-switchable](../../knowledge/decisions/ai-provider-switchable.md):

- **`provider.ts`**: the interface every feature calls.

  ```ts
  interface AiProvider {
    readonly name: 'claude' | 'gemini';
    generateObject<T>(request: {
      system: string;
      prompt: string;
      schema: z.ZodType<T>;
      maxOutputTokens: number;
    }): Promise<T>;
  }
  ```

  It throws `AiOutputError` when the provider returned nothing that fits the schema (a refusal, a cut-off answer,
  unparseable output), and `AiProviderError` for anything else (network, rate limit, server error, timeout). The
  function maps the first to `'invalid'` and the second to `'failed'`.
- **`claude.ts`**: `@anthropic-ai/sdk`, `client.messages.parse` with `output_config.format` from
  `zodOutputFormat(schema)` (`@anthropic-ai/sdk/helpers/zod`) and `output_config.effort: 'low'`, a short extraction
  that doesn't need deep thinking. It treats `stop_reason` `'refusal'` or `'max_tokens'`, or a `null`
  `parsed_output`, as `AiOutputError`, and the SDK's typed errors (`Anthropic.APIError` and its subclasses,
  `Anthropic.APIConnectionError`) as `AiProviderError`. The client is built once per instance with
  `timeout: 20_000` (milliseconds) and `maxRetries: 1`, so a call and its one retry stay well inside the
  function's 60 seconds. `maxOutputTokens` for `parseTask` is `4_000`: Haiku 5.5 thinks adaptively by default and
  thinking counts against it, so a tight cap would cut answers off.
- **`gemini.ts`**: `@google/genai`, asking for JSON in the shape of the same schema converted to JSON Schema, then
  parsing it with the same Zod schema. The exact binding is checked against the `@google/genai` documentation when
  it is built. It maps its errors to the same two classes.
- **`index.ts`**: `providerFromConfig()` picks the provider from the param `AI_PROVIDER` (`claude` or `gemini`) and
  the model from `AI_MODEL` (`claude-haiku-5-5` to start), both `defineString` params set in `functions/.env` and
  declared in `functions/.env.example`, as `APP_URL` is. The keys are the secrets `ANTHROPIC_API_KEY` and
  `GEMINI_API_KEY`, bound with `defineSecret`. Both must exist in Secret Manager for the function to deploy; the
  unused one may hold a placeholder.
- **The `parseTask` schema and prompt** live in `functions/src/ai/parseTask.ts`, not in a provider. The schema
  given to the provider has the fields and types of `result` without length limits, since providers' structured
  output support for limits varies; §4.3 step 3 applies the limits. The system prompt gives today's date, the time
  and the zone; the user's labels as id and name; and the rules: one task; the title in the language and script
  the person wrote in; relative days ("tomorrow", "kal", "next Monday") resolved against today in their zone;
  `date` and `time` `null` when the text gives none; `indefinite` only when the text says there's no date
  ("someday", "kabhi bhi"); labels only from the list given, matched by name or a `#tag`; a description only for
  detail that isn't in the title. The person's text goes in the user message, never in the system prompt.

### 4.6 The app

- **`src/services/ai.ts`**, the only code that touches `aiRequests`, `aiUsage` and `users/{uid}`, as
  [project/architecture](../../knowledge/project/architecture.md) requires of services:
  `requestParseTask(input)` creates the request and returns its id and a way to listen for its answer;
  `cancelRequest(id)` deletes a still-pending one; `watchUsage(uid)`; `giveAiConsent(uid)`; `loadAiConsent(uid)`.
- **`src/stores/ai.ts`**, a setup store ([decisions/setup-style-stores](../../knowledge/decisions/setup-style-stores.md)):
  the consent flag, the usage line, and the one request in flight. The session store clears it with the other
  per-user stores on sign-out or a change of user.
- **`src/components/ai/FillFromText.vue`** and **`src/components/ai/AiConsentDialog.vue`**, used by
  `TaskAddView.vue`, which shows them only when `isPro`. The view applies an answer to its form as §3.1 says.

## 5. Hostile input and integrity

- **The text is the person's own**, sent only on their own behalf: a prompt injection in it can only change their
  own answer. The provider gets no tools, fetches nothing and sees no other account's data. Label names are the
  person's own text too and go to the provider as data, in a list.
- **The answer is untrusted.** It is checked field by field (§4.3 step 3) before it is written, and the app treats
  it as a suggestion the person edits and saves through the normal path, which the task rules check again.
- **Size and shape** of a request are checked by the rules (§4.4), and every request's owner is the signed-in
  account.
- **Who may ask** is checked twice: by the rules from the token's `pro` claim, and by the function from the Admin
  SDK's current claims, so a revocation takes effect at once on the server.
- **Spend** is bounded per account by the monthly count, taken in the same transaction that claims the request,
  so a trigger that runs twice counts once; and overall by `maxInstances`. A burst of refused requests costs
  function runs and writes, not provider calls.
- **Secrets** stay in Secret Manager, bound only to `answerAiRequest`; neither the app nor any log sees them.
- **No new way in**: `answerAiRequest` has an event trigger only, and the entry-point test in
  `functions/src/reminders.test.ts` keeps failing on any HTTP or callable export.

## 6. Testing

Built test first. Each task runs only the tests it writes; the full checks run at the end of the plan.

- **`functions/src/ai/answer.test.ts`**, `runAiRequest` against the Firestore emulator with a fake provider and a
  fake Auth reader: a good answer is written `'done'`; a second run on the same request changes nothing and
  counts once; no `pro` claim gives `'not-pro'` with no provider call; the 300th request is answered and the 301st
  gets `'limit'` with no provider call; a new month starts the count again; an unknown label id is dropped; each
  limit in §4.3 step 3 gives `'invalid'`; an `AiOutputError` gives `'invalid'` and an `AiProviderError` gives
  `'failed'`, both counted; every outcome sets `expireAt`; nothing logged contains the text.
- **`functions/src/ai/claude.test.ts`** and **`gemini.test.ts`**, each with its SDK client replaced: a parsed answer
  comes back typed; a refusal, a `max_tokens` stop and a `null` parse each throw `AiOutputError`; a rate-limit
  error and a connection error each throw `AiProviderError`; the model comes from `AI_MODEL`.
- **`functions/src/ai/index.test.ts`**: `AI_PROVIDER` picks the provider; any other value fails at start-up,
  naming the param.
- **The entry-point test** in `functions/src/reminders.test.ts` lists `answerAiRequest`, expects an event trigger
  on it, and still fails on any HTTP or callable trigger.
- **`tests/rules/firestore.rules.test.ts`**: each create rule in §4.4, allowed and refused (no `pro`, no consent,
  someone else's uid, an extra key, `status` other than `'pending'`, text of 0 and 501 characters, a wrong
  `kind`); no client update on `aiRequests`; `users/{uid}` created once and never changed; `aiUsage` readable only by
  its owner and never writable.
- **`src/components/ai/FillFromText.test.ts`**: hidden without Pro; consent asked once before the first request;
  an answer fills the form and keeps a date the answer left empty; the limit, failure and offline messages; leaving
  the screen cancels a pending request.
- **`src/stores/session.test.ts`**: `isPro` follows the claim; sign-out clears the AI store.

## 7. Operations

The one-time steps go in `README.md`, under a new "AI features" section:

- Put both keys in Secret Manager (`firebase functions:secrets:set ANTHROPIC_API_KEY`, and `GEMINI_API_KEY`), and set
  `AI_PROVIDER` and `AI_MODEL` in `functions/.env`.
- Create the TTL policy on the `aiRequests` collection group's `expireAt` field.
- Grant Pro with `npm --prefix functions run pro -- <email>`, and revoke it with `--revoke`.
- Update the privacy policy to say that Pro accounts' AI requests go to Anthropic or Google. That is the owner's
  step, not code.

AI spend shares the budget the kill-switch watches ([integrations/cloud-billing](../../knowledge/integrations/cloud-billing.md));
the README says so beside the budget.

## 8. What this binds later

- When account deletion is built (usability part 8), it deletes `users/{uid}`, `aiUsage/{uid}` and the account's
  `aiRequests` as well.
- Every later AI part adds a `kind`, its own schema and prompt beside `parseTask.ts`, and its own case in the rules'
  `kind` check, and goes through `runAiRequest`'s claim and count. None calls a provider SDK directly.
