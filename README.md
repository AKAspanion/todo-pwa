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

CI (`.github/workflows/ci.yml`) runs on every pull request to `master` and every push to it, in
three parallel jobs: `checks` (typecheck, lint, format check, build, unit tests, Firestore rules
tests, and the functions' build, lint and tests), `e2e` (Playwright), and `secrets` (a gitleaks
scan, configured in `.gitleaks.toml`). Dependabot (`.github/dependabot.yml`) opens weekly,
grouped update PRs. Security notes and open items: [docs/SECURITY.md](docs/SECURITY.md).

## Deployment

The live Firebase project is `spanion-todo` (`.firebaserc`). Scheduled functions need the
**Blaze** (pay as you go) plan.

Once set up (next section), every push to `master` that passes CI is deployed by
`.github/workflows/deploy.yml`. To deploy by hand instead:

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
   (`remindAt`, `timeZone`, `reminded`), copies each `fcm/{uid}` token to
   `users/{uid}/devices/{token}`, and gives old notifications a `createdAt`. It needs admin
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

`.github/workflows/deploy.yml` deploys hosting, the Firestore rules and indexes, and the functions
after CI passes on a push to `master` (or when run by hand from the Actions tab, on `master`). It
deploys exactly the commit CI tested, one deploy at a time. It signs in to Google Cloud as a
deploy service account, whose JSON key is the `production` environment's secret
`FIREBASE_SERVICE_ACCOUNT`. Set it up once:

### 1. The GitHub environment and its variables

Create the environment **`production`** (Settings > Environments). Add a required reviewer there
if every deploy should wait for approval. Then add these **variables** to it (variables, not
secrets: the Firebase web config is public and ships in every page):

| Variable | Value |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase console > Project settings > Your apps > SDK config |
| `VITE_FIREBASE_AUTH_DOMAIN` | as above (`spanion-todo.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | as above (`spanion-todo`) |
| `VITE_FIREBASE_STORAGE_BUCKET` | as above |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | as above |
| `VITE_FIREBASE_APP_ID` | as above |
| `VITE_FIREBASE_VAPID_KEY` | Cloud Messaging > Web Push certificates > key pair |
| `APP_URL` | `https://spanion-todo.web.app`: written to `functions/.env` for the functions |

With the GitHub CLI, for example: `gh variable set APP_URL --env production --body https://spanion-todo.web.app`.
Step 2 adds the one **secret**, `FIREBASE_SERVICE_ACCOUNT`. The workflow stops before building if
any of these is missing.

### 2. The deploy service account and its key

Run once, as a project owner, with `gcloud` and the GitHub CLI (`gh`):

```bash
PROJECT_ID=spanion-todo
SA="github-deploy@$PROJECT_ID.iam.gserviceaccount.com"

# The deploy service account, with only the roles a deploy needs.
gcloud iam service-accounts create github-deploy \
  --project "$PROJECT_ID" --display-name "GitHub Actions deploy"
for role in roles/firebasehosting.admin roles/cloudfunctions.developer \
  roles/firebaserules.admin roles/datastore.indexAdmin roles/iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member "serviceAccount:$SA" --role "$role" --condition None
done

# Its JSON key, straight into the production environment's secret, then off this machine.
KEY_FILE="$(mktemp -d)/service-account.json"
gcloud iam service-accounts keys create "$KEY_FILE" --iam-account "$SA" --project "$PROJECT_ID"
gh secret set FIREBASE_SERVICE_ACCOUNT --env production --repo AKAspanion/todo-pwa < "$KEY_FILE"
rm -P "$KEY_FILE"   # macOS; elsewhere: shred -u "$KEY_FILE"
```

If the first functions deploy stops on a missing permission for Cloud Scheduler or Service Usage,
grant `roles/cloudscheduler.admin` or `roles/serviceusage.serviceUsageConsumer` the same way
(docs/SECURITY.md).

The key is a long-lived credential:

- **Never commit it.** `.gitignore` covers the usual key file names (`*-firebase-adminsdk-*.json`,
  `spanion-todo-*.json`, `service-account*.json`), and CI's gitleaks scan looks for private keys,
  but keep key files out of the repository folder altogether.
- **Rotate it** every 90 days or so, and at once if it may have leaked: create a new key, update
  the secret as above, check that a deploy works, then delete the old key
  (`gcloud iam service-accounts keys list --iam-account "$SA"`, then
  `gcloud iam service-accounts keys delete <KEY_ID> --iam-account "$SA"`).
- **The keyless alternative** is Workload Identity Federation: GitHub Actions gets short-lived
  tokens for the service account, and no key exists to leak or rotate. To switch, create a
  workload identity pool and an OIDC provider for `https://token.actions.githubusercontent.com`
  restricted to `assertion.repository == 'AKAspanion/todo-pwa'`, give the principal
  `repo:AKAspanion/todo-pwa:environment:production` the role `roles/iam.workloadIdentityUser` on
  the service account, then pass `workload_identity_provider` and `service_account` to
  `google-github-actions/auth` instead of `credentials_json`, add `id-token: write` to the
  workflow's permissions, and delete the key and the secret.

### 3. Before the first automatic deploy

The workflow deploys with `--non-interactive`, so it can't answer the CLI's questions. Do these
once, by hand:

- Delete the two old functions, which the new code no longer has:
  `npx firebase functions:delete testFunction testSchedule --project spanion-todo --force`.
  (A non-interactive deploy stops rather than delete them.)
- Set the container image cleanup policy the functions deploy asks about:
  `npx firebase functions:artifacts:setpolicy --project spanion-todo`.

## Android (TWA)

`packages/android/source` is the Trusted Web Activity project for the Play Store app
(`app.web.spanion_todo.twa`); `packages/android/Readme.html` explains how to build and sign it.
Its build outputs (`.gradle/`, `app/build/`, `*.idsig`, `*.apk`, `*.aab`) and signing keys are
git-ignored.

## Author

[**Ankit Kumar Pandit**](http://spanion.xyz)
