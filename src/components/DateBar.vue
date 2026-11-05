<script setup lang="ts">
/**
 * The next 16 days from today, and a calendar for any other day. The selected day ('YYYY-MM-DD',
 * local) is the model; pressing it again clears it, which shows every day's tasks. `today` comes
 * from the view, which recomputes it when the date changes (D3), so the strip moves with it.
 */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatLongDate, parseLocalDate, todayYmd, type DateLocale } from '@/lib/dates';

/** Today and the 15 days after it, as the old date bar showed. */
const DAYS_SHOWN = 16;

const selected = defineModel<string | null>({ required: true });
const props = defineProps<{ today: string; loading?: boolean }>();

const { t, locale } = useI18n();
const dateLocale = computed<DateLocale>(() => (locale.value === 'hi' ? 'hi' : 'en'));
const pickerOpen = ref(false);

interface Day {
  ymd: string;
  number: string;
  weekday: string;
  label: string;
}

function toDay(ymd: string): Day {
  const day = parseLocalDate(ymd).locale(dateLocale.value);
  return {
    ymd,
    number: day.format('DD'),
    weekday: day.format('ddd'),
    label: formatLongDate(ymd, dateLocale.value),
  };
}

const days = computed<Day[]>(() => {
  const start = parseLocalDate(props.today);
  return Array.from({ length: DAYS_SHOWN }, (_, i) =>
    toDay(start.add(i, 'day').format('YYYY-MM-DD')),
  );
});

/** A day picked from the calendar outside the strip gets a chip of its own, at the end. */
const extraDay = computed<Day | null>(() => {
  const ymd = selected.value;
  if (!ymd || !parseLocalDate(ymd).isValid() || days.value.some((d) => d.ymd === ymd)) return null;
  return toDay(ymd);
});

const shown = computed(() => (extraDay.value ? [...days.value, extraDay.value] : days.value));

const pickerValue = computed(() =>
  selected.value && parseLocalDate(selected.value).isValid()
    ? parseLocalDate(selected.value).toDate()
    : null,
);

function toggle(ymd: string): void {
  selected.value = selected.value === ymd ? null : ymd;
}

function onPick(value: unknown): void {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return;
  selected.value = todayYmd(value);
  pickerOpen.value = false;
}
</script>

<template>
  <div class="date-bar" role="group" :aria-label="t('tasks.dateBar.label')" data-testid="date-bar">
    <div v-if="loading" class="date-bar__loader" aria-hidden="true">
      <v-card
        v-for="i in 20"
        :key="i"
        width="48"
        height="48"
        class="ma-3"
        color="white"
        flat
        rounded="sm"
      >
        <div class="shimmer light--animate date-shimmer"></div>
        <div class="shimmer light--animate month-shimmer"></div>
      </v-card>
    </div>
    <v-slide-group v-else>
      <v-btn
        v-for="day in shown"
        :key="day.ymd"
        class="date-bar__day ma-3 caption"
        :data-date="day.ymd"
        :aria-label="day.label"
        :aria-pressed="selected === day.ymd"
        :color="selected === day.ymd ? 'white' : 'primary'"
        :elevation="selected === day.ymd ? 6 : 0"
        variant="flat"
        rounded="sm"
        height="48"
        min-width="48"
        width="48"
        @click="toggle(day.ymd)"
      >
        <span class="date-bar__label">
          {{ day.number }}
          <br />
          {{ day.weekday }}
        </span>
      </v-btn>
      <v-menu v-model="pickerOpen" :close-on-content-click="false" location="bottom end">
        <template #activator="{ props: activator }">
          <v-btn
            v-bind="activator"
            icon="mdi-calendar"
            variant="text"
            class="date-bar__picker ma-3 text-white"
            width="48"
            height="48"
            :aria-label="t('tasks.dateBar.pickDate')"
          />
        </template>
        <v-date-picker color="primary" :model-value="pickerValue" @update:model-value="onPick" />
      </v-menu>
    </v-slide-group>
  </div>
</template>

<style scoped>
.date-bar {
  min-width: 0;
}
/* The slide group scrolls by touch and wheel, as the old one did: no arrows. */
.date-bar :deep(.v-slide-group__prev),
.date-bar :deep(.v-slide-group__next) {
  display: none;
}
.date-bar__loader {
  display: flex;
  height: 72px;
  overflow: hidden;
}
.date-bar__loader > * {
  flex: 0 0 auto;
}
.date-bar__day {
  flex: 0 0 auto;
  text-transform: none;
  letter-spacing: normal;
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1.2em;
}
.date-bar__label {
  display: block;
  line-height: 1.2em;
}
.date-bar__picker {
  flex: 0 0 auto;
}
.date-shimmer {
  width: 20px;
  height: 16px;
  margin: 6px auto;
}
.month-shimmer {
  width: 24px;
  height: 12px;
  margin: 0 auto;
}
</style>
