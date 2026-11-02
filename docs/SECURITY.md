# Security

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
