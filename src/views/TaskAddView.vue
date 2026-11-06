<script setup lang="ts">
/**
 * The add-task screen (spec §3.2): a title, a Markdown description, a local date and time or
 * "indefinite", and any of the user's labels. Dates are the device's local calendar days (D1);
 * the store derives the time zone and reminder fields on save (P6).
 *
 * A save never times out or retries (a timeout risks a duplicate write): the form keeps its input
 * in a saving state, says so after 15 s without an answer, and says so in the snackbar, as the old
 * app did, when the save is rejected (Review Focus 1). Laid out as the old app's TaskAdd was
 * (restore-original-design §4.3).
 */
import dayjs from 'dayjs';
import { onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import type { VForm } from 'vuetify/components';
import DateField from '@/components/fields/DateField.vue';
import TimeField from '@/components/fields/TimeField.vue';
import { safeColor, textColorFor } from '@/components/tasks/labels';
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
const { mdAndUp } = useDisplay();

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
let stillSavingTimer: ReturnType<typeof setTimeout> | undefined;
let left = false;

/** Characters as a person counts them (code points), as the rules count them. */
const length = (value: string): number => [...value].length;

const titleRules = [
  (v: string) => v !== '' || t('add.title.required'),
  (v: string) => v.trim() !== '' || t('add.title.blank'),
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
  } else {
    // The old app said so in its snackbar; the form stays as it was, filled.
    ui.showSnack(t('add.saveFailed'));
  }
}

onBeforeUnmount(() => {
  left = true;
  clearTimeout(stillSavingTimer);
});
</script>

<template>
  <div class="add-task">
    <v-form ref="formRef" :readonly="saving" @submit.prevent="submit">
      <div class="add-task__grid">
        <v-text-field
          v-model="form.title"
          v-focus-on-mount
          class="add-task__title"
          :aria-label="t('add.title.label')"
          :placeholder="t('add.title.placeholder')"
          :rules="titleRules"
          :density="mdAndUp ? 'default' : 'compact'"
          prepend-inner-icon="mdi-format-title"
          variant="outlined"
          single-line
        />

        <TimeField
          v-model="form.time"
          :disabled="form.indefinite"
          :readonly="saving"
          :density="mdAndUp ? 'default' : 'compact'"
          old-format
          single-line
        />

        <DateField
          v-model="form.date"
          :disabled="form.indefinite"
          :readonly="saving"
          :density="mdAndUp ? 'default' : 'compact'"
          old-format="long"
          single-line
        />

        <div class="add-task__labels">
          <v-icon icon="mdi-label" class="add-task__labels-icon" />
          <div class="add-task__labels-body" role="group" :aria-label="t('add.labels.label')">
            <div
              v-if="labels.loading && labels.labels.length === 0"
              class="animate label-shimmer"
              role="status"
              :aria-label="t('add.labels.loading')"
            />
            <template v-else-if="labels.error && labels.labels.length === 0">
              <span class="text-body-medium text-error">{{ t('add.labels.loadFailed') }}</span>
              <v-btn size="small" variant="text" color="primary" @click="labels.load()">
                {{ t('add.labels.retry') }}
              </v-btn>
            </template>
            <v-chip-group v-else v-model="form.labelIds" :disabled="saving" multiple>
              <v-chip
                v-for="label in labels.labels"
                :key="label.id"
                :value="label.id"
                :color="safeColor(label.color)"
                :style="{
                  backgroundColor: safeColor(label.color),
                  color: textColorFor(safeColor(label.color)),
                }"
                :size="mdAndUp ? 'default' : 'small'"
                :data-label-id="label.id"
                class="label-choice"
                variant="flat"
                filter
                label
              >
                {{ label.label }}
              </v-chip>
              <v-chip
                to="/profile"
                :size="mdAndUp ? 'default' : 'small'"
                :aria-label="t('add.labels.create')"
                class="add-task__create"
                variant="flat"
                label
              >
                <v-icon icon="mdi-plus-circle" size="small" color="primary" />
              </v-chip>
            </v-chip-group>
            <span
              v-if="!labels.loading && labels.labels.length === 0 && !labels.error"
              class="add-task__none"
            >
              {{ t('add.labels.none') }}
            </span>
          </div>
        </div>

        <v-textarea
          v-model="form.description"
          class="add-task__description"
          :aria-label="t('add.description.label')"
          :placeholder="t('add.description.placeholder')"
          :rules="descriptionRules"
          :density="mdAndUp ? 'default' : 'compact'"
          prepend-inner-icon="mdi-card-text"
          variant="outlined"
          hide-details="auto"
          single-line
          rows="1"
          auto-grow
        />

        <v-switch
          v-model="form.indefinite"
          class="add-task__indefinite"
          :label="t('add.indefinite')"
          color="primary"
          hide-details
        />

        <v-alert
          v-if="stillSaving"
          class="add-task__wide"
          type="info"
          variant="tonal"
          density="compact"
          role="status"
        >
          {{ t('add.stillSaving') }}
        </v-alert>

        <v-btn
          class="add-task__wide"
          type="submit"
          color="primary"
          size="large"
          :loading="saving"
          block
        >
          {{ t('add.submit') }}
        </v-btn>
      </div>
    </v-form>
  </div>
