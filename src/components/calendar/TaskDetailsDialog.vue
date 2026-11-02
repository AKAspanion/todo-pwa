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
    <v-card v-if="shown">
      <v-card-item>
        <v-card-title :id="titleId" class="task-details__title" data-testid="task-details-title">
          {{ shown.title }}
        </v-card-title>
        <v-card-subtitle v-if="when" class="task-details__when" data-testid="task-details-when">
          {{ when }}
        </v-card-subtitle>
        <template v-if="shown.status === 'done'" #append>
          <v-chip size="small" color="success" variant="tonal" label>
            {{ t('calendar.details.done') }}
          </v-chip>
        </template>
      </v-card-item>
      <v-card-text class="pt-2">
        <LabelChips :label-ids="shown.labelIds" :labels="labelsStore.labels" class="mb-3" />
        <div class="text-body-medium" data-testid="task-details-description">
          <MarkdownView v-if="shown.description" :source="shown.description" />
          <p v-else class="text-medium-emphasis">{{ t('calendar.details.noDescription') }}</p>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="emit('close')">{{ t('calendar.details.close') }}</v-btn>
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
}
</style>
