<script setup lang="ts">
/**
 * The bottom navigation, as the old BarNav drew it: five tabs, the profile one showing the user's
 * photo (24 px) when the account has one, else a face (restore-original-design §4.1).
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { httpsPhotoUrl } from '@/lib/photo';
import type { NavTab } from '@/router';
import { useSessionStore } from '@/stores/session';

const { t } = useI18n();
const route = useRoute();
const session = useSessionStore();

const tabs: { key: NavTab; to: string; icon: string }[] = [
  { key: 'home', to: '/home', icon: 'mdi-view-grid' },
  { key: 'calendar', to: '/calendar', icon: 'mdi-calendar' },
  { key: 'add', to: '/add', icon: 'mdi-plus' },
  { key: 'notification', to: '/notification', icon: 'mdi-bell' },
  { key: 'profile', to: '/profile', icon: 'mdi-face-man' },
];

/** The active tab comes from the route itself, so every route that shows the bar marks one (D17). */
const active = computed(() => route.meta.nav);
const photo = computed(() => httpsPhotoUrl(session.user?.photoURL));
</script>

<template>
  <v-bottom-navigation
    v-if="active"
    :model-value="active"
    :aria-label="t('common.nav.label')"
    color="primary"
    height="56"
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
      <v-avatar v-if="tab.key === 'profile' && photo" size="24">
        <v-img :src="photo" alt="" />
      </v-avatar>
      <v-icon v-else :icon="tab.icon" />
    </v-btn>
  </v-bottom-navigation>
</template>

<style scoped>
/* The old bar marked the active tab by colour alone. */
:deep(.v-btn--active .v-btn__overlay) {
  opacity: 0;
}
</style>
