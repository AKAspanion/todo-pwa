---
type: Security
title: Data protection
description: What is sensitive here — tasks, push tokens, the deploy key — and the protections in the rules, the rendering, the hosting headers, the build and the logs.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
verified: human:panditankit1995@gmail.com
---

# Data protection

## Sensitive data

- Users' tasks, labels and notifications, and their email, name and photo URL (from Firebase Auth).
- FCM registration tokens, one per device.
- The deploy service account's JSON key, kept only as the `FIREBASE_SERVICE_ACCOUNT` repository secret
  ([operations/deploy](../operations/deploy.md)).
- Not secret: the Firebase web config, which ships in every page; restricting the browser API key is the
  protection ([risks/debt](../risks/debt.md)).

## Protections

- **Ownership and validation:** [security/roles](roles.md).
- **Rendering:** descriptions are Markdown rendered by markdown-it with raw HTML off, then sanitised by
  DOMPurify; every link opens with `rel="noopener noreferrer"` (`renderMarkdown` in `src/lib/markdown.ts`,
  spec S3).
- **Hosting headers** (`firebase.json`): `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy`
  everywhere; a Content Security Policy with no inline script and no `unsafe-eval`, `frame-ancestors 'none'`
  and `X-Frame-Options: DENY` on every path but `/__/**`.
- **Source maps** are built but moved out of `dist/` into `sourcemaps/`, so they are never deployed
  (`moveSourceMapsOutOfDist` in `vite.config.ts`, spec S5).
- **Device tokens** are checked before they become a document id, since a `/` or `..` would name another
  path (`checkedToken` in `src/services/devices.ts`).
- **Logs** name an error by its code only, never its message ([project/conventions](../project/conventions.md)).
- **No HTTP functions:** the old public `testFunction` returned every user's tokens and task titles; it is
  gone from the code and, per the developer on 2026-11-03, deleted from the live project; a test fails on any
  new HTTP export ([apps/functions](../apps/functions.md)).
- **Secrets in git:** `.gitignore` covers env files and the usual key file names, and CI's gitleaks scan
  (`.gitleaks.toml`) runs on every pull request and push. The scan for this knowledge base still flagged
  lines to look at: [findings/committed-secret-candidates](../findings/committed-secret-candidates.md).
- What was checked, and what is left for the owner: `docs/SECURITY.md`.

## History

- 2026-11-03: the old `testFunction` was still to be deleted from the live project; now deleted, per the developer.

## Sources

- `src/lib/markdown.ts`
- `src/services/devices.ts`
- `firebase.json`
- `vite.config.ts`
- `.gitignore`
- `.gitleaks.toml`
- `docs/SECURITY.md`
