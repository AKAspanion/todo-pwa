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
import { useDisplay, useTheme } from 'vuetify';
import { useI18n } from 'vue-i18n';
import MarkdownView from '@/components/MarkdownView.vue';
import { calendarLabel, parseLocalDate, type DateLocale } from '@/lib/dates';
import type { Label, Task, TaskInput } from '@/types/models';
import LabelChips from './LabelChips.vue';
import { resolveLabels, safeColor, textColorFor } from './labels';
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

const { xs } = useDisplay();
const theme = useTheme();
const hovered = ref(false);

/**
 * The first label that still exists colours the card, as it always has; a card with none is white,
 * or the old dark theme's `#303030`.
 */
const cardColor = computed(
  () =>
    safeColor(resolveLabels(props.task.labelIds, props.labels)[0]?.color) ??
    (theme.current.value.dark ? '#303030' : '#ffffff'),
);
/** Black on a light card, white on a dark one, as the old card's `black--text` and `white--text`. */
const ink = computed(() => (textColorFor(cardColor.value) === '#ffffff' ? '#ffffff' : '#000000'));

const when = computed(() => {
  const { indefinite, date, time } = props.task;
  if (indefinite || !date) return t('tasks.noDue');
  const now = context ? parseLocalDate(context.today()).toDate() : new Date();
  return calendarLabel(date, time, dateLocale.value, now, (day, clock) =>
    t('tasks.card.when', { day, time: clock }),
  );
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
  <div class="task-card-wrap" :class="xs ? '' : 'task-card-wrap--roomy'">
    <v-card
      data-testid="task-card"
      :data-task-id="task.id"
      class="task-card text-left"
      :class="{ 'task-card--pending': pending, 'task-card--editing': mode !== 'view' }"
      :color="cardColor"
      :style="{ color: ink }"
      :elevation="hovered && !xs ? 12 : 3"
      :loading="pending"
      :aria-busy="pending || saving"
      @mouseenter="hovered = true"
      @mouseleave="hovered = false"
    >
      <template v-if="mode === 'edit'">
        <TaskEditForm
          :task="task"
          :labels="labels"
          :saving="saving"
          :error="saveError"
          :ink="ink"
          :xs="xs"
          @submit="(patch) => emit('save', task, patch)"
          @cancel="closeEdit"
        />
        <p
          v-if="saveStatus === 'slow'"
          class="task-card__slow px-3 pb-3"
          role="status"
          data-testid="save-slow"
        >
          {{ t('tasks.errors.slowSave') }}
        </p>
      </template>

      <template v-else>
        <div class="task-card__body" :class="xs ? 'task-card__body--xs' : ''">
          <div class="task-card__head" :class="xs ? 'task-card__head--xs' : ''">
            <div class="task-card__main">
              <div v-if="mode === 'delete'" class="task-card__delete" :class="xs ? 'pb-1' : 'pb-3'">
                {{ t('tasks.card.confirmDelete') }}
              </div>
              <div
                v-else
                class="task-card__title overflow-text"
                :class="xs ? 'task-card__title--xs' : ''"
              >
                <span
                  data-testid="task-title"
                  :class="{ 'line-through-text': done }"
                  :title="task.title"
                >
                  {{ task.title }}
                </span>
              </div>
            </div>
            <v-btn
              v-if="mode === 'view'"
              icon
              variant="text"
              :size="xs ? 28 : 36"
              :color="ink"
              class="task-card__check"
              :aria-label="done ? t('tasks.card.uncheck') : t('tasks.card.check')"
              :disabled="pending"
              @click="emit('toggle', task)"
            >
              <v-icon :icon="done ? 'mdi-close' : 'mdi-check'" :size="xs ? 16 : 24" />
            </v-btn>
          </div>
          <div
            v-if="mode === 'view' && task.description"
            class="task-card__desc"
            :class="[xs ? 'task-card__desc--xs' : '', done ? 'line-through-text' : '']"
          >
            <MarkdownView :source="task.description" />
          </div>
        </div>

        <div
          v-if="mode === 'view' && resolveLabels(task.labelIds, labels).length"
          class="task-card__labels"
          :class="xs ? 'task-card__labels--xs' : ''"
        >
          <LabelChips :label-ids="task.labelIds" :labels="labels" :small="xs" />
        </div>
        <v-divider />
        <div class="task-card__actions" :class="xs ? 'task-card__actions--xs' : ''">
          <template v-if="mode === 'view'">
            <v-icon icon="mdi-clock" :size="xs ? 16 : 24" :color="ink" />
            <span
              class="task-card__when overflow-text"
              :class="xs ? 'task-card__when--xs' : ''"
              data-testid="task-when"
              :title="when"
            >
              {{ when }}
            </span>
            <v-spacer />
            <v-btn
              v-if="!done"
              icon
              variant="text"
              :size="xs ? 28 : 36"
              :color="ink"
              :aria-label="t('tasks.card.edit')"
              :disabled="pending"
              @click="openEdit"
            >
              <v-icon icon="mdi-pencil" :size="xs ? 16 : 24" />
            </v-btn>
            <v-btn
              icon
              variant="text"
              :size="xs ? 28 : 36"
              :color="ink"
              :aria-label="t('tasks.card.delete')"
              :disabled="pending"
              @click="mode = 'delete'"
            >
              <v-icon icon="mdi-delete" :size="xs ? 16 : 24" />
            </v-btn>
          </template>
          <template v-else>
            <v-btn
              icon
              variant="text"
              :size="xs ? 28 : 36"
              :color="ink"
              :aria-label="t('tasks.card.keep')"
              @click="mode = 'view'"
            >
              <v-icon icon="mdi-close" />
            </v-btn>
            <v-spacer />
            <v-btn
              icon
              variant="text"
              :size="xs ? 28 : 36"
              :color="ink"
              :aria-label="t('tasks.card.confirm')"
              :disabled="pending"
              @click="confirmRemove"
            >
              <v-icon icon="mdi-check" />
            </v-btn>
          </template>
        </div>
      </template>
    </v-card>
  </div>
</template>

<!--
  The old TaskCard's markup and CSS (Vuetify 2): a card in its first label's colour, a 16 px title
  (14 px on a phone), a divider, and an actions row of 52 px (36 px on a phone).
-->
<style scoped>
.task-card-wrap {
  padding: 8px 0;
}
.task-card-wrap--roomy .task-card {
  margin-bottom: 8px;
}
.task-card {
  cursor: grab;
  border-radius: 4px;
  font-size: 0.875rem;
  line-height: 1.375rem;
  letter-spacing: 0.0071428571em;
  transition: box-shadow 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}
.task-card--editing,
.task-card--pending {
  cursor: default;
}
.task-card__body {
  padding: 16px 16px 0;
}
.task-card__body--xs {
  padding: 12px 12px 0;
}
.task-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0;
}
.task-card__head--xs {
  margin: -4px 0 4px;
}
.task-card__main {
  flex: 1 1 auto;
  min-width: 0;
}
.task-card__check {
  flex: none;
  margin: -2px -4px 0 0;
}
.task-card__title {
  min-height: 28px;
  padding-bottom: 4px;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.5rem;
  letter-spacing: 0.03125em;
}
.task-card__title--xs {
  min-height: 24px;
  padding-bottom: 0;
  font-size: 0.875rem;
  line-height: 1.375rem;
  letter-spacing: 0.0071428571em;
}
.task-card__delete {
  padding: 0 4px;
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1.375rem;
}
.task-card__desc {
  padding-top: 4px;
  overflow: hidden;
  white-space: pre-wrap;
  font-size: 0.875rem;
  line-height: 1.2em;
}
.task-card__desc--xs {
  padding-top: 0;
  font-size: 0.75rem;
  letter-spacing: 0.0333333333em;
}
.task-card__desc :deep(.markdown-view p) {
  margin: 0;
}
.task-card__desc :deep(br) {
  display: none;
}
.task-card__labels {
  padding: 12px 16px;
}
.task-card__labels--xs {
  padding: 12px;
}
.task-card__actions {
  display: flex;
  align-items: center;
  min-height: 52px;
  padding: 8px 16px;
}
.task-card__actions--xs {
  min-height: 36px;
  padding: 0 12px;
}
.task-card__when {
  padding: 3px 0 0 8px;
  font-size: 0.875rem;
  line-height: 1.375rem;
}
.task-card__when--xs {
  padding-left: 4px;
  font-size: 0.75rem;
  letter-spacing: 0.0333333333em;
}
.task-card__when::first-letter {
  text-transform: uppercase;
}
.task-card__slow {
  margin: 0;
  font-size: 0.75rem;
}
</style>
