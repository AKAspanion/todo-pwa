<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Label } from '@/types/models';
import { resolveLabels, safeColor, textColorFor } from './labels';

const props = defineProps<{ labelIds: string[]; labels: Label[]; small?: boolean }>();

const { t } = useI18n();
const shown = computed(() => resolveLabels(props.labelIds, props.labels));
</script>

<!--
  As the old card drew them: a chip in the text colour of the card (dark grey or white) that shows
  the label's name in the label's own colour. The classes a parent passes (spacing) land on the
  wrapper, which sets no spacing of its own: Vuetify's utility classes sit in a CSS layer, so the
  list's own unlayered reset below would always beat them.
-->
<template>
  <div v-if="shown.length" class="label-chips">
    <ul class="label-chips__list" :aria-label="t('tasks.card.labels')">
      <li v-for="label in shown" :key="label.id">
        <v-chip
          data-testid="label-chip"
          class="label-chips__chip"
          label
          variant="flat"
          :size="small ? 'small' : 'default'"
          :color="textColorFor(safeColor(label.color))"
          :style="{ color: safeColor(label.color) ?? undefined }"
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
  gap: 0 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.label-chips__chip {
  margin-bottom: 4px;
  cursor: default;
}
</style>
