# Security

What was checked on 2026-11-02 while hardening the release pipeline, and what is left for the
project owner. The earlier security fixes in the app itself (Firestore rules, sanitised Markdown,
the public `testFunction` removed) are in [FIXES_REPORT.md](FIXES_REPORT.md), section S.

## Left for the owner

1. **Restrict the Firebase browser API key** (Google Cloud console > APIs & Services >
   Credentials, the "Browser key" of `spanion-todo`):
   - Application restrictions: HTTP referrers `https://spanion-todo.web.app/*`,
     `https://spanion-todo.firebaseapp.com/*`, `http://localhost/*` and `http://localhost:*/*`
     (the dev server and the e2e server).
   - API restrictions: only the APIs the app calls: Identity Toolkit API, Token Service API,
     Cloud Firestore API, Firebase Installations API and FCM Registration API (add others only if
     the console reports a blocked call).
2. **Consider App Check** (reCAPTCHA Enterprise for the web app; Play Integrity for the Android
   app), first in monitoring mode, then enforced for Firestore. It stops other sites and scripts
   from using the public web config against the project. The CSP in `firebase.json` would then
   need `https://www.google.com` and `https://www.recaptcha.net` in `script-src` and `frame-src`.
3. **The web config in the 2019 git history** (commits `327d48b`, `7c0b8ed`, `b0407b9`: `.env`
   and `src/firebase/index.ts`) is public by design: the same values ship in every page the app
   serves. It is not a secret and is not worth rewriting history for; restricting the key (1) is
   the fix. `.gitleaks.toml` allowlists exactly those commits and files, plus Firebase Storage
   download-token URLs of public images, so the secret scan still catches anything new.
4. **Give the deploy service account only the roles for what Actions deploys** (README.md,
   "Deploy & CI setup"):
   - Hosting only (every push to `master`): Firebase Hosting Admin and API Keys Viewer.
   - Rules and indexes (`deploy_rules`): add Firebase Rules Admin and Cloud Datastore Index Admin.
   - Functions (`deploy_functions`): add Cloud Functions Developer, Service Account User and Cloud
     Scheduler Admin (the scheduled reminder).

   If you never deploy rules or functions from Actions, leave those roles off. If a functions
   deploy stops on a missing permission (Service Usage, Artifact Registry), add that one role,
   such as Service Usage Consumer, rather than a broad role such as Editor.
5. **Look after the deploy key.** The deploy workflow signs in with the service account's JSON
   key, stored only as the repository secret `FIREBASE_SERVICE_ACCOUNT` (Settings > Secrets and
   variables > Actions). Hosting gets it through `FirebaseExtended/action-hosting-deploy`; the
   rules and functions steps write it to a temporary file on the runner, readable only by the
   runner user, and remove it when the step ends. It is a long-lived credential: never commit it
   (`.gitignore` covers `*-firebase-adminsdk-*.json`, `spanion-todo-*.json` and
   `service-account*.json`, and the gitleaks scan looks for private keys), rotate it every 90 days
   or so (and at once if it may have leaked), and delete old keys. Workload Identity Federation is
   the keyless alternative.
