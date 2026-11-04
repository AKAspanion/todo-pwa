<script setup lang="ts">
/**
 * Edits a task in place. The fields start from the task once and are never reset from props, so
 * a save in flight or a failed save keeps everything the user typed (D7). It emits only the
 * editable fields; a label id with no matching label (a deleted label) is kept as it is (D6).
 */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import DateField from '@/components/fields/DateField.vue';
import TimeField from '@/components/fields/TimeField.vue';
import { vFocusOnMount } from '@/directives/focusOnMount';
import { todayYmd } from '@/lib/dates';
import type { Label, Task, TaskInput } from '@/types/models';
import { safeColor, textColorFor } from './labels';

const props = withDefaults(
  defineProps<{
    task: Task;
    labels: Label[];
    saving: boolean;
    error: string | null;
    /** The card's text colour (black or white), which the form's icons and text share. */
    ink?: string;
    /** A phone-width screen, where the old card was tighter. */
    xs?: boolean;
  }>(),
  { ink: '#000000', xs: false },
);
const emit = defineEmits<{ submit: [patch: Partial<TaskInput>]; cancel: [] }>();

const { t } = useI18n();

const title = ref(props.task.title);
const description = ref(props.task.description);
const indefinite = ref(props.task.indefinite);
const date = ref(props.task.date ?? todayYmd());
const time = ref(props.task.time ?? '');
const selectedLabelIds = ref<string[]>([...props.task.labelIds]);
const showErrors = ref(false);

const titleError = computed(() =>
  showErrors.value && title.value.trim() === '' ? t('tasks.form.titleRequired') : '',
);
const dateError = computed(() =>
  showErrors.value && !indefinite.value && !date.value ? t('tasks.form.dateRequired') : '',
);

/** The task's label ids in their stored order, less the known ones unselected, plus new picks. */
function labelIdsToSave(): string[] {
  const known = new Set(props.labels.map((label) => label.id));
  const selected = new Set(selectedLabelIds.value);
  const kept = props.task.labelIds.filter((id) => !known.has(id) || selected.has(id));
  const added = selectedLabelIds.value.filter((id) => known.has(id) && !kept.includes(id));
  return [...kept, ...added];
}

function onSubmit(): void {
  if (props.saving) return;
  showErrors.value = true;
  if (titleError.value || dateError.value) return;
  emit('submit', {
    title: title.value.trim(),
    description: description.value,
    indefinite: indefinite.value,
    date: indefinite.value ? null : date.value,
    time: indefinite.value || !time.value ? null : time.value,
    labelIds: labelIdsToSave(),
  });
}
</script>

