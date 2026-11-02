<script setup lang="ts">
import { useI18n } from 'vue-i18n';

// Placeholder until its screen task rebuilds this view.
const { t } = useI18n();
</script>

<template>
  <v-container>
    <h1 class="text-h5 mb-2">{{ t('common.screens.calendar') }}</h1>
    <p>{{ t('common.comingSoon') }}</p>
  </v-container>
</template>
