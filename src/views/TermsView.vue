<!-- The terms of service, public and in English only (decisions/legal-pages-english-only). -->
<script setup lang="ts">
import LegalPage from '@/components/layout/LegalPage.vue';

/** A change to these terms updates this date. */
const TERMS_EFFECTIVE = '18 November 2026';
const CONTACT_EMAIL = 'panditankit1995@gmail.com';
</script>

<template>
  <LegalPage title="Terms of service">
    <p class="text-medium-emphasis">Effective {{ TERMS_EFFECTIVE }}</p>

    <h2 class="text-subtitle-1 font-weight-medium">Agreeing to these terms</h2>
    <p>
      By using Task Manager or creating an account, you accept these terms and our
      <router-link to="/privacy">Privacy policy</router-link>. If you do not accept them, please do
      not use the app.
    </p>

    <h2 class="text-subtitle-1 font-weight-medium">Who</h2>
    <p>
      Task Manager is made by Ankit Kumar Pandit, an individual developer. Contact:
      <a :href="`mailto:${CONTACT_EMAIL}`">{{ CONTACT_EMAIL }}</a>.
    </p>

    <h2 class="text-subtitle-1 font-weight-medium">The service</h2>
    <p>
      Task Manager is a free personal task manager with labels, a calendar and push reminders. Its
      features may change or stop at any time. It is provided as it is, without any promise that it
      is always available or free of errors.
    </p>

    <h2 class="text-subtitle-1 font-weight-medium">Your account</h2>
    <ul>
      <li>You must be 18 or older to have an account.</li>
      <li>Keep your password safe.</li>
      <li>You are responsible for everything that happens in your account.</li>
    </ul>

    <h2 class="text-subtitle-1 font-weight-medium">Your content</h2>
    <p>
      Your tasks and labels stay yours. You let us store and process them only to run the app for
      you.
    </p>

    <h2 class="text-subtitle-1 font-weight-medium">Acceptable use</h2>
    <ul>
      <li>Do not break the law with the app.</li>
      <li>Do not access other people's accounts or data.</li>
      <li>Do not try to break, overload or get around the app's security.</li>
      <li>Do not use automated tools to scrape the app.</li>
    </ul>

    <h2 class="text-subtitle-1 font-weight-medium">Ads</h2>
    <p>
      Task Manager may show ads from Google AdSense. How ad data is handled is described in the
      <router-link to="/privacy">Privacy policy</router-link>.
    </p>

    <h2 class="text-subtitle-1 font-weight-medium">Reminders</h2>
    <p>
      Reminders are sent on a best-effort basis and may arrive late or not at all. Do not rely on
      them alone for anything critical.
    </p>

    <h2 class="text-subtitle-1 font-weight-medium">Ending</h2>
    <p>
      You can
      <router-link to="/delete-account">delete your account</router-link> at any time. An account
      that breaks these terms may be suspended or deleted.
    </p>

    <h2 class="text-subtitle-1 font-weight-medium">Liability</h2>
    <p>
      To the extent the law allows, the developer is not liable for lost data, missed reminders or
      indirect losses from using the app.
    </p>

    <h2 class="text-subtitle-1 font-weight-medium">Governing law</h2>
    <p>These terms are governed by the laws of India.</p>

    <h2 class="text-subtitle-1 font-weight-medium">Changes</h2>
    <p>
      When these terms change, the date at the top is updated. Using the app after a change means
      you accept it.
    </p>
  </LegalPage>
</template>
