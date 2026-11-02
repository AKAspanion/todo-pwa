<script setup lang="ts">
import { onMounted } from 'vue';
import AppMenu from '@/components/layout/AppMenu.vue';
import AppNav from '@/components/layout/AppNav.vue';
import AppSnackbar from '@/components/layout/AppSnackbar.vue';
import { setupPwa } from '@/pwa';

onMounted(() => {
  setupPwa();
});
</script>

<template>
  <v-app>
    <AppMenu />
    <v-main>
      <router-view />
    </v-main>
    <AppNav />
    <AppSnackbar />
  </v-app>
</template>
