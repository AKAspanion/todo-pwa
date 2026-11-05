<!-- The frame of the public legal pages (W1): a back button, the page's heading and its text, in English. -->
<script setup lang="ts">
import { useRouter } from 'vue-router';

defineProps<{ title: string }>();

const router = useRouter();

/** W1: back to the previous page, or `/home` when the page was opened first (a link from Play). */
function goBack(): void {
  const state: unknown = window.history.state;
  const hasPrevious =
    typeof state === 'object' && state !== null && Boolean((state as { back?: unknown }).back);
  if (hasPrevious) router.back();
  else void router.push('/home');
}
</script>

<template>
  <v-container class="legal-page py-4" lang="en">
    <!-- W1: English whatever the app's language, so the root says so for screen readers. -->
    <v-btn icon="mdi-arrow-left" variant="text" aria-label="Back" @click="goBack" />
    <h1 class="text-h5 mt-2 mb-4">{{ title }}</h1>
    <div class="legal-page__text text-body-2">
      <slot />
    </div>
  </v-container>
</template>

<style scoped>
.legal-page {
  max-width: 560px;
}

.legal-page__text :deep(h2) {
  margin: 24px 0 8px;
}

.legal-page__text :deep(p),
.legal-page__text :deep(ul),
.legal-page__text :deep(ol) {
  margin-bottom: 8px;
}

.legal-page__text :deep(ul),
.legal-page__text :deep(ol) {
  padding-left: 24px;
}
</style>
