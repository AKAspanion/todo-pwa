<script setup lang="ts">
/**
 * The Todo and Done lists, and every change made from them: check, drag between lists, edit and
 * delete, each saved through the tasks store.
 *
 * An edit's save never times out and is never retried (a retry could write twice): its form stays
 * open with the user's input until the store answers. After 15 s without an answer the card says
 * it is still saving; a rejected save shows the error and keeps the form (D7, Review Focus 1).
 */
import { computed, onBeforeUnmount, provide, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { errorCode } from '@/stores/session';
import { useTasksStore } from '@/stores/tasks';
import { useUiStore } from '@/stores/ui';
import type { Label, Task, TaskInput, TaskStatus } from '@/types/models';
import { TASK_CARD_CONTEXT, type TaskSaveStatus } from './TaskCard.vue';
import TaskColumn from './TaskColumn.vue';

/** How long a save may go unanswered before the card says it is still saving. */
const SLOW_SAVE_MS = 15_000;

const props = defineProps<{
  todo: Task[];
  done: Task[];
  labels: Label[];
  loading: boolean;
  /** Today as 'YYYY-MM-DD'; the view recomputes it when the day changes (D3). */
  today: string;
}>();

const { t } = useI18n();
const tasksStore = useTasksStore();
const ui = useUiStore();

const saveStatuses = reactive(new Map<string, TaskSaveStatus>());
const pendingIds = reactive(new Set<string>());
const slowTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** Skeletons only while loading with nothing to show; cards and skeletons never together (D10). */
const showSkeletons = computed(
  () => props.loading && props.todo.length === 0 && props.done.length === 0,
);

const columns = computed<{ status: TaskStatus; tasks: Task[] }[]>(() => [
  { status: 'todo', tasks: props.todo },
  { status: 'done', tasks: props.done },
]);

function stopSlowTimer(taskId: string): void {
  clearTimeout(slowTimers.get(taskId));
  slowTimers.delete(taskId);
}

provide(TASK_CARD_CONTEXT, {
  saveStatus: (taskId) => saveStatuses.get(taskId),
  clearSaveStatus: (taskId) => {
    // A save still in flight keeps its state: the card shows it until the store answers.
    if (saveStatuses.get(taskId) === 'failed') saveStatuses.delete(taskId);
  },
  isPending: (taskId) => pendingIds.has(taskId),
  today: () => props.today,
});

/** The task as the board has it now, which may be newer than the copy a drag carried. */
function current(task: Task): Task {
  return [...props.todo, ...props.done].find((item) => item.id === task.id) ?? task;
}

async function onSave(task: Task, patch: Partial<TaskInput>): Promise<void> {
  const status = saveStatuses.get(task.id);
  if (status === 'saving' || status === 'slow') return;
  saveStatuses.set(task.id, 'saving');
  stopSlowTimer(task.id);
  slowTimers.set(
    task.id,
    setTimeout(() => {
      if (saveStatuses.get(task.id) === 'saving') saveStatuses.set(task.id, 'slow');
    }, SLOW_SAVE_MS),
  );
  try {
    await tasksStore.update(current(task), patch);
    saveStatuses.delete(task.id);
    ui.showSnack(t('tasks.toast.saved'));
  } catch (error) {
    console.warn('[home] save failed:', errorCode(error));
    saveStatuses.set(task.id, 'failed');
  } finally {
    stopSlowTimer(task.id);
  }
}

async function setStatus(task: Task, status: TaskStatus): Promise<void> {
  if (pendingIds.has(task.id) || current(task).status === status) return;
  pendingIds.add(task.id);
  try {
    await tasksStore.update(current(task), { status });
  } catch (error) {
    console.warn('[home] status change failed:', errorCode(error));
    ui.showSnack(t('tasks.errors.save'));
  } finally {
    pendingIds.delete(task.id);
  }
}

function onToggle(task: Task): void {
  void setStatus(task, task.status === 'done' ? 'todo' : 'done');
}

function onMove(task: Task, status: TaskStatus): void {
  void setStatus(task, status);
}

async function onRemove(task: Task): Promise<void> {
  if (pendingIds.has(task.id)) return;
  pendingIds.add(task.id);
  try {
    await tasksStore.remove(task.id);
    ui.showSnack(t('tasks.toast.deleted'));
  } catch (error) {
    console.warn('[home] delete failed:', errorCode(error));
    ui.showSnack(t('tasks.errors.delete'));
  } finally {
    pendingIds.delete(task.id);
  }
}

onBeforeUnmount(() => {
  for (const timer of slowTimers.values()) clearTimeout(timer);
  slowTimers.clear();
});
</script>

<template>
  <v-row no-gutters class="task-board ma-0">
    <v-col v-for="column in columns" :key="column.status" cols="12" md="6" class="pa-0">
      <TaskColumn
        :status="column.status"
        :tasks="column.tasks"
        :labels="labels"
        :skeleton="showSkeletons"
        @toggle="onToggle"
        @save="onSave"
        @remove="onRemove"
        @move="onMove"
      />
    </v-col>
  </v-row>
</template>