6. **Delete the legacy functions.** `testFunction` (public, returns other users' data) and
   `testSchedule` stay live until removed: the first functions deploy from Actions deletes them
   (`--force`), or delete them by hand at once (README.md, "Deploy & CI setup", step 3).
7. **The audit findings left** (below): wait for firebase-tools and workbox-build releases.

## What was checked

| Area | Result |
|---|---|
| Hard-coded credentials in tracked files | One: the reminder's notification icon was a Firebase Storage URL with an access token in `functions/src/reminders.ts`. It is now `<APP_URL>/img/icons/android-chrome-192x192.png`, with `APP_URL` a firebase-functions param (`functions/.env.example`). |
| Other project ids, URLs and emails in code | None that belong in config. Left as they are, on purpose: the README screenshot (a public Storage URL with a download token), `.firebaserc` (the project id), the Android TWA project's host names (`packages/android`), the contact address in `PRIVACY.md`, the author link in the app menu, and `--project spanion-todo` in the README's manual deploy commands (the deploy workflow reads the project id from the `FIREBASE_PROJECT_ID` variable). Test emails in `e2e/` and `src/**/*.test.ts` are fake (`example.com`, `example.info`, `user.info`). |
| Environment files | `.env.example` lists every `VITE_` variable the app reads; `.env.ci` holds only demo values (project `demo-todo`); `.env`, `.env.local`, `functions/.env` and `functions/.env.*` (except the example) are git-ignored. |
| Secret scan | gitleaks 8.30.1 over the whole history: 6 findings before the allowlists, all reviewed (item 3 above), none after. Runs in CI on every pull request and every push to `master`. |
| Hosting headers | `firebase.json` sends a Content Security Policy, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` and `Permissions-Policy` on every path. The CSP allows no `unsafe-eval` and no inline script (the built `index.html` has none); inline styles are allowed for Vuetify. |
| CI and deploy | Workflows run with a read-only token (`contents: read`; the gitleaks job adds `pull-requests: read`). Every action is pinned to a full commit SHA, which Dependabot updates weekly, and checkouts don't persist the token. Deploy runs on a push to `master` and calls the CI workflow first: hosting deploys only if every CI job passes. Rules and functions deploy only from a manual run with their box ticked. A "Check deploy configuration" step names missing variables or the missing secret without printing values. |
| Code scanning | CodeQL (`.github/workflows/codeql.yml`), `security-and-quality` queries over JavaScript/TypeScript and the workflows themselves, on pull requests, pushes to `master` and weekly. |
| Shipped-dependency audit in CI | `npm audit --omit=dev --audit-level=moderate` in the `checks` job: the findings left (below) are all in dev-only packages, which `--omit=dev` leaves out, so a new moderate or worse advisory in a runtime dependency is what fails CI. |

## Dependency audit

_Checked 2026-11-02 with `npm audit` (root) and `npm --prefix functions audit`._

| Package | Before | After |
|---|---|---|
| Root (`/`) | 47 (5 high, 40 moderate, 2 low) | 7 (0 high, 3 moderate, 4 low), all in dev-only tooling |
| Functions (`/functions`) | 16 (16 moderate) | 0 |

### What was fixed, and how

The advisories were all in transitive dependencies. They are lifted to patched versions with npm
`overrides` (in `package.json` and `functions/package.json`), each scoped to the consumers that
were checked to work with the new version. Nothing was downgraded, and npm audit's "fix"
suggestions (all downgrades, such as `firebase-tools@3.18.2`) were not applied.

| Advisory | Was | Now | Consumer, and why the override is safe |
|---|---|---|---|
| `@grpc/grpc-js` < 1.13.6 (high) | 1.9.16 | 1.14.7 | `firebase` > `@firebase/firestore` (Node build only; the browser bundle uses WebChannel, not gRPC). Same 1.x API; firebase-tools already uses 1.14.7. A Firestore read through the Node SDK still connects. |
| `@opentelemetry/core` < 2.8.0 | 1.30.1 | 2.x | `firebase-tools` > `@google-cloud/pubsub` 5. Pubsub uses only `W3CTraceContextPropagator`, which 2.x keeps (pubsub 6 itself moved to `^2.8.0`). |
| `uuid` < 11.1.1 | 9.0.1 | 11.1.1 | `firebase-tools` > `gaxios` 6, which calls `v4()` through CommonJS; uuid 11 still ships CommonJS (12+ doesn't). |
| `glob` 9.0.0 to 14.0.1 | 10.5.0, 11.1.0, 13.0.6 | 14.0.3 | `firebase-tools` (and its `rimraf`, `archiver-utils`, `exegesis`), `workbox-build`, `js-beautify`; in functions, `firebase-admin` > `google-gax` > `rimraf`. All call the promise/sync API (`glob`, `sync`, `globSync`, `hasMagic`), which glob 14 keeps; none uses the old callback API. The hosting file list firebase-tools builds is identical before and after. |
| `minimatch` < 11.0.1 | 10.2.6, 9.0.9, 5.1.9 | 11.0.4 | `eslint`, `@eslint/config-array`, `@typescript-eslint/typescript-estree`, `editorconfig`, `readdir-glob`, `filelist`, and glob 14 itself. Each uses the named exports (`Minimatch`, `minimatch`, `escape`, `match`). |

### What is left, and why

All three are in tools that run only on a developer's machine or in CI. None is in the app's
bundle or in the deployed functions.

| Advisory | Where | Why it is not fixed |
|---|---|---|
| `minimatch` < 11.0.1 (ReDoS on crafted patterns) | `firebase-tools` (3.1.5) and its `superstatic` (6.2.3) | Both call minimatch as a default-export function (`minimatch(path, pattern)`). minimatch 10 and later have no default export, so an override would break `firebase deploy` and the emulators. There is no patched 3.x or 6.x. The patterns come from this repo's own `firebase.json`, not from users. Waits for a firebase-tools release that moves to minimatch 11. |
| `deepmerge` 4.2.0 to 4.3.1 (prototype poisoning) | `vite-plugin-pwa` > `workbox-build` > `@rollup/plugin-node-resolve` | No patched version exists (4.3.1 is the latest). It merges the build's own rollup options at build time, never user data. |

npm reports the packages that depend on these (`firebase-tools`, `superstatic`, `workbox-build`,
`vite-plugin-pwa`, `@rollup/plugin-node-resolve`) as the other findings in the count of 7.

Dependabot (`.github/dependabot.yml`) opens weekly update PRs. When firebase-tools or workbox-build
ship patched versions, drop the matching overrides and check `npm audit` again.
