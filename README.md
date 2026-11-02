# Task Manager

![](https://firebasestorage.googleapis.com/v0/b/spanion-todo.appspot.com/o/smartmockups_k4fmi3on.png?alt=media&token=81bb0c3d-eeab-401b-b933-8622e3d7cf94)

A task manager that installs as a progressive web app, and on Android from the Play Store (a
Trusted Web Activity, `packages/android`).

- Live site: [spanion-todo.web.app](https://spanion-todo.web.app/)
- Sign in with Google, or with an email and password. (Facebook sign-in has been removed.)

## Features

- Tasks with a title, a Markdown description, a date and time (or none), and labels.
- A Todo and a Done list: drag a task between them, or use its check button.
- Search by text, filter by labels, and pick a day in the date bar.
- Calendar with day, week and month views.
- A push reminder an hour before a dated task is due.
- English and Hindi; light and dark theme.
- Works offline for the app shell once it has been opened online.

## Stack

Vue 3.5, Vite 8, Vuetify 4, vue-router 5, Pinia, vue-i18n 11, Firebase 13 (modular API), and
vite-plugin-pwa (Workbox). Cloud Functions run on Node 22 with firebase-functions 7. Tests use
Vitest and Playwright against the Firebase Emulator Suite.

## Development

### Prerequisites

- **Node 24**: the version is in `.nvmrc` (`nvm use`). The Cloud Functions run on Node 22 in
  production; Node 24 runs their tests and build locally.
- **Java 21 or later**, for the Firebase emulators.
- The **Firebase CLI**: it is installed with the dev dependencies (`npx firebase`). Run
  `npx firebase login` once before you deploy.

### Install

```bash
git clone https://github.com/AKAspanion/todo-pwa.git
cd todo-pwa
npm install
npm --prefix functions install
npx playwright install chromium webkit   # once, for the e2e tests
```

### Environment

Copy `.env.example` to `.env.local` (it is git-ignored). Every variable starts with `VITE_`:

| Variable | What it is |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase console > Project settings > Your apps > SDK config |
| `VITE_FIREBASE_AUTH_DOMAIN` | as above |
| `VITE_FIREBASE_PROJECT_ID` | as above |
| `VITE_FIREBASE_STORAGE_BUCKET` | as above |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | as above |
| `VITE_FIREBASE_APP_ID` | as above |
| `VITE_FIREBASE_VAPID_KEY` | Cloud Messaging > Web Push certificates > key pair. Only push notifications need it (it was `VUE_APP_VAPID_KEY` in the old app). |
| `VITE_USE_EMULATORS` | `true` to use the local emulators (the default in `.env.example`), `false` to use the real project |

With `VITE_USE_EMULATORS=true` the Firebase values can stay empty: the app uses the demo project
`demo-todo`. `.env.ci` holds the demo values the tests and CI use; it contains no secrets.

### Run the app against the emulators

```bash
# terminal 1: Auth, Firestore and Functions emulators for the demo project
npx firebase emulators:start --project demo-todo

# terminal 2: the app, at http://localhost:5173
npm run dev
```

The emulators use their own ports, set in `firebase.json`:

| Emulator | Port |
|---|---|
| Auth | 9199 |
| Firestore | 8180 |
| Functions | 5101 |

These are **not** Firebase's defaults (9099, 8080, 5001), because another local project uses the
defaults on the developer's machine. The app, the tests and the scripts all read the ports from
`firebase.json`, so change them there if you need to.

The emulators start empty every time. Sign up in the app to create an account.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-checks, then builds to `dist/`. Source maps go to `sourcemaps/`, never `dist/`. |
| `npm run preview` | Serves the built `dist/` |
| `npm run typecheck` | `vue-tsc` over the app |
| `npm run lint` | ESLint |
| `npm run format` / `npm run format:check` | Prettier: write, or check only |
| `npm run test` | Vitest unit tests, inside `firebase emulators:exec` (Auth and Firestore) |
| `npm run test:rules` | The Firestore security-rules tests in `tests/rules` |
| `npm run e2e` | Playwright tests in Chromium and WebKit, against the emulators and a Vite server on port 5179 |

`test`, `test:rules` and `e2e` start and stop the emulators themselves, so nothing else needs to be
running. Pass file names after `--` to run some of them: `npm run e2e -- e2e/smoke.spec.ts`.

Cloud Functions (`functions/`):

| Command | What it does |
|---|---|
| `npm --prefix functions run build` | Compiles TypeScript to `functions/lib/` |
| `npm --prefix functions run test` | Vitest, against the Firestore emulator |
| `npm --prefix functions run lint` | ESLint |
| `npm --prefix functions run migrate -- --tz Asia/Kolkata [--dry-run]` | One-off migration of the old app's data (below) |

CI (`.github/workflows/ci.yml`) runs on every pull request, and on every push to `master` as the
first job of the deploy workflow. It has four parallel jobs: `checks` (lint, typecheck, format
check, unit tests, Firestore rules tests, the production build, and `npm audit` of the shipped
dependencies), `functions` (the Cloud Functions' build, lint and tests), `e2e` (Playwright in
Chromium and WebKit), and `secrets` (a gitleaks scan, configured in `.gitleaks.toml`). CodeQL
(`.github/workflows/codeql.yml`) scans the code and the workflows on pull requests, pushes to
`master` and weekly. Every action is pinned to a commit SHA; Dependabot
(`.github/dependabot.yml`) opens weekly, grouped update PRs for npm packages and for those
actions. Security notes and open items: [docs/SECURITY.md](docs/SECURITY.md).

## Deployment

The live Firebase project is `spanion-todo` (`.firebaserc`). Scheduled functions need the
**Blaze** (pay as you go) plan.

Once set up (next section), `.github/workflows/deploy.yml` deploys the Firestore rules and
indexes and then hosting on every push to `master` that passes CI, and the functions when run by
hand. To deploy from your own machine instead:

1. Put the live project's values in `.env.local`, with `VITE_USE_EMULATORS=false` and
   `VITE_FIREBASE_VAPID_KEY` set. Copy `functions/.env.example` to `functions/.env` (it sets
   `APP_URL`, the site address the reminder notifications take their icon from).
2. Build the app: `npm run build`.
3. Deploy the security rules and indexes first, then the functions, then the site:

   ```bash
   npx firebase deploy --project spanion-todo --only firestore:rules,firestore:indexes
   npx firebase deploy --project spanion-todo --only functions
   npx firebase deploy --project spanion-todo --only hosting
   ```

   The functions are built by `firebase.json`'s predeploy step. The functions deploy asks to
   delete the two old functions, `testFunction` (public, leaks data) and `testSchedule` (the old
   hourly reminder): answer yes. `sendReminders` replaces them.
4. Once, after the first deploy, migrate the old data. It fills in each task's reminder fields
   (`remindAt`, `timeZone`, `reminded`) and gives old notifications a `createdAt`. It does not
   copy the old push tokens (`fcm/{uid}`): they belong to the old app's messaging worker, which
   the site now unregisters, so users who had reminders on switch them on again once in the new
   app. It needs admin
   credentials for the live project (`GOOGLE_APPLICATION_CREDENTIALS`, or
   `gcloud auth application-default login` with `GOOGLE_CLOUD_PROJECT=spanion-todo`). Try it with
   `--dry-run` first, which writes nothing:

   ```bash
   npm --prefix functions run migrate -- --tz Asia/Kolkata --dry-run
   npm --prefix functions run migrate -- --tz Asia/Kolkata
   ```

   Running it again changes nothing.

`/.well-known/assetlinks.json` (in `public/`) holds the Play Store app's signing-key fingerprints,
so the Android app opens without a URL bar.

## Deploy & CI setup

What runs, and when:

- **Every pull request** runs CI (`.github/workflows/ci.yml`) and CodeQL.
- **Every push to `master`** runs the Deploy workflow (`.github/workflows/deploy.yml`): it runs the
  same CI suite first and, only if that passes, builds the app with the live config, deploys the
  **Firestore rules and indexes**, then **hosting** (the `live` channel), so the app never goes
  live without the rules it was tested against (CI's rules tests gate a rules change). One deploy
  at a time; a running deploy is never cancelled.
- **The Cloud Functions** deploy only by hand: Actions > Deploy > Run workflow, on `master`, with
  **deploy_functions** ticked (off by default). A manual run deploys the rules first and hosting
  last, as a push does.

All settings are **repository-level**: Settings > Secrets and variables > Actions, not an
environment. The deploy job runs in a GitHub environment called `production`, which GitHub
creates on the first run; it only records the deployments and links the site. (Add a required
reviewer there if every deploy should wait for approval. Don't add variables or secrets to it: they
would override the repository-level ones.)

### 1. Repository variables

Variables, not secrets: the Firebase web config is public and ships in every page.

| Variable | Value |
|---|---|
| `FIREBASE_PROJECT_ID` | `spanion-todo`: the project hosting, rules and functions deploy to |
| `APP_URL` | `https://spanion-todo.web.app`: the site address, shown on the deployment and written to `functions/.env` for the functions |
| `VITE_FIREBASE_API_KEY` | Firebase console > Project settings > Your apps > SDK config |
| `VITE_FIREBASE_AUTH_DOMAIN` | as above (`spanion-todo.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | as above (`spanion-todo`) |
| `VITE_FIREBASE_STORAGE_BUCKET` | as above |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | as above |
| `VITE_FIREBASE_APP_ID` | as above |
| `VITE_FIREBASE_VAPID_KEY` | Optional. Cloud Messaging > Web Push certificates > key pair. Without it the site deploys (with a warning) but push reminders don't work. |

Set them all at once from a dotenv file kept outside the repository:

```bash
VARS_FILE="$(mktemp -d)/deploy-vars.env"
cat > "$VARS_FILE" <<'VARS'
FIREBASE_PROJECT_ID=spanion-todo
APP_URL=https://spanion-todo.web.app
VITE_FIREBASE_API_KEY=<from the console>
VITE_FIREBASE_AUTH_DOMAIN=spanion-todo.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=spanion-todo
VITE_FIREBASE_STORAGE_BUCKET=<from the console>
VITE_FIREBASE_MESSAGING_SENDER_ID=<from the console>
VITE_FIREBASE_APP_ID=<from the console>
VITE_FIREBASE_VAPID_KEY=<from the console>
VARS
gh variable set --repo AKAspanion/todo-pwa -f "$VARS_FILE"
```

One at a time: `gh variable set APP_URL --repo AKAspanion/todo-pwa --body https://spanion-todo.web.app`.
The workflow's "Check deploy configuration" step stops before building and names any variable
that is missing, or the missing secret (it never prints a value).

### 2. The deploy service account and its key

The one **secret**, `FIREBASE_SERVICE_ACCOUNT`, is the JSON key of a deploy service account. Give
the account only the roles for what you deploy from Actions:

| Deploys | Roles |
|---|---|
| Rules, indexes and hosting (every push) | Firebase Rules Admin (`roles/firebaserules.admin`), Cloud Datastore Index Admin (`roles/datastore.indexAdmin`), Firebase Hosting Admin (`roles/firebasehosting.admin`), API Keys Viewer (`roles/serviceusage.apiKeysViewer`) |
| Functions (`deploy_functions`) | add Cloud Functions Developer (`roles/cloudfunctions.developer`), Service Account User (`roles/iam.serviceAccountUser`), Cloud Scheduler Admin (`roles/cloudscheduler.admin`, for the scheduled reminder) |

Run once, as a project owner, with `gcloud` and the GitHub CLI (`gh`):

```bash
PROJECT_ID=spanion-todo
SA="github-deploy@$PROJECT_ID.iam.gserviceaccount.com"

gcloud iam service-accounts create github-deploy \
  --project "$PROJECT_ID" --display-name "GitHub Actions deploy"

# Rules, indexes and hosting (every push):
roles=(roles/firebaserules.admin roles/datastore.indexAdmin
  roles/firebasehosting.admin roles/serviceusage.apiKeysViewer)
# To deploy the functions from Actions as well:
roles+=(roles/cloudfunctions.developer roles/iam.serviceAccountUser roles/cloudscheduler.admin)

for role in "${roles[@]}"; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member "serviceAccount:$SA" --role "$role" --condition None
done

# Its JSON key, straight into the repository secret, then off this machine.
KEY_FILE="$(mktemp -d)/service-account.json"
gcloud iam service-accounts keys create "$KEY_FILE" --iam-account "$SA" --project "$PROJECT_ID"
gh secret set FIREBASE_SERVICE_ACCOUNT --repo AKAspanion/todo-pwa < "$KEY_FILE"
rm -P "$KEY_FILE"   # macOS; elsewhere: shred -u "$KEY_FILE"
```

With a key file you already have: `gh secret set FIREBASE_SERVICE_ACCOUNT --repo AKAspanion/todo-pwa < path/to/key.json`.

If a functions deploy stops on a missing permission (Service Usage or Artifact Registry, for
example), grant that one role, such as Service Usage Consumer
(`roles/serviceusage.serviceUsageConsumer`), rather than a broad role such as Editor.

The key is a long-lived credential:

- **Never commit it.** `.gitignore` covers the usual key file names (`*-firebase-adminsdk-*.json`,
  `spanion-todo-*.json`, `service-account*.json`), and CI's gitleaks scan looks for private keys,
  but keep key files out of the repository folder altogether. The workflow writes it to a
  temporary file only inside the rules and functions deploy steps, and removes it afterwards.
  Every `npm ci` runs earlier, without the key and with `--ignore-scripts`, so no dependency's
  install script runs while the key is on the runner.
- **Rotate it** every 90 days or so, and at once if it may have leaked: create a new key, update
  the secret as above, check that a deploy works, then delete the old key
  (`gcloud iam service-accounts keys list --iam-account "$SA"`, then
  `gcloud iam service-accounts keys delete <KEY_ID> --iam-account "$SA"`).

Workload Identity Federation is the keyless alternative (short-lived tokens, no key to leak).

### 3. Once, before the first deploy

1. **Delete the legacy functions first, before merging or deploying anything:** `testFunction`
   is public and returns every user's push token and task titles, and `testSchedule` is the old
   hourly reminder. Nothing deploys the functions on a push to `master`, so they stay live until
   this runs (with the Firebase CLI signed in as a project owner; `npx firebase` works too):

   ```bash
   firebase functions:delete testFunction testSchedule --project spanion-todo --force
   ```

   (The first functions deploy from Actions would also delete them, as it runs with `--force`.)
2. **Move `spanion-todo` to the Blaze plan** (Firebase console > Usage and billing). Scheduled
   functions need it.
3. **Deploy:** the push that brings this workflow to `master` deploys the rules and indexes, then
   hosting. Hosting carries the kill switches (`public/service-worker.js` and
   `public/firebase-messaging-sw.js`) that take installed copies of the old app off its old
   service workers, so the old app stops writing against the new rules. Then deploy the
   functions: Actions > Deploy > Run workflow on `master`, with **deploy_functions** ticked.
4. **Run the data migration** once, after that deploy (Deployment, step 4 above), first with
   `--dry-run`.

If the functions deploy log warns that no container image cleanup policy is set, set one once:
`npx firebase functions:artifacts:setpolicy --project spanion-todo`.

## Android (TWA)

`packages/android/source` is the Trusted Web Activity project for the Play Store app
(`app.web.spanion_todo.twa`); `packages/android/Readme.html` explains how to build and sign it.
Its build outputs (`.gradle/`, `app/build/`, `*.idsig`, `*.apk`, `*.aab`) and signing keys are
git-ignored.

## Author

[**Ankit Kumar Pandit**](http://spanion.xyz)
