---
type: Decision
title: The AI features are built in seven parts, foundation first
description: Ten paid AI features are grouped into seven parts — foundation with fill-from-text, task assists, capture, digests, overdue triage, ask your tasks, and payments last — each with its own spec and plan.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-03T05:14:00Z
---

# The AI features are built in seven parts, foundation first

## Context

Ten AI features were proposed for a paid plan ("Pro"). Together they add an AI provider, a Pro flag, new functions
and new data, far more than one plan at this project's pace (five tasks or fewer per plan). Some of them overlap
the usability roadmap ([decisions/usability-roadmap](usability-roadmap.md)), which plans its own quick add (its
part 3) and checklists inside a task (its part 5).

## Decision

The developer agreed on 2026-11-03 to build them as seven parts, in this order, each with its own spec and plan:

- **A. Foundation and fill from text**: the provider layer, the Pro flag and its admin script, the AI consent, the
  request function and its monthly limit; and a "Fill from text" box on the add screen that fills in the form from
  plain words in English, Hindi or Hinglish, for the user to check before saving. It doesn't depend on the usability
  roadmap's quick add, which can use the same AI action later.
- **B. Task assists**: suggest labels from the user's own labels, and rewrite or translate a description
  ([decisions/ai-assists-on-request](ai-assists-on-request.md)).
- **B2. Steps**: break a task into steps. It waits for the usability roadmap's checklists (its part 5), so it fills
  real checklist items rather than Markdown, and gets its own small spec once checklists are specced.
- **C. Capture**: voice to task, and photo to tasks.
- **D. Digests**: a morning plan by push, and a weekly review.
- **E. Overdue triage**: proposed new dates for overdue tasks, applied only once the user confirms.
- **F. Ask your tasks**: questions answered from the user's own tasks.
- **G. Payments**: Play Billing in the Android app and a checkout on the web. Until then, Pro is granted by hand
  ([decisions/pro-granted-by-admin-script](pro-granted-by-admin-script.md)).

## Consequences

- Every part calls the AI through the provider layer ([decisions/ai-provider-switchable](ai-provider-switchable.md))
  and the request documents ([decisions/ai-requests-via-firestore](ai-requests-via-firestore.md)), within the
  monthly limit ([decisions/ai-monthly-limit](ai-monthly-limit.md)).
- C takes in uploads, so its tasks are security-sensitive.
- Every part's spec and plan is written on the branch `feat/ai-foundation`, not a branch of its own; the developer
  decided this on 2026-11-03.

## History

- 2026-11-03: B included breaking a task into steps; now steps is its own part, B2, after the usability roadmap's
  checklists are specced, because no checklist field exists to fill. All parts' specs and plans now live on
  `feat/ai-foundation`. See [decisions/ai-assists-on-request](ai-assists-on-request.md).

## Sources

- `src/views/TaskAddView.vue`
- `functions/src/index.ts`
