---
type: Decision
title: The blue double tick is the logo everywhere
description: Every icon and the app's own screens use the blue double tick; the browser-tab favicon, an up arrow since 2019, becomes the tick, the sign-in and sign-up cards show it above their title, and the loading screen shows it.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-05T05:41:09Z
---

# The blue double tick is the logo everywhere

## Context

The blue double tick has been the app's icon since the 2019 "Icons changed" commit (`dbddf1c`), which replaced the
Vue CLI starter icons. That commit gave every PWA, Apple and Windows icon the tick, but left `public/favicon.ico`,
the browser-tab icon `index.html` links, as a blue up arrow. It also added src/assets/logo-white.svg, a white
arrow, that nothing used, and left the starter src/assets/logo.png (the Vue logo) behind. The app's own screens
showed no logo at all, in the old app as in the rewrite.

## Decision

The developer chose, on 2026-11-05, to use the tick everywhere:

- `public/favicon.ico` becomes the tick, so the browser tab matches the installed icon.
- src/assets/logo.png and src/assets/logo-white.svg are deleted rather than redrawn: nothing uses them.
- Inside the app the tick is drawn as an inline SVG component, `src/components/layout/AppLogo.vue`, so it stays
  sharp at any size. It keeps the icons' own blue, `#2196F3`, in light and dark: that is the dark theme's primary,
  and it reads on both backgrounds, while the light primary (`#1976D2`) would make it a different blue from the
  installed icon. It is shown inside the sign-in and sign-up cards, at the top, above the "Task Manager" title,
  and on the loading screen in `index.html` in place of the plain spinner.
- It is not shown in the menu or the app bar.

This is an exception to [Restore the original design](restore-original-design.md): the old app showed no logo on
any screen, and these three screens now do.

## Consequences

- The native icons (Android launcher, splash, notification and store icons; the iOS wrapper's icon set) and the
  web push icon already show the tick and are left as they are.
- A later redraw of the logo starts from `public/img/icons/android-chrome-512x512.png` and the SVG in
  `src/components/layout/AppLogo.vue`, which must stay the same shape.

## History

- 2026-11-05: the logo sat above the sign-in and sign-up cards; now it sits inside each card above the title,
  because the developer saw it in the browser and asked for it inside the card.

## Sources

- `public/favicon.ico`
- `public/img/icons/android-chrome-512x512.png`
- `index.html`
- `src/components/layout/AppLogo.vue`
- `src/views/SignInView.vue`
- `src/views/SignUpView.vue`