</template>

<!-- The old TaskAdd: one flat page of outlined fields, the labels in a bordered strip. -->
<style scoped>
.add-task {
  padding: 24px 20px 12px;
}
.add-task__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  column-gap: 16px;
}
.add-task__labels,
.add-task__description,
.add-task__indefinite,
.add-task__wide {
  grid-column: 1 / -1;
}
/* The title, time and date keep a line under them for their message; 12 px more below it, so an
   error doesn't touch the field under it (as sign-in's fields do). Time and date render through a
   menu with no single root, so a class can't reach their field: they are matched as the grid's
   text fields, the description's textarea aside. */
.add-task__grid > :deep(.v-text-field:not(.v-textarea)) {
  margin-bottom: 12px;
}
.add-task__labels {
  display: flex;
  align-items: center;
  min-height: 36px;
  padding: 0 12px;
  margin-bottom: 28px;
  border: 1px solid rgba(0, 0, 0, 0.24);
  border-radius: 4px;
}
.v-theme--dark .add-task__labels {
  border-color: rgb(192, 192, 192);
}
.add-task__labels:focus-within {
  margin: -1px -1px 27px;
  border: 2px solid rgb(var(--v-theme-primary));
}
.add-task__labels:focus-within .add-task__labels-icon {
  color: rgb(var(--v-theme-primary));
}
.add-task__labels-icon {
  margin-right: 12px;
}
.add-task__labels-body {
  display: flex;
  flex: 1;
  align-items: center;
  min-width: 0;
}
.add-task__none {
  font-size: 0.75rem;
  opacity: 0.7;
}
.add-task__create {
  background: rgba(0, 0, 0, 0.12);
}
.v-theme--dark .add-task__create {
  background: rgba(255, 255, 255, 0.24);
}
.add-task__description {
  margin-bottom: 20px;
}
.add-task__description :deep(.v-field__prepend-inner) {
  align-items: flex-start;
  padding-top: 8px;
}
.add-task__indefinite {
  margin-bottom: 32px;
}
.add-task__indefinite :deep(.v-selection-control) {
  flex-direction: row-reverse;
  justify-content: flex-end;
}
.add-task__indefinite {
  display: flex;
  justify-content: flex-end;
  min-height: 36px;
}
.add-task__description :deep(.v-field) {
  min-height: 124px;
}
.add-task__indefinite :deep(.v-label) {
  opacity: 1;
  padding-inline-end: 8px;
  padding-inline-start: 0;
  font-size: 0.875rem;
  font-weight: 500;
}
.add-task :deep(input) {
  font-size: 16px;
}
.add-task :deep(textarea) {
  margin-top: 4px;
}
@media (max-width: 599.98px) {
  .add-task :deep(.v-input) {
    --v-input-control-height: 36px;
  }
  .add-task :deep(input),
  .add-task :deep(textarea) {
    font-size: 13px;
  }
}
@media (min-width: 600px) {
  .add-task__indefinite {
    margin-bottom: 24px;
  }
  .add-task {
    padding: 24px 32px 12px;
  }
  .add-task__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .add-task__title {
    grid-column: 1 / -1;
  }
}
@media (min-width: 960px) {
  .add-task__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .add-task__title {
    grid-column: auto;
  }
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
