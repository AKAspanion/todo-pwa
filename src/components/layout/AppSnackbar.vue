<script setup lang="ts">
/** The one snackbar, drawn as the old ContainerMain drew it: multi-line, at the bottom, with a text Close. */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUiStore } from '@/stores/ui';

const { t } = useI18n();
const ui = useUiStore();

/** Writable, so Vuetify closing the snack on timeout clears it in the store (D19). */
const open = computed({
  get: () => ui.snack !== null,
  set: (value: boolean) => {
    if (!value) ui.dismissSnack();
  },
});

function runAction(): void {
  const action = ui.snack?.action;
  ui.dismissSnack();
  action?.();
}
</script>

<template>
  <v-snackbar
    v-model="open"
    :timeout="ui.snack?.timeoutMs ?? -1"
    multi-line
    location="bottom"
    class="app-snackbar"
  >
    {{ ui.snack?.text }}
    <template #actions>
      <v-btn v-if="ui.snack?.actionLabel" variant="text" @click="runAction">
        {{ ui.snack.actionLabel }}
      </v-btn>
      <v-btn variant="text" @click="ui.dismissSnack()">{{ t('common.close') }}</v-btn>
    </template>
  </v-snackbar>
</template>

<style>
/* The old snackbar's dark grey, in both themes (Vuetify 2's #323232). */
.app-snackbar .v-snackbar__wrapper {
  background: #323232;
  color: #fff;
}
.app-snackbar .v-btn {
  color: #fff;
}
/* The old snackbar sat over the bottom navigation: it does not make room for it. */
.app-snackbar.v-snackbar {
  padding: 0 !important;
}
</style>
