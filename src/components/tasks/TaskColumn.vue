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
const headingId = computed(() => `task-column-${props.status}`);

function onAdd(event: DraggableEvent<Task>): void {
  const task = event.data;
  if (task && task.status !== props.status) emit('move', task, props.status);
}
</script>

<template>
  <section class="task-column" :aria-labelledby="headingId" :data-column="status">
    <h2 :id="headingId" class="task-column__title text-label-large text-uppercase mb-2">
      {{ t(`tasks.columns.${status}`) }}
    </h2>

    <div
      v-if="skeleton"
      class="task-column__list"
      aria-busy="true"
      :aria-label="t('tasks.loadingTasks')"
    >
      <v-skeleton-loader
        v-for="index in SKELETONS_PER_COLUMN"
        :key="index"
        data-testid="task-skeleton"
        type="heading, sentences, chip"
        elevation="1"
      />
    </div>

    <VueDraggable
      v-else
      :model-value="tasks"
      class="task-column__list"
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
        class="task-column__empty pa-4"
        :data-testid="`task-empty-${status}`"
      >
        <div class="text-title-small">{{ t(`tasks.empty.${status}.title`) }}</div>
        <div class="text-body-small">{{ t(`tasks.empty.${status}.caption`) }}</div>
        <v-btn
          v-if="status === 'todo'"
          to="/add"
          color="primary"
          variant="flat"
          size="small"
          class="mt-2"
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
  gap: 12px;
  /* An empty list is still a drop target (D9). */
  min-height: 120px;
  padding-bottom: 24px;
}
.task-column__ghost {
  opacity: 0.4;
}
</style>
