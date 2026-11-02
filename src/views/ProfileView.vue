<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch, type ComponentPublicInstance } from 'vue';
import { useI18n } from 'vue-i18n';
import { vFocusOnMount } from '@/directives/focusOnMount';
import { updateDisplayName } from '@/services/auth';
import { LABEL_NAME_MAX } from '@/services/labels';
import { useLabelsStore } from '@/stores/labels';
import { errorCode, useSessionStore } from '@/stores/session';

/**
 * A save never times out or retries (a timeout risks a duplicate write): after this long without
 * an answer, the form says it is still saving, and keeps waiting.
 */
const STILL_SAVING_AFTER_MS = 15_000;
/** A fixed first colour, so the screen looks the same on every visit. */
const DEFAULT_LABEL_COLOR = '#8E00FF';

const { t } = useI18n();
const session = useSessionStore();
const labels = useLabelsStore();

/** Characters as a person counts them (code points), as the labels service counts them. */
const length = (value: string): number => [...value].length;

/** A `still` flag that turns on once a save has run for STILL_SAVING_AFTER_MS. */
function useStillSaving() {
  const still = ref(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  function stop(): void {
    clearTimeout(timer);
    timer = undefined;
    still.value = false;
  }
  function start(): void {
    stop();
    timer = setTimeout(() => {
      still.value = true;
    }, STILL_SAVING_AFTER_MS);
  }
  onBeforeUnmount(stop);
  return { still, start, stop };
}

// The user

const displayName = computed(() => session.user?.displayName || t('profile.na'));
const email = computed(() => session.user?.email || t('profile.na'));

/** First letters of the first and last words of the name, such as "AP" for "Ankit Pandit". */
const initials = computed(() => {
  const words = (session.user?.displayName ?? '').trim().split(/\s+/).filter(Boolean);
  const first = words[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1] ?? '') : '';
  return `${[...first][0] ?? ''}${[...last][0] ?? ''}`.toUpperCase();
});

/** The provider's photo, only when it is an https URL. */
const photoUrl = computed(() => {
  const raw = session.user?.photoURL;
  if (!raw) return undefined;
  try {
    return new URL(raw).protocol === 'https:' ? raw : undefined;
  } catch {
    return undefined;
  }
});

// Editing the name

const editingName = ref(false);
const nameDraft = ref('');
const nameSaving = ref(false);
/** The locale key of the last save's error, or null. */
const nameError = ref<string | null>(null);
const nameStill = useStillSaving();
const editButton = ref<ComponentPublicInstance | null>(null);

async function focusEditButton(): Promise<void> {
  await nextTick();
  (editButton.value?.$el as HTMLElement | undefined)?.focus();
}

function startNameEdit(): void {
  nameDraft.value = session.user?.displayName ?? '';
  nameError.value = null;
  editingName.value = true;
}

function cancelNameEdit(): void {
  if (nameSaving.value) return;
  editingName.value = false;
  nameError.value = null;
  void focusEditButton();
}

/** Saves the trimmed name. On failure the field stays open with the typed name and the error. */
async function saveName(): Promise<void> {
  if (nameSaving.value) return;
  const uid = session.user?.uid;
  const name = nameDraft.value.trim();
  nameSaving.value = true;
  nameError.value = null;
  nameStill.start();
  try {
    await updateDisplayName(name);
    // Firebase reports no auth-state change for a profile update, so the session's snapshot of
    // the user is updated here, and the header shows the new name without a reload.
    if (session.user && session.user.uid === uid) session.user.displayName = name;
    editingName.value = false;
    void focusEditButton();
  } catch (error) {
    console.warn('[profile] name update failed:', errorCode(error));
    nameError.value = 'profile.name.error';
  } finally {
    nameSaving.value = false;
    nameStill.stop();
  }
}

// Labels

const labelName = ref('');
const labelColor = ref(DEFAULT_LABEL_COLOR);
const labelSaving = ref(false);
const labelError = ref<'required' | 'tooLong' | 'failed' | null>(null);
const labelStill = useStillSaving();

const labelErrorText = computed(() => {
  switch (labelError.value) {
    case 'required':
      return t('profile.labels.required');
    case 'tooLong':
      return t('profile.labels.tooLong', { max: LABEL_NAME_MAX });
    case 'failed':
      return t('profile.labels.error');
    default:
      return undefined;
  }
});

/** Creates a label from the trimmed name: 1–30 characters (D15). A failed save keeps the input. */
async function addLabel(): Promise<void> {
  if (labelSaving.value) return;
  const name = labelName.value.trim();
  if (length(name) < 1) {
    labelError.value = 'required';
    return;
  }
  if (length(name) > LABEL_NAME_MAX) {
    labelError.value = 'tooLong';
    return;
  }
  labelSaving.value = true;
  labelError.value = null;
  labelStill.start();
  try {
    await labels.add(name, labelColor.value);
    labelName.value = '';
  } catch (error) {
    console.warn('[profile] label create failed:', errorCode(error));
    labelError.value = 'failed';
  } finally {
    labelSaving.value = false;
    labelStill.stop();
  }
}

