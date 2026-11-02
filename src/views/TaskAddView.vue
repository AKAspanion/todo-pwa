<script setup lang="ts">
/**
 * The add-task screen (spec §3.2): a title, a Markdown description, a local date and time or
 * "indefinite", and any of the user's labels. Dates are the device's local calendar days (D1);
 * the store derives the time zone and reminder fields on save (P6).
 *
 * A save never times out or retries (a timeout risks a duplicate write): the form keeps its input
 * in a saving state, says so after 15 s without an answer, and shows an error when the save is
 * rejected (Review Focus 1).
 */
import dayjs from 'dayjs';
import { onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import type { VForm } from 'vuetify/components';
import DateField from '@/components/fields/DateField.vue';
import TimeField from '@/components/fields/TimeField.vue';
import { safeColor } from '@/components/tasks/labels';
import { vFocusOnMount } from '@/directives/focusOnMount';
import { todayYmd } from '@/lib/dates';
import { useLabelsStore } from '@/stores/labels';
import { errorCode, useSessionStore } from '@/stores/session';
import { useTasksStore } from '@/stores/tasks';
import { useUiStore } from '@/stores/ui';
import type { TaskInput } from '@/types/models';

/** The security rules' limits on a stored title and description. */
const TITLE_MAX = 200;
const DESCRIPTION_MAX = 5000;
/** After this long without an answer, the screen says the save is still going (the save ruling). */
const STILL_SAVING_AFTER_MS = 15_000;

interface AddTaskForm {
  title: string;
  description: string;
  indefinite: boolean;
  /** 'YYYY-MM-DD', the device's local day. */
  date: string;
  /** 'HH:mm', the device's local time. */
  time: string;
  labelIds: string[];
}

const { t } = useI18n();
const router = useRouter();
const session = useSessionStore();
const labels = useLabelsStore();
const tasks = useTasksStore();
const ui = useUiStore();

const now = new Date();
const form = reactive<AddTaskForm>({
  title: '',
  description: '',
  indefinite: false,
  date: todayYmd(now),
  time: dayjs(now).format('HH:mm'),
  labelIds: [],
});

const formRef = ref<InstanceType<typeof VForm> | null>(null);
const saving = ref(false);
const stillSaving = ref(false);
const saveFailed = ref(false);
let stillSavingTimer: ReturnType<typeof setTimeout> | undefined;
let left = false;

/** Characters as a person counts them (code points), as the rules count them. */
const length = (value: string): number => [...value].length;

const titleRules = [
  (v: string) => v.trim() !== '' || t('add.title.required'),
  (v: string) => length(v.trim()) <= TITLE_MAX || t('add.title.tooLong'),
];
const descriptionRules = [
  (v: string) => length(v) <= DESCRIPTION_MAX || t('add.description.tooLong'),
];

// Follows the signed-in user (doing nothing when already started), so labels load once known.
session.start();
watch(
  () => session.user?.uid,
  (uid) => {
    if (uid && labels.labels.length === 0 && !labels.loading) void labels.load();
  },
  { immediate: true },
);

async function submit(): Promise<void> {
  if (saving.value) return;
  const result = await formRef.value?.validate();
  if (!result?.valid) return;

  const input: TaskInput = {
    title: form.title.trim(),
    description: form.description,
    indefinite: form.indefinite,
    date: form.indefinite ? null : form.date,
    time: form.indefinite ? null : form.time,
    labelIds: [...form.labelIds],
  };
  saving.value = true;
  saveFailed.value = false;
  stillSaving.value = false;
  stillSavingTimer = setTimeout(() => {
    stillSaving.value = true;
  }, STILL_SAVING_AFTER_MS);
  let saved = false;
  try {
    await tasks.add(input);
    saved = true;
  } catch (error) {
    console.warn('[add] save failed:', errorCode(error));
  } finally {
    clearTimeout(stillSavingTimer);
    saving.value = false;
    stillSaving.value = false;
  }

  if (saved) {
    ui.showSnack(t('add.added'));
    // Someone who left the screen while it saved stays where they went.
    if (!left) await router.push('/home');
  } else if (left) {
    // The form is gone once the user has left it: the snackbar says the task wasn't saved.
    ui.showSnack(t('add.saveFailed'));
  } else {
    saveFailed.value = true;
  }
}

onBeforeUnmount(() => {
  left = true;
  clearTimeout(stillSavingTimer);
});
</script>

<template>
  <v-container class="add-task">
    <h1 class="text-h6 mb-4">{{ t('common.screens.add') }}</h1>
    <v-form ref="formRef" :readonly="saving" @submit.prevent="submit">
      <v-row density="compact">
        <v-col cols="12">
          <v-text-field
            v-model="form.title"
            v-focus-on-mount
            :label="t('add.title.label')"
            :placeholder="t('add.title.placeholder')"
            :rules="titleRules"
            :counter="TITLE_MAX"
            prepend-inner-icon="mdi-format-title"
            variant="outlined"
          />
        </v-col>

        <v-col cols="12" sm="6">
          <DateField v-model="form.date" :disabled="form.indefinite" :readonly="saving" />
        </v-col>

        <v-col cols="12" sm="6">
          <TimeField v-model="form.time" :disabled="form.indefinite" :readonly="saving" />
        </v-col>

        <v-col cols="12">
          <v-switch
            v-model="form.indefinite"
            :label="t('add.indefinite')"
            color="primary"
            hide-details
            inset
          />
        </v-col>

        <v-col cols="12">
          <div id="add-labels-heading" class="text-subtitle-2 mb-1">
            {{ t('add.labels.label') }}
          </div>
          <div
            class="d-flex align-center flex-wrap ga-2"
            role="group"
            aria-labelledby="add-labels-heading"
          >
            <v-progress-circular
              v-if="labels.loading && labels.labels.length === 0"
              :aria-label="t('add.labels.loading')"
              indeterminate
              size="20"
              width="2"
            />
            <template v-else-if="labels.error && labels.labels.length === 0">
              <span class="text-body-2 text-error">{{ t('add.labels.loadFailed') }}</span>
              <v-btn size="small" variant="text" color="primary" @click="labels.load()">
                {{ t('add.labels.retry') }}
              </v-btn>
            </template>
            <v-chip-group
              v-else-if="labels.labels.length > 0"
              v-model="form.labelIds"
              :disabled="saving"
              multiple
              column
            >
              <v-chip
                v-for="label in labels.labels"
                :key="label.id"
                :value="label.id"
                :color="safeColor(label.color)"
                :variant="form.labelIds.includes(label.id) ? 'flat' : 'tonal'"
                :data-label-id="label.id"
                class="label-choice"
                filter
                label
              >
                {{ label.label }}
              </v-chip>
            </v-chip-group>
            <span v-else class="text-body-2 text-medium-emphasis">{{ t('add.labels.none') }}</span>
            <v-chip to="/profile" prepend-icon="mdi-plus" variant="outlined" label>
              {{ t('add.labels.create') }}
            </v-chip>
          </div>
        </v-col>

        <v-col cols="12" class="mt-2">
          <v-textarea
            v-model="form.description"
            :label="t('add.description.label')"
            :placeholder="t('add.description.placeholder')"
            :rules="descriptionRules"
            prepend-inner-icon="mdi-text"
            variant="outlined"
            rows="3"
            auto-grow
          />
        </v-col>

        <v-col v-if="stillSaving" cols="12">
          <v-alert type="info" variant="tonal" density="compact" role="status">
            {{ t('add.stillSaving') }}
          </v-alert>
        </v-col>
        <v-col v-if="saveFailed" cols="12">
          <v-alert type="error" variant="tonal" density="compact">
            {{ t('add.saveFailed') }}
          </v-alert>
        </v-col>

        <v-col cols="12">
          <v-btn type="submit" color="primary" size="large" :loading="saving" block>
            {{ t('add.submit') }}
          </v-btn>
        </v-col>
      </v-row>
    </v-form>
  </v-container>
</template>

<style scoped>
.add-task {
  max-width: 760px;
}
/*
 * A selected label chip shows the label's own colour: the check mark and the solid fill already
 * say it is selected. The chip group's selected overlay would tint it with the text colour,
 * changing the label's colour and lowering the text's contrast on it. Hover and keyboard focus
 * keep their overlay, so a selected chip still shows where the pointer and the focus are.
 */
.label-choice.v-chip--selected:not(:hover, :focus-visible) > :deep(.v-chip__overlay) {
  opacity: 0;
}
</style>
