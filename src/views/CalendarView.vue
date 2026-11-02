<script setup lang="ts">
/**
 * Calendar: the signed-in user's dated tasks by day, week or month (spec §3.5). A task's date and
 * time are wall-clock values in the device's time zone (D1), handed to the calendar as
 * 'YYYY-MM-DD HH:mm' text so nothing turns them into a UTC instant. Headings and dates follow the
 * app's language, without ordinals (D4); clicking an event opens the task (D16). "Today" is
 * recomputed when the date changes and when the app becomes visible again (D3).
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import TaskDetailsDialog from '@/components/calendar/TaskDetailsDialog.vue';
import {
  formatLongDate,
  formatTime12,
  onDayChange,
  parseHm,
  parseLocalDate,
  parseYmd,
  todayYmd,
  type DateLocale,
} from '@/lib/dates';
import { useLabelsStore } from '@/stores/labels';
import { useSessionStore } from '@/stores/session';
import { useTasksStore } from '@/stores/tasks';
import type { Task } from '@/types/models';

type ViewType = 'day' | 'week' | 'month';

/** One task as a calendar event; `start` is local wall-clock text, never an instant. */
interface CalendarEvent {
  name: string;
  start: string;
  timed: boolean;
  color: string;
  task: Task;
}

/** The calendar's controls, as far as this screen moves it. */
interface CalendarControls {
  prev(amount?: number): void;
  next(amount?: number): void;
}

/** Weeks start on Sunday, as they did in the old app; the week heading counts from here too. */
const FIRST_DAY_OF_WEEK = 0;
const VIEWS: readonly ViewType[] = ['day', 'week', 'month'];

const { t, locale } = useI18n();
const tasksStore = useTasksStore();
const labelsStore = useLabelsStore();
const session = useSessionStore();

const dateLocale = computed<DateLocale>(() => (locale.value === 'hi' ? 'hi' : 'en'));

const today = ref(todayYmd());
/** The selected date, 'YYYY-MM-DD': the views switch around it, and Today brings it back. */
const focus = ref(today.value);
const view = ref<ViewType>('month');
const calendar = ref<CalendarControls | null>(null);
const selectedTask = ref<Task | null>(null);

const loading = computed(() => !session.ready || tasksStore.loading || labelsStore.loading);
const loadFailed = computed(
  () => tasksStore.error === 'load-failed' || labelsStore.error === 'load-failed',
);

/** Dated tasks only (indefinite and legacy 'NA' dates have no day to sit on). */
const events = computed<CalendarEvent[]>(() =>
  tasksStore.tasks.flatMap((task) => {
    if (task.indefinite || !task.date || !parseYmd(task.date)) return [];
    const timed = task.time !== null && parseHm(task.time) !== null;
    return [
      {
        name: task.title,
        start: timed ? `${task.date} ${task.time}` : task.date,
        timed,
        color: task.status === 'done' ? 'grey' : 'primary',
        task,
      },
    ];
  }),
);

/** 'November 2026', '15 – 21 November 2026' or 'Wednesday, 18 November 2026', in the app's language. */
const title = computed(() => {
  const day = parseLocalDate(focus.value).locale(dateLocale.value);
  if (!day.isValid()) return '';
  if (view.value === 'day') return formatLongDate(focus.value, dateLocale.value);
  if (view.value === 'month') return day.format('MMMM YYYY');
  const start = day.subtract((day.day() - FIRST_DAY_OF_WEEK + 7) % 7, 'day');
  const end = start.add(6, 'day');
  const startFormat =
    start.year() !== end.year() ? 'D MMMM YYYY' : start.month() !== end.month() ? 'D MMMM' : 'D';
  return t('calendar.range', {
    start: start.format(startFormat),
    end: end.format('D MMMM YYYY'),
  });
});

/**
 * The task behind an event the calendar hands to its `event` slot. Vuetify types slot events as
 * `{ [prop: string]: any }` (third-party boundary); they are the objects built in `events` above.
 */
function taskOf(event: Record<string, unknown>): Task {
  return (event as unknown as CalendarEvent).task;
}

/** The event's time in the app's language, such as '9:30 AM'; '' for a task without one. */
function eventTime(task: Task): string {
  return task.time && parseHm(task.time) ? formatTime12(task.time, dateLocale.value) : '';
}

/** The calendar moved (previous, next, a date clicked): it reports the new date as 'YYYY-MM-DD'. */
function moveTo(value: unknown): void {
  if (typeof value === 'string' && parseYmd(value)) focus.value = value;
}

