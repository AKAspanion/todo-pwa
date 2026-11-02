<script lang="ts">
import type { InjectionKey } from 'vue';

/** Where an edit's save stands: in flight, in flight for 15 s or more, or rejected. */
export type TaskSaveStatus = 'saving' | 'slow' | 'failed';

/**
 * What the board that holds the cards tells each one: the state of its edit's save, whether a
 * status change or delete is in flight, and the current day. A card without a board (in a test,
 * or reused elsewhere) still renders, with nothing in flight.
 */
export interface TaskCardContext {
  saveStatus(taskId: string): TaskSaveStatus | undefined;
  clearSaveStatus(taskId: string): void;
  isPending(taskId: string): boolean;
  /** Today as 'YYYY-MM-DD', which the board recomputes when the day changes (D3). */
  today(): string;
}

export const TASK_CARD_CONTEXT: InjectionKey<TaskCardContext> = Symbol('TaskCardContext');
</script>

<script setup lang="ts">
/**
 * One task, with its check, edit and delete buttons always shown, so touch and keyboard reach
 * them without hover (D11). Editing happens in place; the form stays open until the board reports
 * the save succeeded (D7).
 */
import { computed, inject, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import MarkdownView from '@/components/MarkdownView.vue';
import { formatTime12, parseLocalDate, relativeDayLabel, type DateLocale } from '@/lib/dates';
import type { Label, Task, TaskInput } from '@/types/models';
import LabelChips from './LabelChips.vue';
import { resolveLabels, safeColor } from './labels';
import TaskEditForm from './TaskEditForm.vue';

const props = defineProps<{ task: Task; labels: Label[] }>();
const emit = defineEmits<{
  toggle: [task: Task];
  save: [task: Task, patch: Partial<TaskInput>];
  remove: [task: Task];
}>();

const { t, locale } = useI18n();
const context = inject(TASK_CARD_CONTEXT, null);

type Mode = 'view' | 'edit' | 'delete';
const mode = ref<Mode>('view');

const done = computed(() => props.task.status === 'done');
const pending = computed(() => context?.isPending(props.task.id) ?? false);
const saveStatus = computed(() => context?.saveStatus(props.task.id));
const saving = computed(() => saveStatus.value === 'saving' || saveStatus.value === 'slow');
const saveError = computed(() => (saveStatus.value === 'failed' ? t('tasks.errors.save') : null));
const dateLocale = computed<DateLocale>(() => (locale.value === 'hi' ? 'hi' : 'en'));

/** The first label that still exists colours the card, as it always has. */
const cardColor = computed(() =>
  safeColor(resolveLabels(props.task.labelIds, props.labels)[0]?.color),
);

const when = computed(() => {
  const { indefinite, date, time } = props.task;
  if (indefinite || !date) return t('tasks.noDue');
  const now = context ? parseLocalDate(context.today()).toDate() : new Date();
  const day = relativeDayLabel(date, dateLocale.value, now);
  const clock = time ? formatTime12(time, dateLocale.value) : '';
  return clock ? t('tasks.card.when', { day, time: clock }) : day;
});

// The board clears the save state once the save succeeds: only then does the form close. Sync, so
// a save that answers at once is still seen going from in flight to done.
watch(
  saveStatus,
  (now, before) => {
    if ((before === 'saving' || before === 'slow') && now === undefined) mode.value = 'view';
  },
  { flush: 'sync' },
);

function openEdit(): void {
  context?.clearSaveStatus(props.task.id);
  mode.value = 'edit';
}

function closeEdit(): void {
  context?.clearSaveStatus(props.task.id);
  mode.value = 'view';
}

function confirmRemove(): void {
  mode.value = 'view';
  emit('remove', props.task);
}
</script>

<template>
  <v-card
    data-testid="task-card"
    :data-task-id="task.id"
    class="task-card"
    :class="{ 'task-card--pending': pending, 'task-card--editing': mode !== 'view' }"
    :color="mode === 'edit' ? undefined : cardColor"
    :loading="pending"
    :aria-busy="pending || saving"
  >
    <template v-if="mode === 'edit'">
      <TaskEditForm
        :task="task"
        :labels="labels"
        :saving="saving"
        :error="saveError"
        @submit="(patch) => emit('save', task, patch)"
        @cancel="closeEdit"
      />
      <p
        v-if="saveStatus === 'slow'"
        class="text-body-small px-3 pb-3"
        role="status"
        data-testid="save-slow"
      >
        {{ t('tasks.errors.slowSave') }}
      </p>
    </template>

    <template v-else-if="mode === 'delete'">
      <v-card-text class="text-body-medium font-weight-bold">
        {{ t('tasks.card.confirmDelete') }}
      </v-card-text>
      <v-card-actions>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          :aria-label="t('tasks.card.keep')"
          @click="mode = 'view'"
        />
        <v-spacer />
        <v-btn
          icon="mdi-check"
          variant="text"
          size="small"
          :aria-label="t('tasks.card.confirm')"
          :disabled="pending"
          @click="confirmRemove"
        />
      </v-card-actions>
    </template>

    <template v-else>
      <v-card-item class="pb-0">
        <v-card-title
          data-testid="task-title"
          class="task-card__title text-title-medium"
          :class="{ 'text-decoration-line-through': done }"
          :title="task.title"
        >
          {{ task.title }}
        </v-card-title>
        <template #append>
          <v-btn
            icon
            variant="text"
            size="small"
            :aria-label="done ? t('tasks.card.uncheck') : t('tasks.card.check')"
            :disabled="pending"
            @click="emit('toggle', task)"
          >
            <v-icon :icon="done ? 'mdi-close' : 'mdi-check'" />
          </v-btn>
        </template>
      </v-card-item>
      <v-card-text v-if="task.description" class="pt-1 pb-2 text-body-medium">
        <MarkdownView
          :source="task.description"
          :class="{ 'text-decoration-line-through': done }"
        />
      </v-card-text>
      <LabelChips :label-ids="task.labelIds" :labels="labels" class="px-4 pb-2" />
      <v-divider />
      <v-card-actions class="task-card__actions">
        <v-icon icon="mdi-clock-outline" size="small" class="ml-2" />
        <span class="task-card__when text-body-small" data-testid="task-when">{{ when }}</span>
        <v-spacer />
        <v-btn
          v-if="!done"
          icon="mdi-pencil"
          variant="text"
          size="small"
          :aria-label="t('tasks.card.edit')"
          :disabled="pending"
          @click="openEdit"
        />
        <v-btn
          icon="mdi-delete"
          variant="text"
          size="small"
          :aria-label="t('tasks.card.delete')"
          :disabled="pending"
          @click="mode = 'delete'"
        />
      </v-card-actions>
    </template>
  </v-card>
</template>

<style scoped>
.task-card {
  cursor: grab;
}
.task-card--editing,
.task-card--pending {
  cursor: default;
}
.task-card__title {
  white-space: normal;
  overflow-wrap: anywhere;
  line-height: 1.3;
}
.task-card__when {
  display: inline-block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.task-card__when::first-letter {
  text-transform: uppercase;
}
</style>
