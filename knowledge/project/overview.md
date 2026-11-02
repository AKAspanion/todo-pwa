---
type: Project Overview
status: draft
title: Task Manager (todo-pwa)
description: A personal task manager that installs as a PWA and on Android, with labels, a calendar and a push reminder an hour before a task is due.
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-02T19:14:37Z
---

# Task Manager (todo-pwa)

## Purpose

Task Manager lets one signed-in person keep their own tasks: a title, a Markdown description, a date and
time (or none), and labels. Tasks sit in a Todo and a Done list, can be searched, filtered by label and day,
and seen on a calendar. A dated task gets a push reminder in the hour before it is due. It speaks English and
Hindi, has a light and a dark theme, and its app shell works offline. Every user sees only their own data:
there is no sharing and no roles beyond "owner" ([security/roles](../security/roles.md)).

It runs live at `https://todo.spanion.in` and `https://spanion-todo.web.app` (Firebase project `spanion-todo`,
named in `.firebaserc`). The current code is a 2026-11-02 rebuild of a 2019 Vue 2 app; the rebuild's spec,
`docs/specs/2026-11-02-modernize-and-fix.md`, lists the behaviour that had to be kept and every defect fixed.

## Applications

- [apps/web](../apps/web.md): the Vue 3 single-page app at the repository root (`src/`), served by Firebase
  Hosting. It reads and writes Firestore directly; there is no API server ([project/architecture](architecture.md)).
- [apps/functions](../apps/functions.md): Cloud Functions in `functions/`: the scheduled reminder run and the
  budget kill-switch.
- [apps/android-twa](../apps/android-twa.md): the Play Store app, a Trusted Web Activity around the site
  (`packages/android/source`).
- [apps/ios-webview](../apps/ios-webview.md): an Xcode WebView wrapper around the site (`packages/ios/src`).

## Open

- [questions/ios-wrapper-status](../questions/ios-wrapper-status.md): whether the iOS wrapper is still shipped.
- [questions/label-edit-delete](../questions/label-edit-delete.md): labels can be created but not renamed or deleted.

## Sources

- `README.md`
- `.firebaserc`
- `package.json`
- `functions/package.json`
- `docs/specs/2026-11-02-modernize-and-fix.md`
