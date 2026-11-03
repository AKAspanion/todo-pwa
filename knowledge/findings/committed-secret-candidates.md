---
type: Finding
title: Secret-shaped values committed to git
description: The inventory scan flagged two whole files and five lines as possible secrets; the docs say they are demo or public values, but nobody has confirmed each one.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
verified: human:panditankit1995@gmail.com
---

# Secret-shaped values committed to git

## Finding

The scan that built this knowledge base withheld these tracked files and lines as possible secrets. Their
values aren't copied here and weren't read while writing it.

- `.env.ci` (whole file)
- `packages/ios/src/Task Manager/GoogleService-Info.plist` (whole file)
- `README.md`, line 172
- `e2e/fixtures/home.ts`, line 18
- `e2e/support/emulator.ts`, line 28
- `src/i18n/locales/en/auth.json`, line 22
- `src/lib/firebase.ts`, line 15

## Evidence

- `README.md` and `docs/SECURITY.md` say `.env.ci` holds only demo values for project `demo-todo` and "contains
  no secrets".
- `src/lib/firebase.ts` line 15 is `EMULATOR_DEFAULTS`, which its comment says the emulators accept as any key.
- `docs/SECURITY.md` says the Firebase web config is public by design, and that gitleaks runs over the whole
  history with reviewed allowlists in `.gitleaks.toml`. The iOS plist is a Firebase config file of that kind.
- The e2e lines and the locale line look like test credentials and a form label, but that is a guess from
  the file's role, not a reading.

## Status

Open: a person should look at each line, confirm it holds no real credential, and record that here or rotate it.

## Sources

- `.env.ci`
- `packages/ios/src/Task Manager/GoogleService-Info.plist`
- `README.md`
- `e2e/fixtures/home.ts`
- `e2e/support/emulator.ts`
- `src/i18n/locales/en/auth.json`
- `src/lib/firebase.ts`
- `docs/SECURITY.md`
- `.gitleaks.toml`
