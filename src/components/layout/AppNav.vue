<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import type { NavTab } from '@/router';

const { t } = useI18n();
const route = useRoute();

const tabs: { key: NavTab; to: string; icon: string }[] = [
  { key: 'home', to: '/home', icon: 'mdi-view-grid' },
  { key: 'calendar', to: '/calendar', icon: 'mdi-calendar' },
  { key: 'add', to: '/add', icon: 'mdi-plus' },
  { key: 'notification', to: '/notification', icon: 'mdi-bell' },
  { key: 'profile', to: '/profile', icon: 'mdi-account-circle' },
];

/** The active tab comes from the route itself, so every route that shows the bar marks one (D17). */
const active = computed(() => route.meta.nav);
</script>

<template>
  <v-bottom-navigation
    v-if="active"
    :model-value="active"
    :aria-label="t('common.nav.label')"
    color="primary"
    grow
    tag="nav"
  >
    <v-btn
      v-for="tab in tabs"
      :key="tab.key"
      :value="tab.key"
      :to="tab.to"
      :aria-label="t(`common.nav.${tab.key}`)"
      :data-nav="tab.key"
    >
      <v-icon :icon="tab.icon" />
    </v-btn>
  </v-bottom-navigation>
</template>
