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
import { safeColor } from './labels';

const props = defineProps<{ task: Task; labels: Label[]; saving: boolean; error: string | null }>();
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
    class="task-edit-form pa-3"
    novalidate
    :aria-label="t('tasks.form.label')"
    :aria-busy="saving"
    @submit.prevent="onSubmit"
  >
    <v-text-field
      v-model="title"
      v-focus-on-mount
      name="title"
      :label="t('tasks.form.title')"
      :readonly="saving"
      :error-messages="titleError"
      density="compact"
      variant="outlined"
    />
    <v-textarea
      v-model="description"
      name="description"
      :label="t('tasks.form.description')"
      :readonly="saving"
      density="compact"
      variant="outlined"
      rows="2"
      auto-grow
      hide-details
      class="mb-3"
    />

    <fieldset class="task-edit-form__labels mb-2">
      <legend class="text-label-medium mb-1">{{ t('tasks.form.labels') }}</legend>
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
          :variant="selectedLabelIds.includes(label.id) ? 'flat' : 'tonal'"
          :data-label-id="label.id"
          class="label-choice"
          size="small"
          filter
          label
        >
          {{ label.label }}
        </v-chip>
      </v-chip-group>
      <p v-else class="text-body-small text-medium-emphasis">{{ t('tasks.form.noLabels') }}</p>
    </fieldset>

    <v-switch
      v-model="indefinite"
      name="indefinite"
      :label="t('tasks.form.indefinite')"
      :readonly="saving"
      color="primary"
      density="compact"
      hide-details
      inset
    />
    <div class="task-edit-form__when">
      <DateField
        v-model="date"
        name="date"
        :label="t('tasks.form.date')"
        :disabled="indefinite"
        :readonly="saving"
        :error-messages="dateError"
        density="compact"
      />
      <TimeField
        v-model="time"
        name="time"
        :label="t('tasks.form.time')"
        :disabled="indefinite"
        :readonly="saving"
        density="compact"
        clearable
      />
    </div>

    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      density="compact"
      data-testid="save-error"
      class="mb-3"
      :text="error"
    />

    <div class="d-flex justify-end ga-2">
      <v-btn data-testid="edit-cancel" variant="text" :disabled="saving" @click="emit('cancel')">
        {{ t('tasks.form.cancel') }}
      </v-btn>
      <v-btn data-testid="edit-save" type="submit" color="primary" variant="flat" :loading="saving">
        {{ t('tasks.form.save') }}
      </v-btn>
    </div>
  </form>
</template>

<style scoped>
.task-edit-form__labels {
  border: 0;
  margin: 0;
  padding: 0;
  min-width: 0;
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
.task-edit-form__when {
  display: grid;
  /* Side by side when the card is wide enough for a long date, else one above the other. */
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  column-gap: 8px;
}
</style>
