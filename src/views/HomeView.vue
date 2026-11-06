<script setup lang="ts">
/**
 * Home: the signed-in user's tasks in Todo and Done, narrowed by text, labels and the day picked
 * in the date bar (spec §3.3, §3.4). "Today" is recomputed when the date changes and when the app
 * becomes visible again (D3); a day that was showing "today" moves on with it.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDisplay } from 'vuetify';
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
const { xs } = useDisplay();
const tasksStore = useTasksStore();
const labelsStore = useLabelsStore();
const session = useSessionStore();

const dateLocale = computed<DateLocale>(() => (locale.value === 'hi' ? 'hi' : 'en'));

const today = ref(todayYmd());
const selectedDate = ref<string | null>(today.value);
const search = ref<string | null>('');
const labelFilter = ref<string[]>([]);
const searchField = ref<{ focus: () => void } | null>(null);
/** The load error's Close hides it until the next failed load. */
const errorDismissed = ref(false);

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

/** Stands for the count in the header while the tasks load, so the count can show a shimmer then. */
const COUNT_MARK = '\u0000';

const header = computed(() => {
  // Loading keeps the word after the number ("tasks"), as the old list did: only the number goes.
  const tasks = loading.value
    ? COUNT_MARK + t('tasks.count', 2).replace(/^\D*\d+/, '')
    : t('tasks.count', filtered.value.todo.length);
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

/** The header either side of the count, so the count can be a shimmer while the tasks load. */
const headerParts = computed(() => {
  const [before = '', after = ''] = header.value.split(COUNT_MARK);
  return { before, after };
});

const headerDate = computed(() =>
  selectedDate.value ? formatLongDate(selectedDate.value, dateLocale.value) : '',
);

/** The old list focused the search field once its menu had opened. */
function onSearch(): void {
  setTimeout(() => searchField.value?.focus(), 250);
}

const bgHeight = computed(() => (xs.value ? '124px' : '132px'));

function loadAll(): Promise<unknown> {
  return Promise.all([tasksStore.load(), labelsStore.load()]);
}

// Follows the signed-in user: their data loads as soon as Firebase reports them.
session.start();
watch(loadFailed, (failed) => {
  if (failed) errorDismissed.value = false;
});
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
  <div class="home">
    <v-progress-linear
      v-if="loading"
      indeterminate
      color="primary"
      height="4"
      class="fixed-progress"
    />

    <v-menu location="left" :close-on-content-click="false" :offset="[-4, 4]">
      <template #activator="{ props: activator }">
        <v-btn
          v-bind="activator"
          icon="mdi-magnify"
          variant="flat"
          color="primary"
          width="40"
          height="40"
          elevation="0"
          class="search-fab"
          :class="xs ? 'mr-n2' : 'mr-1'"
          :aria-label="t('tasks.search.label')"
          @click="onSearch"
        />
      </template>
      <v-card class="home__search" data-testid="home-search">
        <v-text-field
          ref="searchField"
          v-model="search"
          name="search"
          type="search"
          :label="t('tasks.search.label')"
          append-inner-icon="mdi-magnify"
          variant="solo"
          flat
          clearable
          hide-details
        />
        <v-chip-group
          v-if="labelsStore.labels.length"
          v-model="labelFilter"
          multiple
          filter
          :aria-label="t('tasks.filter.label')"
          data-testid="label-filter"
          class="px-3 pb-2"
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
      </v-card>
    </v-menu>

    <v-card flat tile class="home__card">
      <div class="content-wrapper">
        <div class="elevated-bg" :style="{ height: `calc(${bgHeight} - 30px)` }"></div>
        <div class="content-bg bg-primary" :style="{ height: bgHeight }"></div>
        <div class="content">
          <div :class="xs ? '' : 'mx-3 mb-2'">
            <v-card-title
              tag="h1"
              class="old-card-title text-white home__title"
              data-testid="home-header"
            >
              {{ headerParts.before
              }}<span
                v-if="loading"
                class="shimmer light--animate mr-1"
                style="display: inline-block; width: 13px; height: 20px; vertical-align: middle"
              ></span
              >{{ headerParts.after }}
            </v-card-title>
            <!-- The day in full, for assistive tech: the old list showed it only in the title. -->
            <p v-if="headerDate" class="d-sr-only" data-testid="home-date">{{ headerDate }}</p>
          </div>

          <DateBar
            v-model="selectedDate"
            :today="today"
            :loading="loading"
            :class="xs ? 'mx-1 mb-6' : 'mx-4 mb-8'"
          />

          <div style="width: 100%" :class="xs ? 'px-3' : 'px-4'">
            <div
              v-if="labelFilter.length || search"
              class="d-flex flex-wrap justify-start"
              :class="xs ? 'px-1 pb-2' : 'px-3 pb-4'"
            >
              <v-chip
                v-if="search"
                closable
                label
                color="primary"
                class="mr-2"
                :size="xs ? 'small' : 'default'"
                prepend-icon="mdi-magnify"
                @click:close="search = ''"
              >
                {{ search }}
              </v-chip>
              <template v-for="label in labelsStore.labels" :key="label.id">
                <v-chip
                  v-if="labelFilter.includes(label.id)"
                  closable
                  label
                  class="mr-2"
                  :color="safeColor(label.color)"
                  :size="xs ? 'small' : 'default'"
                  @click:close="labelFilter = labelFilter.filter((id) => id !== label.id)"
                >
                  <span class="px-1">{{ label.label }}</span>
                </v-chip>
              </template>
            </div>

            <TaskBoard
              :todo="filtered.todo"
              :done="filtered.done"
              :labels="labelsStore.labels"
              :loading="loading"
              :today="today"
            />
          </div>
        </div>
      </div>
    </v-card>

    <!-- The old list reported a failed load in its snackbar; this one also offers Retry (D12). -->
    <v-snackbar
      :model-value="loadFailed && !errorDismissed"
      :timeout="-1"
      multi-line
      location="bottom"
      class="app-snackbar"
      data-testid="load-error"
    >
      {{ t('tasks.errors.load') }}
      <template #actions>
        <v-btn variant="text" :loading="loading" @click="loadAll">
          {{ t('tasks.errors.retry') }}
        </v-btn>
        <v-btn variant="text" @click="errorDismissed = true">{{ t('common.close') }}</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<style scoped>
.home {
  position: relative;
}
.home__card {
  height: calc(100vh - 80px - 56px - var(--verify-banner-height, 0px));
}
.content-wrapper {
  position: relative;
  z-index: 0;
  width: 100%;
  height: 100%;
  overflow-x: hidden;
  overflow-y: scroll;
  scrollbar-width: none;
}
.content-wrapper::-webkit-scrollbar {
  width: 0;
}
.content-bg,
.elevated-bg {
  width: 100%;
  position: absolute;
  z-index: 3;
  border-bottom-right-radius: 30px;
  border-bottom-left-radius: 30px;
  top: 0;
  left: 0;
}
.elevated-bg {
  top: 30px;
  z-index: 2;
  box-shadow:
    0 4px 5px 0 rgba(0, 0, 0, 0.14),
    0 1px 10px 0 rgba(0, 0, 0, 0.12),
    0 2px 4px -1px rgba(0, 0, 0, 0.2);
}
.content {
  position: absolute;
  text-align: center;
  width: 100%;
  height: 100%;
  z-index: 5;
}
.search-fab {
  position: absolute;
  top: 0;
  right: 16px;
  z-index: 6;
  color: #fff;
}
.fixed-progress {
  position: fixed !important;
  z-index: 1010;
  top: 0;
}
.home__title {
  overflow-wrap: anywhere;
  text-align: left;
}
.home__search {
  min-width: 280px;
}
</style>
