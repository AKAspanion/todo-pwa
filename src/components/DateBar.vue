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
const props = defineProps<{ today: string }>();

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
    number: day.format('D'),
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
    <div class="date-bar__days">
      <v-btn
        v-for="day in shown"
        :key="day.ymd"
        class="date-bar__day"
        :data-date="day.ymd"
        :aria-label="day.label"
        :aria-pressed="selected === day.ymd"
        :variant="selected === day.ymd ? 'flat' : 'tonal'"
        color="primary"
        height="56"
        min-width="52"
        width="52"
        @click="toggle(day.ymd)"
      >
        <span class="date-bar__label">
          <span class="text-title-small">{{ day.number }}</span>
          <span class="text-label-small">{{ day.weekday }}</span>
        </span>
      </v-btn>
    </div>
    <v-menu v-model="pickerOpen" :close-on-content-click="false" location="bottom end">
      <template #activator="{ props: activator }">
        <v-btn
          v-bind="activator"
          icon="mdi-calendar"
          variant="tonal"
          color="primary"
          class="date-bar__picker"
          :aria-label="t('tasks.dateBar.pickDate')"
        />
      </template>
      <v-date-picker :model-value="pickerValue" @update:model-value="onPick" />
    </v-menu>
  </div>
</template>

<style scoped>
.date-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.date-bar__days {
  display: flex;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
  overflow-x: auto;
  padding: 4px 2px;
  scrollbar-width: thin;
}
.date-bar__day {
  flex: 0 0 auto;
  text-transform: none;
  letter-spacing: normal;
}
.date-bar__label {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.2;
}
.date-bar__picker {
  flex: 0 0 auto;
}
</style>
