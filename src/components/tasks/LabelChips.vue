<script lang="ts">
import type { Label } from '@/types/models';

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** A label's colour when it is a hex colour Vuetify can use; anything else (old or bad data) is none. */
export function safeColor(color: string | undefined): string | undefined {
  return color !== undefined && HEX_COLOR.test(color) ? color : undefined;
}

/**
 * The labels behind a task's label ids, in the task's order (D6): an id with no label, such as a
 * deleted one, is left out, and the ids themselves are never changed.
 */
export function resolveLabels(labelIds: readonly string[], labels: readonly Label[]): Label[] {
  const byId = new Map(labels.map((label) => [label.id, label]));
  return labelIds.flatMap((id) => {
    const label = byId.get(id);
    return label ? [label] : [];
  });
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

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
