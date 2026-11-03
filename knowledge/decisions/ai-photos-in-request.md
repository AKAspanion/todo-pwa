---
type: Decision
title: A photo travels inside its AI request, shrunk by the app, with no Storage
description: The app shrinks a picked photo to a small JPEG and puts it in the aiRequests document, which the rules size-check and the function clears once it answers; Firebase Storage isn't used.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-03T06:05:00Z
---

# A photo travels inside its AI request, shrunk by the app, with no Storage

## Context

Photo to tasks (part C, [decisions/ai-features-roadmap](ai-features-roadmap.md)) needs an image to reach the
request function ([decisions/ai-requests-via-firestore](ai-requests-via-firestore.md)). The project has no Firebase
Storage bucket rules and no Storage emulator. A Firestore document holds at most 1 MiB.

## Decision

The developer decided on 2026-11-03 that the app shrinks the photo to a JPEG no larger than 1600 px on its long
edge and about 700 KB once encoded, and puts it in the request document's `input`. The rules refuse a larger one,
and the function deletes the image from the document in the same write that answers or refuses the request.
Storage was turned down as one more service, rule set and clean-up job for an image that is needed for seconds.

## Consequences

- Re-encoding in the app drops the photo's metadata, location included, before anything is sent.
- The image can never be larger than a Firestore document allows, which bounds what one request costs.
- The exact limits are in part C's spec, `docs/specs/2026-11-03-ai-capture.md`.

## History

- 2026-11-03: the image stayed in the request until its one-day expiry; now the function deletes it when it
  answers or refuses, because it is needed only for the provider call. See part C's spec.

## Sources

- `firebase.json`
- `firestore.rules`
- `docs/specs/2026-11-03-ai-capture.md`
