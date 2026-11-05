<!-- W3: the privacy policy, public and in English only (decisions/legal-pages-english-only). -->
<script setup lang="ts">
import LegalPage from '@/components/layout/LegalPage.vue';

/** W3: a change to this policy updates this date. */
const PRIVACY_EFFECTIVE = '4 November 2026';
const CONTACT_EMAIL = 'panditankit1995@gmail.com';
</script>

<template>
  <LegalPage title="Privacy policy">
    <p class="text-medium-emphasis">Effective {{ PRIVACY_EFFECTIVE }}</p>

    <h2 class="text-subtitle-1 font-weight-medium">Who</h2>
    <p>
      Task Manager is made by Ankit Kumar Pandit, an individual developer. Contact:
      <a :href="`mailto:${CONTACT_EMAIL}`">{{ CONTACT_EMAIL }}</a
      >.
    </p>

    <h2 class="text-subtitle-1 font-weight-medium">What we collect and why</h2>
    <ul>
      <li>
        Your account: your email address, display name, profile photo address (from Google, when you
        sign in with Google), the sign-in method, and an account ID. We use these to sign you in and
        show your profile.
      </li>
      <li>
        Your content: your tasks (title, description, date, time, time zone, status and labels),
        your labels, and the reminders sent to you. We use these to run the app.
      </li>
      <li>
        Your push devices: for each browser or phone where you turn reminders on, a push token and
        the browser's user-agent text. We use these to send your reminders there.
      </li>
      <li>
        On your device only: your language and theme preferences. These are never sent anywhere.
      </li>
    </ul>

    <h2 class="text-subtitle-1 font-weight-medium">Who processes it</h2>
    <p>
      Google, through Firebase (Firebase Authentication, Cloud Firestore, Hosting, Cloud Functions
      and Cloud Messaging), on Google's servers. Nobody else.
    </p>

    <h2 class="text-subtitle-1 font-weight-medium">What we don't do</h2>
    <ul>
      <li>No ads.</li>
      <li>No analytics or tracking.</li>
      <li>No selling or sharing of your data.</li>
      <li>No access to your contacts, location, camera or files.</li>
    </ul>

    <h2 class="text-subtitle-1 font-weight-medium">Security</h2>
    <p>
      Your data is sent over HTTPS only. Each account's data can be read and changed only by that
      account.
    </p>

    <h2 class="text-subtitle-1 font-weight-medium">Keeping and deleting your data</h2>
    <p>
      Your data is kept until you delete your account. Deleting it erases the account at once and
      its data within minutes. Google Cloud's server logs, which may hold your account ID, are kept
      for up to 30 days.
    </p>
    <p>
      How to delete your account:
      <router-link to="/delete-account">Delete your Task Manager account</router-link>.
    </p>

    <h2 class="text-subtitle-1 font-weight-medium">Children</h2>
    <p>
      Task Manager is not directed at children under 13. An account found to belong to a child under
      13 is deleted.
    </p>

    <h2 class="text-subtitle-1 font-weight-medium">Changes</h2>
    <p>A change to this policy updates the date at the top.</p>
  </LegalPage>
</template>
