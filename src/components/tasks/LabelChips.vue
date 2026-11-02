<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Label } from '@/types/models';
import { resolveLabels, safeColor } from './labels';

const props = defineProps<{ labelIds: string[]; labels: Label[] }>();

const { t } = useI18n();
const shown = computed(() => resolveLabels(props.labelIds, props.labels));
</script>

<template>
  <ul v-if="shown.length" class="label-chips" :aria-label="t('tasks.card.labels')">
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
</template>

<style scoped>
.label-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
