<!-- W4: how to delete a Task Manager account, public and in English only (decisions/legal-pages-english-only). -->
<script setup lang="ts">
import LegalPage from '@/components/layout/LegalPage.vue';

const CONTACT_EMAIL = 'panditankit1995@gmail.com';
const EMAIL_SUBJECT = 'Delete my Task Manager account';
/** W4: the email way, with its subject already filled in. */
const DELETE_MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(EMAIL_SUBJECT)}`;
</script>

<template>
  <LegalPage title="Delete your Task Manager account">
    <p>This is how to delete your account in Task Manager by Ankit Kumar Pandit.</p>

    <h2 class="text-subtitle-1 font-weight-medium">In the app or on the web</h2>
    <ol>
      <li>Sign in.</li>
      <li>Open Profile.</li>
      <li>Choose Delete account.</li>
      <li>Confirm it's you.</li>
      <li>Type <code>DELETE</code>.</li>
    </ol>
    <!-- W4: through sign-in when signed out; the router's guard does that. -->
    <v-btn to="/profile" color="primary" variant="flat" class="mt-2">Go to Profile</v-btn>

    <h2 class="text-subtitle-1 font-weight-medium">By email, when you can't sign in</h2>
    <p>
      Write to <a :href="DELETE_MAILTO">{{ CONTACT_EMAIL }}</a> from your account's email address,
      with the subject "{{ EMAIL_SUBJECT }}". Your account and its data are deleted within 30 days,
      and the reply confirms it.
    </p>

    <h2 class="text-subtitle-1 font-weight-medium">What is deleted</h2>
    <p>Your account, and every task, label, reminder and push device of it.</p>

    <h2 class="text-subtitle-1 font-weight-medium">What is kept</h2>
    <p>Nothing, except Google Cloud's server logs holding your account ID, for up to 30 days.</p>
  </LegalPage>
</template>
