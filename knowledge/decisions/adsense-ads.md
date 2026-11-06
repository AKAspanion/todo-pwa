---
type: Decision
title: The app shows Google AdSense ads, and the privacy policy says so
description: Task Manager will show ads through Google AdSense; the privacy policy no longer promises no ads and explains Google's cookies, consent in the EEA, the UK and Switzerland, and the opt-out.
status: draft
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-11-06T07:05:58Z
---

# The app shows Google AdSense ads, and the privacy policy says so

## Context

The privacy policy at `/privacy` promised "No ads." The developer said on 2026-11-06: "App will show ads vi Adsense,
so lets update the privacy policy".

## Decision

- The app shows ads from Google AdSense. The policy has an **Ads** section (`src/views/PrivacyView.vue`) saying so:
  Google and its partners use cookies and device identifiers to show, measure and personalise ads; tasks, labels and
  account details are never given to them; people in the EEA, the UK or Switzerland are asked for consent first; and
  where to turn off personalised ads and read how Google uses the data.
- "What we don't do" now says no analytics of our own and no selling of data, instead of no ads and no tracking.
- The effective date moved to the day of the change (`PRIVACY_EFFECTIVE`).

## Consequences

- The policy's consent sentence holds only once a Google-certified consent message, such as AdSense's own Privacy &
  messaging, is published for those regions.
- The Play listing has to declare that the app contains ads, and its Data safety form what Google's ad code collects.
- Where the ads show, and the code that loads them, is a later decision.

## Assumed

The consent and opt-out wording follows the flash-cards app's policy, which uses AdSense's own consent message; this
app's AdSense set-up hasn't been described.

## Sources

- `src/views/PrivacyView.vue`