watch(
  () => session.user?.uid,
  (uid) => {
    if (uid) void labels.load();
  },
  { immediate: true },
);
</script>

<template>
  <div class="profile">
    <v-sheet color="primary" class="profile-header text-center px-4 pt-6 pb-8">
      <v-avatar size="96" color="surface" :image="photoUrl" aria-hidden="true">
        <template v-if="!photoUrl">
          <span v-if="initials" class="text-h4 text-primary">{{ initials }}</span>
          <v-icon v-else icon="mdi-face" color="primary" size="48" />
        </template>
      </v-avatar>

      <div v-if="!editingName" class="d-flex align-center justify-center ga-1 mt-4">
        <h1 class="text-h6 profile-name">{{ displayName }}</h1>
        <v-btn
          ref="editButton"
          icon="mdi-pencil"
          variant="text"
          size="small"
          :aria-label="t('profile.name.edit')"
          @click="startNameEdit"
        />
      </div>
      <template v-else>
        <h1 class="d-sr-only">{{ displayName }}</h1>
        <form
          class="name-form d-flex align-center ga-1 mt-4 mx-auto"
          @submit.prevent="saveName"
          @keydown.esc="cancelNameEdit"
        >
          <v-text-field
            v-model="nameDraft"
            v-focus-on-mount
            :label="t('profile.name.field')"
            :readonly="nameSaving"
            variant="solo"
            density="compact"
            bg-color="surface"
            hide-details
          />
          <v-btn
            type="submit"
            icon="mdi-check"
            variant="text"
            :loading="nameSaving"
            :aria-label="t('profile.name.save')"
          />
          <v-btn
            icon="mdi-close"
            variant="text"
            :disabled="nameSaving"
            :aria-label="t('profile.name.cancel')"
            @click="cancelNameEdit"
          />
        </form>
        <v-alert
          v-if="nameError"
          type="error"
          density="compact"
          class="name-form mt-2 mx-auto text-start"
          :text="t(nameError)"
        />
        <v-alert
          v-else-if="nameStill.still.value"
          type="info"
          density="compact"
          class="name-form mt-2 mx-auto text-start"
          :text="t('profile.stillSaving')"
        />
      </template>

      <p class="text-subtitle-2 mt-2 profile-email">{{ email }}</p>
    </v-sheet>

    <v-container class="labels">
      <h2 id="profile-labels-heading" class="text-overline">{{ t('profile.labels.heading') }}</h2>
      <v-card variant="outlined">
        <form class="d-flex align-start ga-2 pa-3" novalidate @submit.prevent="addLabel">
          <input
            v-model="labelColor"
            type="color"
            class="label-color mt-1"
            :aria-label="t('profile.labels.color')"
            :disabled="labelSaving"
          />
          <v-text-field
            v-model="labelName"
            :label="t('profile.labels.create')"
            :readonly="labelSaving"
            :error-messages="labelErrorText"
            :messages="labelStill.still.value ? t('profile.stillSaving') : undefined"
            variant="outlined"
            density="compact"
            @update:model-value="labelError = null"
          />
          <v-btn
            type="submit"
            icon="mdi-plus"
            variant="text"
            :color="labelColor"
            :loading="labelSaving"
            :aria-label="t('profile.labels.add')"
          />
        </form>

        <v-alert
          v-if="labels.error"
          type="error"
          variant="tonal"
          density="compact"
          class="mx-3 mb-3"
          :text="t('profile.labels.loadError')"
        >
          <template #append>
            <v-btn variant="text" :loading="labels.loading" @click="labels.load()">
              {{ t('profile.labels.retry') }}
            </v-btn>
          </template>
        </v-alert>

        <div v-if="labels.loading && labels.labels.length === 0">
          <v-skeleton-loader v-for="i in 3" :key="i" type="list-item-avatar" />
        </div>
        <v-list
          v-else-if="labels.labels.length > 0"
          aria-labelledby="profile-labels-heading"
          density="compact"
        >
          <v-list-item v-for="label in labels.labels" :key="label.id" :title="label.label">
            <template #prepend>
              <v-icon icon="mdi-label" :color="label.color" />
            </template>
          </v-list-item>
        </v-list>
      </v-card>
    </v-container>
  </div>
</template>

<style scoped>
.profile-name,
.profile-email {
  overflow-wrap: anywhere;
}

.name-form {
  max-width: 360px;
}

.labels {
  max-width: 500px;
}

.label-color {
  inline-size: 32px;
  block-size: 32px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: none;
  cursor: pointer;
  flex: none;
}

.label-color::-webkit-color-swatch-wrapper {
  padding: 0;
}

.label-color::-webkit-color-swatch {
  border: none;
  border-radius: 50%;
}
</style>