function showDay(date: string): void {
  focus.value = date;
  view.value = 'day';
}

function goToday(): void {
  focus.value = today.value;
}

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
    if (focus.value === previous) focus.value = today.value;
  });
});
onBeforeUnmount(() => stopDayChange?.());
</script>

<template>
  <v-container class="calendar px-4 py-3" max-width="1200">
    <header class="calendar__toolbar mb-3">
      <div class="calendar__nav">
        <v-btn variant="outlined" size="small" @click="goToday">{{ t('calendar.today') }}</v-btn>
        <v-btn
          icon="mdi-chevron-left"
          variant="text"
          size="small"
          :aria-label="t(`calendar.previous.${view}`)"
          @click="calendar?.prev()"
        />
        <v-btn
          icon="mdi-chevron-right"
          variant="text"
          size="small"
          :aria-label="t(`calendar.next.${view}`)"
          @click="calendar?.next()"
        />
        <h1 class="calendar__title text-title-large" data-testid="calendar-title">{{ title }}</h1>
      </div>
      <v-btn-toggle
        v-model="view"
        mandatory
        divided
        density="compact"
        variant="outlined"
        role="group"
        :aria-label="t('calendar.views.label')"
        class="calendar__views"
      >
        <v-btn v-for="option in VIEWS" :key="option" :value="option" size="small">
          {{ t(`calendar.views.${option}`) }}
        </v-btn>
      </v-btn-toggle>
    </header>

    <v-alert
      v-if="loadFailed"
      type="error"
      variant="tonal"
      class="mb-3"
      data-testid="calendar-load-error"
    >
      <div class="d-flex align-center flex-wrap ga-2">
        <span class="flex-grow-1">{{ t('calendar.errors.load') }}</span>
        <v-btn variant="outlined" size="small" :loading="loading" @click="loadAll">
          {{ t('calendar.errors.retry') }}
        </v-btn>
      </div>
    </v-alert>

    <v-progress-linear
      v-if="loading"
      indeterminate
      color="primary"
      class="mb-2"
      :aria-label="t('calendar.loading')"
      data-testid="calendar-loading"
    />

    <v-sheet class="calendar__sheet" data-testid="calendar">
      <v-calendar
        ref="calendar"
        :model-value="focus"
        :type="view"
        :now="today"
        :events="events"
        :first-day-of-week="FIRST_DAY_OF_WEEK"
        :event-margin-bottom="3"
        color="primary"
        @update:model-value="moveTo"
        @click:date="(_event: Event, day: { date: string }) => showDay(day.date)"
        @click:more="(_event: Event, day: { date: string }) => showDay(day.date)"
      >
        <template #day-label="day">
          <v-btn
            icon
            size="small"
            :variant="day.present ? 'flat' : 'text'"
            :color="day.present ? 'primary' : undefined"
            :aria-label="formatLongDate(day.date, dateLocale)"
            data-testid="calendar-day-label"
            @click="showDay(day.date)"
          >
            {{ day.day }}
          </v-btn>
        </template>
        <template #event="{ event }">
          <button
            type="button"
            class="calendar__event"
            :class="{ 'calendar__event--done': taskOf(event).status === 'done' }"
            data-testid="calendar-event"
            @click="selectedTask = taskOf(event)"
          >
            <strong v-if="eventTime(taskOf(event))" class="calendar__event-time">
              {{ eventTime(taskOf(event)) }}
            </strong>
            {{ taskOf(event).title }}
          </button>
        </template>
      </v-calendar>
    </v-sheet>

    <TaskDetailsDialog :task="selectedTask" @close="selectedTask = null" />
  </v-container>
</template>

<style scoped>
.calendar__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
}
.calendar__nav {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
.calendar__title {
  margin-left: 4px;
  overflow-wrap: anywhere;
}
.calendar__sheet {
  height: calc(100dvh - 220px);
  min-height: 480px;
}
.calendar__event {
  display: block;
  width: 100%;
  height: 100%;
  padding: 0 4px;
  overflow: hidden;
  color: inherit;
  font: inherit;
  text-align: start;
  white-space: nowrap;
  text-overflow: ellipsis;
  background: none;
  border: 0;
  cursor: pointer;
}
.calendar__event:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: -2px;
}
.calendar__event--done {
  text-decoration: line-through;
}
.calendar__event-time {
  margin-inline-end: 4px;
}
</style>
