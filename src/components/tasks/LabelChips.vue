<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Label } from '@/types/models';
import { resolveLabels, safeColor } from './labels';

const props = defineProps<{ labelIds: string[]; labels: Label[] }>();

const { t } = useI18n();
const shown = computed(() => resolveLabels(props.labelIds, props.labels));
</script>

<!--
  The classes a parent passes (spacing such as px-4) land on the wrapper, which sets no spacing of
  its own: Vuetify's utility classes sit in a CSS layer, so the list's own unlayered reset below
  would always beat them.
-->
<template>
  <div v-if="shown.length" class="label-chips">
    <ul class="label-chips__list" :aria-label="t('tasks.card.labels')">
      <li v-for="label in shown" :key="label.id">
        <v-chip
          data-testid="label-chip"
          size="small"
          label
          variant="flat"
          border
          :color="safeColor(label.color)"
          :title="label.label"
        >
          {{ label.label }}
        </v-chip>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.label-chips__list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
