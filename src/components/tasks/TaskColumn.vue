<script setup lang="ts">
/**
 * One list of the board, Todo or Done. A task dropped here from the other list asks for a status
 * change; the list itself never takes the drop: the card comes back to where it was, and moves
 * when the store has saved the change. Sorting within a list is off, so the order stays by date
 * then time (D9), and an empty list still accepts a drop.
 */
import { VueDraggable, type DraggableEvent } from 'vue-draggable-plus';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDisplay, useTheme } from 'vuetify';
import type { Label, Task, TaskInput, TaskStatus } from '@/types/models';
import TaskCard from './TaskCard.vue';

/** The board shows 4 skeletons in all, 2 per list (D10). */
const SKELETONS_PER_COLUMN = 2;
/** Clicks and taps on these never start a drag. */
const NO_DRAG =
  'button, a, input, textarea, select, label, .v-field, .task-card--pending, .task-card--editing';

const props = defineProps<{
  status: TaskStatus;
  tasks: Task[];
  labels: Label[];
  /** Show skeletons instead of the list. */
  skeleton: boolean;
}>();
const emit = defineEmits<{
  toggle: [task: Task];
  save: [task: Task, patch: Partial<TaskInput>];
  remove: [task: Task];
  move: [task: Task, status: TaskStatus];
}>();

const { t } = useI18n();
const { xs } = useDisplay();
const theme = useTheme();
const dark = computed(() => theme.current.value.dark);
/** The old shimmer's two looks, by theme (`style.css`). */
const shimmerClass = computed(() => (dark.value ? 'dark--animate' : 'light--animate'));
const headingId = computed(() => `task-column-${props.status}`);

function onAdd(event: DraggableEvent<Task>): void {
  const task = event.data;
  if (task && task.status !== props.status) emit('move', task, props.status);
}
</script>

<template>
  <section class="task-column text-left" :aria-labelledby="headingId" :data-column="status">
    <h2
      :id="headingId"
      class="task-column__title text-overline text-left my-0"
      :class="xs ? 'px-1' : 'px-3'"
    >
      {{ t(`tasks.columns.${status}`) }}
    </h2>

    <div
      v-if="skeleton"
      class="task-column__list"
      :class="xs ? 'pa-1 pb-4' : 'pa-3 pb-6'"
      aria-busy="true"
      :aria-label="t('tasks.loadingTasks')"
    >
      <div
        v-for="index in SKELETONS_PER_COLUMN"
        :key="index"
        class="task-column__shimmer-wrap"
        data-testid="task-skeleton"
      >
        <v-card :color="dark ? '#303030' : '#ffffff'" :elevation="3" class="text-left">
          <div class="task-column__shimmer-top">
            <div class="task-column__shimmer-lines">
              <div class="shimmer title-shimmer" :class="shimmerClass" />
              <div class="shimmer subtitle-shimmer" :class="shimmerClass" />
            </div>
            <div class="shimmer icon-shimmer" :class="shimmerClass" />
          </div>
          <div class="task-column__shimmer-chip">
            <div class="shimmer chip-shimmer" :class="shimmerClass" />
          </div>
          <v-divider />
          <div class="task-column__shimmer-actions">
            <div class="shimmer title-shimmer" :class="shimmerClass" style="width: 50%" />
            <v-spacer />
            <div class="shimmer icon-shimmer" :class="shimmerClass" />
            <div v-if="!xs" class="shimmer icon-shimmer ml-1" :class="shimmerClass" />
          </div>
        </v-card>
      </div>
    </div>

    <VueDraggable
      v-else
      :model-value="tasks"
      class="task-column__list"
      :class="xs ? 'pa-1 pb-4' : 'pa-3 pb-6'"
      :data-testid="`task-list-${status}`"
      group="tasks"
      :sort="false"
      draggable=".task-column__item"
      :filter="NO_DRAG"
      :prevent-on-filter="false"
      :force-fallback="true"
      :fallback-on-body="true"
      :fallback-tolerance="4"
      :delay="150"
      :delay-on-touch-only="true"
      ghost-class="task-column__ghost"
      @add="onAdd"
    >
      <div v-for="task in tasks" :key="task.id" class="task-column__item">
        <TaskCard
          :task="task"
          :labels="labels"
          @toggle="(item) => emit('toggle', item)"
          @save="(item, patch) => emit('save', item, patch)"
          @remove="(item) => emit('remove', item)"
        />
      </div>
      <v-card
        v-if="tasks.length === 0"
        variant="outlined"
        class="task-column__empty text-left pa-4 my-2"
        :data-testid="`task-empty-${status}`"
      >
        <div class="text-subtitle-2">{{ t(`tasks.empty.${status}.title`) }}</div>
        <div class="text-caption">{{ t(`tasks.empty.${status}.caption`) }}</div>
        <v-btn
          v-if="status === 'todo'"
          to="/add"
          color="primary"
          variant="flat"
          size="small"
          class="mt-2 font-weight-bold"
        >
          {{ t('tasks.empty.create') }}
        </v-btn>
      </v-card>
    </VueDraggable>
  </section>
</template>

<style scoped>
.task-column__list {
  display: flex;
  flex-direction: column;
  /* An empty list is still a drop target (D9). */
  min-height: 120px;
}
.task-column__shimmer-wrap {
  padding: 8px 0;
}
.task-column__shimmer-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px 16px 12px;
}
.task-column__shimmer-lines {
  width: calc(100% - 36px);
}
.task-column__shimmer-chip {
  padding: 4px 16px 8px;
}
.task-column__shimmer-actions {
  display: flex;
  align-items: center;
  min-height: 52px;
  padding: 0 20px;
}
.task-column__empty {
  border: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.task-column__ghost {
  opacity: 0.4;
}
</style>
