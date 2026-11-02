<script setup lang="ts">
/**
 * Home: the signed-in user's tasks in Todo and Done, narrowed by text, labels and the day picked
 * in the date bar (spec §3.3, §3.4). "Today" is recomputed when the date changes and when the app
 * becomes visible again (D3); a day that was showing "today" moves on with it.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import DateBar from '@/components/DateBar.vue';
import { safeColor } from '@/components/tasks/labels';
import TaskBoard from '@/components/tasks/TaskBoard.vue';
import {
  formatLongDate,
  onDayChange,
  parseLocalDate,
  relativeDayLabel,
  todayYmd,
  type DateLocale,
} from '@/lib/dates';
import { useLabelsStore } from '@/stores/labels';
import { useSessionStore } from '@/stores/session';
import { useTasksStore } from '@/stores/tasks';

const { t, locale } = useI18n();
const tasksStore = useTasksStore();
const labelsStore = useLabelsStore();
const session = useSessionStore();

const dateLocale = computed<DateLocale>(() => (locale.value === 'hi' ? 'hi' : 'en'));

const today = ref(todayYmd());
const selectedDate = ref<string | null>(today.value);
const search = ref<string | null>('');
const labelFilter = ref<string[]>([]);

const filtered = computed(() =>
  tasksStore.filter({
    text: search.value ?? '',
    labelIds: labelFilter.value,
    date: selectedDate.value,
  }),
);

const loading = computed(() => !session.ready || tasksStore.loading || labelsStore.loading);
const loadFailed = computed(
  () => tasksStore.error === 'load-failed' || labelsStore.error === 'load-failed',
);

const header = computed(() => {
  const tasks = t('tasks.count', filtered.value.todo.length);
  const day = selectedDate.value;
  if (!day) return t('tasks.header.all', { tasks });
  const now = parseLocalDate(today.value);
  const label = relativeDayLabel(day, dateLocale.value, now.toDate());
  // Whole days, rounded, so a 23- or 25-hour day around a DST change still counts as one.
  const offset = Math.round(parseLocalDate(day).diff(now, 'hour') / 24);
  return Math.abs(offset) <= 1
    ? t('tasks.header.relative', { tasks, day: label })
    : t('tasks.header.onDate', { tasks, day: label });
});

const headerDate = computed(() =>
  selectedDate.value ? formatLongDate(selectedDate.value, dateLocale.value) : '',
);

function loadAll(): Promise<unknown> {
  return Promise.all([tasksStore.load(), labelsStore.load()]);
}

// Follows the signed-in user: their data loads as soon as Firebase reports them.
session.start();
watch(
  () => session.user?.uid,
  (uid) => {
    if (uid) void loadAll();
  },
  { immediate: true },
);

let stopDayChange: (() => void) | null = null;
onMounted(() => {
  stopDayChange = onDayChange(() => {
    const previous = today.value;
    today.value = todayYmd();
    if (selectedDate.value === previous) selectedDate.value = today.value;
  });
});
onBeforeUnmount(() => stopDayChange?.());
</script>

<template>
  <v-container class="home px-4 py-3" max-width="1200">
    <header class="home__header mb-3">
      <h1 class="text-headline-small home__title" data-testid="home-header">{{ header }}</h1>
      <p v-if="headerDate" class="text-body-medium text-medium-emphasis" data-testid="home-date">
        {{ headerDate }}
      </p>
    </header>

    <DateBar v-model="selectedDate" :today="today" class="mb-3" />

    <v-text-field
      v-model="search"
      name="search"
      type="search"
      :label="t('tasks.search.label')"
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      density="compact"
      clearable
      hide-details
      class="home__search mb-2"
    />

    <v-chip-group
      v-if="labelsStore.labels.length"
      v-model="labelFilter"
      multiple
      filter
      :aria-label="t('tasks.filter.label')"
      data-testid="label-filter"
      class="mb-2"
    >
      <v-chip
        v-for="label in labelsStore.labels"
        :key="label.id"
        :value="label.id"
        :color="safeColor(label.color)"
        :variant="labelFilter.includes(label.id) ? 'flat' : 'outlined'"
        size="small"
        label
      >
        {{ label.label }}
      </v-chip>
    </v-chip-group>

    <v-alert v-if="loadFailed" type="error" variant="tonal" class="mb-3" data-testid="load-error">
      <div class="d-flex align-center flex-wrap ga-2">
        <span class="flex-grow-1">{{ t('tasks.errors.load') }}</span>
        <v-btn variant="outlined" size="small" :loading="loading" @click="loadAll">
          {{ t('tasks.errors.retry') }}
        </v-btn>
      </div>
    </v-alert>

    <TaskBoard
      :todo="filtered.todo"
      :done="filtered.done"
      :labels="labelsStore.labels"
      :loading="loading"
      :today="today"
    />
  </v-container>
</template>

<style scoped>
.home__title {
  overflow-wrap: anywhere;
}
.home__title::first-letter {
  text-transform: uppercase;
}
.home__search {
  max-width: 480px;
}
</style>
