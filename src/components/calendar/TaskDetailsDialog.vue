<script setup lang="ts">
/**
 * One task's details, opened from its calendar event (D16): title, when it is due in the user's
 * language (D4), its labels and its description as sanitised Markdown. Escape, a click outside
 * and Close all emit `close`; the parent clears the task.
 */
import { computed, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import MarkdownView from '@/components/MarkdownView.vue';
import LabelChips from '@/components/tasks/LabelChips.vue';
import { resolveLabels, safeColor, textColorFor } from '@/components/tasks/labels';
import { formatLongDate, formatTime12, type DateLocale } from '@/lib/dates';
import { useLabelsStore } from '@/stores/labels';
import type { Task } from '@/types/models';

const props = defineProps<{ task: Task | null }>();
const emit = defineEmits<{ close: [] }>();

const { t, locale } = useI18n();
const labelsStore = useLabelsStore();
const titleId = useId();

const dateLocale = computed<DateLocale>(() => (locale.value === 'hi' ? 'hi' : 'en'));

/** The task last opened, kept while the dialog animates closed so its content doesn't blank out. */
const shown = ref<Task | null>(props.task);
watch(
  () => props.task,
  (task) => {
    if (task) shown.value = task;
  },
);

/** The card's band takes the colour the task's event has on the calendar (first label, else the old blue). */
const band = computed(() => {
  const task = shown.value;
  if (task?.status === 'done') return '#9E9E9E';
  const first = task ? resolveLabels(task.labelIds, labelsStore.labels)[0] : undefined;
  return safeColor(first?.color) ?? '#4285F4';
});

const when = computed(() => {
  const task = shown.value;
  if (!task?.date) return '';
  const day = formatLongDate(task.date, dateLocale.value);
  const time = task.time ? formatTime12(task.time, dateLocale.value) : '';
  return time ? t('calendar.details.when', { day, time }) : day;
});

function onOpenChange(open: boolean): void {
  if (!open) emit('close');
}
</script>

<template>
  <v-dialog
    :model-value="task !== null"
    max-width="560"
    scrollable
    :aria-labelledby="titleId"
    data-testid="task-details"
    @update:model-value="onOpenChange"
  >
    <v-card v-if="shown" flat min-width="320" class="task-details">
      <v-toolbar
        flat
        class="task-details__band"
        :style="{ backgroundColor: band, color: textColorFor(band) }"
      >
        <v-toolbar-title :id="titleId" class="task-details__title" data-testid="task-details-title">
          {{ shown.title }}
        </v-toolbar-title>
        <template v-if="shown.status === 'done'" #append>
          <v-chip size="small" variant="outlined" label class="mr-2">
            {{ t('calendar.details.done') }}
          </v-chip>
        </template>
      </v-toolbar>
      <v-card-text class="pt-3">
        <div v-if="when" class="task-details__when mb-2" data-testid="task-details-when">
          {{ when }}
        </div>
        <LabelChips :label-ids="shown.labelIds" :labels="labelsStore.labels" class="mb-3" />
        <div class="text-body-medium" data-testid="task-details-description">
          <MarkdownView v-if="shown.description" :source="shown.description" />
          <p v-else class="text-medium-emphasis">{{ t('calendar.details.noDescription') }}</p>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-btn variant="text" color="secondary" @click="emit('close')">{{
          t('calendar.details.close')
        }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.task-details__title {
  white-space: normal;
  overflow-wrap: anywhere;
  line-height: 1.3;
}
.task-details__when {
  white-space: normal;
  font-size: 0.875rem;
  opacity: 0.7;
}
</style>