<template>
  <form
    class="task-edit-form"
    novalidate
    :aria-label="t('tasks.form.label')"
    :aria-busy="saving"
    @submit.prevent="onSubmit"
  >
    <div class="task-edit-form__body" :class="xs ? 'task-edit-form__body--xs' : ''">
      <v-text-field
        v-model="title"
        v-focus-on-mount
        name="title"
        :aria-label="t('tasks.form.title')"
        :readonly="saving"
        :error-messages="titleError"
        density="compact"
        variant="solo"
        bg-color="#ffffff"
        flat
        class="task-edit-form__title"
      />
      <v-textarea
        v-model="description"
        name="description"
        :aria-label="t('tasks.form.description')"
        :readonly="saving"
        density="compact"
        variant="solo"
        bg-color="#ffffff"
        flat
        rows="5"
        auto-grow
        hide-details
        class="task-edit-form__description"
      />

      <fieldset class="task-edit-form__labels">
        <legend class="task-edit-form__legend">{{ t('tasks.form.labels') }}</legend>
        <div class="task-edit-form__type-card">
          <v-chip-group
            v-if="labels.length"
            v-model="selectedLabelIds"
            multiple
            column
            :disabled="saving"
          >
            <v-chip
              v-for="label in labels"
              :key="label.id"
              :value="label.id"
              :color="safeColor(label.color)"
              :style="{
                backgroundColor: safeColor(label.color),
                color: textColorFor(safeColor(label.color)),
              }"
              variant="flat"
              :data-label-id="label.id"
              class="label-choice"
              size="small"
              filter
              label
            >
              {{ label.label }}
            </v-chip>
          </v-chip-group>
          <p v-else class="task-edit-form__none">{{ t('tasks.form.noLabels') }}</p>
        </div>
      </fieldset>

      <div class="task-edit-form__when">
        <TimeField
          v-model="time"
          name="time"
          :label="t('tasks.form.time')"
          :disabled="indefinite"
          :readonly="saving"
          density="compact"
          variant="solo"
          single-line
          old-format
          flat
          bg-color="#ffffff"
        />
        <DateField
          v-model="date"
          name="date"
          :label="t('tasks.form.date')"
          :disabled="indefinite"
          :readonly="saving"
          :error-messages="dateError"
          density="compact"
          variant="solo"
          single-line
          old-format
          flat
          bg-color="#ffffff"
        />
      </div>

      <v-switch
        v-model="indefinite"
        name="indefinite"
        :label="t('tasks.form.indefinite')"
        :readonly="saving"
        color="primary"
        density="compact"
        hide-details
        class="task-edit-form__switch"
      />

      <v-alert
        v-if="error"
        type="error"
        variant="flat"
        density="compact"
        data-testid="save-error"
        class="mt-3"
        :text="error"
      />
    </div>

    <v-divider />
    <div class="task-edit-form__actions" :class="xs ? 'task-edit-form__actions--xs' : ''">
      <v-btn
        data-testid="edit-cancel"
        icon
        variant="text"
        :size="xs ? 28 : 36"
        :color="ink"
        :aria-label="t('tasks.form.cancel')"
        :disabled="saving"
        @click="emit('cancel')"
      >
        <v-icon icon="mdi-close" />
      </v-btn>
      <v-spacer />
      <v-btn
        data-testid="edit-save"
        type="submit"
        icon
        variant="text"
        :size="xs ? 28 : 36"
        :color="ink"
        :aria-label="t('tasks.form.save')"
        :loading="saving"
      >
        <v-icon icon="mdi-check" />
      </v-btn>
    </div>
  </form>
</template>

<!--
  The old card's edit mode: white solo fields on the card's own colour, the labels in a tinted
  strip, the time and date side by side, then a row with a cross and a tick.
-->
<style scoped>
.task-edit-form__body {
  padding: 16px 16px 0;
}
.task-edit-form__body--xs {
  padding: 12px 12px 0;
}
.task-edit-form__body :deep(input) {
  font-size: 16px;
}
.task-edit-form__body :deep(textarea) {
  font-size: 14px;
  margin-top: 4px;
}
.task-edit-form__description {
  margin-top: 4px;
}
.task-edit-form__labels {
  border: 0;
  margin: 8px 0 0;
  padding: 0;
  min-width: 0;
}
.task-edit-form__legend {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
.task-edit-form__type-card {
  padding: 0 12px;
  border-radius: 4px;
  background-color: rgba(24, 15, 15, 0.06);
  transition: background-color 0.3s ease;
}
.task-edit-form__type-card:hover {
  background-color: rgba(0, 0, 0, 0.1);
}
.task-edit-form__none {
  margin: 0;
  padding: 8px 0;
  font-size: 0.75rem;
  color: rgb(var(--v-theme-warning));
}
.task-edit-form__when {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 12px;
  margin-top: 16px;
}
.task-edit-form__switch {
  margin-left: 4px;
}
.task-edit-form__switch :deep(.v-selection-control) {
  flex-direction: row-reverse;
  justify-content: space-between;
}
.task-edit-form__switch :deep(.v-label) {
  opacity: 1;
  padding-inline-start: 0;
}
.task-edit-form__actions {
  display: flex;
  align-items: center;
  min-height: 52px;
  padding: 8px 16px;
}
.task-edit-form__actions--xs {
  min-height: 36px;
  padding: 0 12px;
}
@media (max-width: 600px) {
  .task-edit-form__body :deep(textarea) {
    font-size: 12px;
    margin-top: 2px;
  }
  .task-edit-form__body :deep(input) {
    font-size: 14px;
  }
}
</style>
