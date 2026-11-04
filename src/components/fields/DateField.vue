<script setup lang="ts">
/**
 * A local calendar day as 'YYYY-MM-DD' (D1), shown as a long date in a read-only text field that
 * opens Vuetify's date picker on click, Enter or Space. The one date input of every form: the
 * picker's Date at local midnight is kept as that local day, never via UTC.
 */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  formatFieldDate,
  formatReadableDate,
  formatLongDate,
  parseLocalDate,
  todayYmd,
  type DateLocale,
} from '@/lib/dates';

const props = defineProps<{
  /** Defaults to "Select date". */
  label?: string;
  /** Shows no date and opens no picker, as for an indefinite task. */
  disabled?: boolean;
  /** Keeps the date shown but opens no picker, as while a save is in flight. */
  readonly?: boolean;
  errorMessages?: string | string[];
  rules?: ((value: string) => true | string)[];
  density?: 'default' | 'comfortable' | 'compact';
  /** The field's look; the old app's edit card used the filled-in solo field. */
  variant?: 'outlined' | 'solo';
  /** Hides the label once the field has a value, as the old app's unlabelled fields did. */
  singleLine?: boolean;
  /** Draws no card shadow or border around a solo field. */
  flat?: boolean;
  bgColor?: string;
  /**
   * Writes the value as the old app's field text instead of the long form: `true` is the edit
   * form's short 'Nov, 2nd, 26', 'long' the add screen's 'Monday, November 2nd, 2026'.
   */
  oldFormat?: boolean | 'long';
  name?: string;
}>();
/** 'YYYY-MM-DD', the device's local day; '' for none. */
const model = defineModel<string>({ required: true });

const { t, locale } = useI18n();
const open = ref(false);

const dateLocale = computed<DateLocale>(() => (locale.value === 'hi' ? 'hi' : 'en'));
const text = computed(() =>
  props.disabled
    ? ''
    : props.oldFormat === 'long'
      ? formatReadableDate(model.value, dateLocale.value)
      : props.oldFormat
        ? formatFieldDate(model.value, dateLocale.value)
        : formatLongDate(model.value, dateLocale.value),
);
const pickerDate = computed(() => {
  const day = parseLocalDate(model.value);
  return day.isValid() ? day.toDate() : undefined;
});
const blocked = computed(() => Boolean(props.disabled || props.readonly));
/** The field shows formatted text, so rules see the stored day instead. */
const fieldRules = computed(() => (props.rules ?? []).map((rule) => () => rule(model.value)));

function onPick(value: unknown): void {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return;
  model.value = todayYmd(value);
  open.value = false;
}

/** Opens the picker from the keyboard, as a click does. */
function openFromKeyboard(): void {
  if (!blocked.value) open.value = true;
}
</script>

<template>
  <v-menu v-model="open" :close-on-content-click="false" :disabled="blocked">
    <template #activator="{ props: menuProps }">
      <v-text-field
        v-bind="menuProps"
        :model-value="text"
        :name="name"
        :label="label ?? t('fields.date.label')"
        :disabled="disabled"
        :error-messages="errorMessages"
        :rules="fieldRules"
        :density="density"
        prepend-inner-icon="mdi-calendar"
        :variant="variant ?? 'outlined'"
        :single-line="singleLine"
        :flat="flat"
        :bg-color="bgColor"
        readonly
        @keydown.enter.prevent="openFromKeyboard"
        @keydown.space.prevent="openFromKeyboard"
      />
    </template>
    <!-- Vuetify translates the picker's title itself, as a message key: give it the app's key. -->
    <v-date-picker
      :model-value="pickerDate"
      title="fields.date.label"
      color="primary"
      hide-header
      @update:model-value="onPick"
    />
  </v-menu>
</template>
