---
type: Decision
title: Restore the original design
description: The Vue 3 / Vuetify 4 app is restyled to look like the old Vue 2 / Vuetify 2 app on every screen; behaviour stays the rewrite's.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-04T08:45:54Z
---

# Restore the original design

## Context

The modernize spec allowed "no redesign beyond what Vuetify 4's defaults change" (§10), and
[design-system/tokens](../design-system/tokens.md) records the app on Vuetify's defaults. Vuetify 4's defaults are
Material Design 3, so the first successful deploy of the rewrite, on 2026-11-04, changed the icons, typography,
cards and layout of todo.spanion.in. The developer rolled hosting back to the old build the same day, because the
look had changed.

## Decision

The new app is restyled to look like the old app, the code at `b8af93e^`, on every screen, in light and dark, at
phone and desktop widths:

- Vuetify is created with the `md2` blueprint, with the old app's colours and icons;
- each old component's markup structure and CSS is ported into its new counterpart;
- each screen is compared with captures of the old app, built locally against the emulators, in the visual harness;
- what the rewrite added, and features built later, borrow the closest old pattern.

Behaviour, data, rules and routes stay the rewrite's. Copy stays the rewrite's too, except on a screen where the
developer chose the old app's wording: the home screen uses the old app's text and date formats ("0 tasks today",
"TODO", "Today at 9:30 AM", "Indefinite task?", its empty-state and load-error text), chosen on 2026-11-04 at the
home checkpoint, and the add, sign-in, sign-up, profile, calendar and notifications screens use the old app's
wording too, chosen the same day with the second plan. The look-only part of modernize spec §10 no longer holds; the rest of it does.

## Consequences

- [design-system/tokens](../design-system/tokens.md) and [design-system/components](../design-system/components.md)
  change as each part is restyled.
- The visual harness's references under `design/modernize/<screen>/refs/` become captures of the old app, except
  `design/modernize/auth/refs/`, which are captures of the new app since the logo was added to the sign-in and
  sign-up cards ([The blue double tick is the logo everywhere](app-logo.md)).
- The Deploy workflow stays off until the restyle is done and the developer turns it back on.
- The specs written on 2026-11-03 for features not built yet are drawn in the old style when built (the spec's §6).

## History

- 2026-11-05: every screen's references were captures of the old app; now the sign-in and sign-up ones are the
  new app's, because the developer added the logo to those cards and tightened sign-up's fields.
  See [app-logo](app-logo.md).
- 2026-11-04: the old wording was the home screen's only; now every screen uses it, because the developer
  approved the second plan with it.
- 2026-11-04: copy stayed the rewrite's on every screen; now the home screen uses the old app's wording and
  date formats, because the developer chose them at the home checkpoint.

## Sources

- `docs/specs/2026-11-04-restore-original-design.md`
- `docs/specs/2026-11-02-modernize-and-fix.md`
