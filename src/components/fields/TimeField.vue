<script setup lang="ts">
/**
 * A local time of day as 'HH:mm', shown on a 12-hour clock in a read-only text field that opens
 * Vuetify's time picker on click, Enter or Space. The one time input of every form.
 */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatFieldTime, formatTime12, type DateLocale } from '@/lib/dates';

const props = defineProps<{
  /** Defaults to "Select time". */
  label?: string;
  /** Shows no time and opens no picker, as for an indefinite task. */
  disabled?: boolean;
  /** Keeps the time shown but opens no picker and offers no clear, as while a save is in flight. */
  readonly?: boolean;
  /** Offers a clear button that sets no time (''). */
  clearable?: boolean;
  density?: 'default' | 'comfortable' | 'compact';
  /** The field's look; the old app's edit card used the filled-in solo field. */
  variant?: 'outlined' | 'solo';
  /** Hides the label once the field has a value, as the old app's unlabelled fields did. */
  singleLine?: boolean;
  /** Draws no card shadow or border around a solo field. */
  flat?: boolean;
  bgColor?: string;
  /** Writes the value as the old app's short field text instead of the long form. */
  oldFormat?: boolean;
  name?: string;
}>();
/** 'HH:mm', the device's local time; '' for none. */
const model = defineModel<string>({ required: true });

const { t, locale } = useI18n();
const open = ref(false);

const dateLocale = computed<DateLocale>(() => (locale.value === 'hi' ? 'hi' : 'en'));
const text = computed(() =>
  props.disabled
    ? ''
    : props.oldFormat
      ? formatFieldTime(model.value, dateLocale.value)
      : formatTime12(model.value, dateLocale.value),
);
const blocked = computed(() => Boolean(props.disabled || props.readonly));

/** A cleared picker field gives null: the last full time stays. */
function onPick(value: unknown): void {
  if (typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)) model.value = value;
}

function onClear(): void {
  if (!blocked.value) model.value = '';
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
        :label="label ?? t('fields.time.label')"
        :disabled="disabled"
        :clearable="clearable && !blocked"
        :density="density"
        prepend-inner-icon="mdi-clock"
        :variant="variant ?? 'outlined'"
        :single-line="singleLine"
        :flat="flat"
        :bg-color="bgColor"
        readonly
        @click:clear="onClear"
        @keydown.enter.prevent="openFromKeyboard"
        @keydown.space.prevent="openFromKeyboard"
      />
    </template>
    <!-- Vuetify translates the picker's title itself, as a message key: give it the app's key. -->
    <v-time-picker
      :model-value="model || null"
      title="fields.time.label"
      format="24hr"
      color="primary"
      @update:model-value="onPick"
    >
      <template #actions>
        <v-btn color="primary" variant="text" @click="open = false">
          {{ t('fields.time.done') }}
        </v-btn>
      </template>
    </v-time-picker>
  </v-menu>
</template>
