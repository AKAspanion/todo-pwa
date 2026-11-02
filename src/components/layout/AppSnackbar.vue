<script setup lang="ts">
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
  <v-snackbar v-model="open" :timeout="ui.snack?.timeoutMs ?? -1" location="bottom">
    {{ ui.snack?.text }}
    <template #actions>
      <v-btn v-if="ui.snack?.actionLabel" color="primary" variant="text" @click="runAction">
        {{ ui.snack.actionLabel }}
      </v-btn>
      <v-btn
        icon="mdi-close"
        variant="text"
        size="small"
        :aria-label="t('common.close')"
        @click="ui.dismissSnack()"
      />
    </template>
  </v-snackbar>
</template>
