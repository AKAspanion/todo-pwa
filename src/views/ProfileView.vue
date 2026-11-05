<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useTemplateRef,
  watch,
  type ComponentPublicInstance,
} from 'vue';
import { useI18n } from 'vue-i18n';
import AccountSection from '@/components/profile/AccountSection.vue';
import { vFocusOnMount } from '@/directives/focusOnMount';
import { authErrorCode, authErrorKey } from '@/lib/authForm';
import { consumeRedirectResult, updateDisplayName } from '@/services/auth';
import { httpsPhotoUrl } from '@/lib/photo';
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

/** The provider's photo, only when it is an https URL (`httpsPhotoUrl`). */
const photoUrl = computed(() => httpsPhotoUrl(session.user?.photoURL) ?? undefined);

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

// Back from Google's re-confirmation (D4)

const accountSection = useTemplateRef<InstanceType<typeof AccountSection>>('accountSection');

/**
 * D4: a load that Google's redirect brought back. A re-authentication of the signed-in user opens
 * the delete dialog confirmed; a refusal opens it unconfirmed with the reason. A sign-in, or a
 * result for another user, opens nothing. The result is read once, so a later load finds none.
 */
onMounted(async () => {
  try {
    const outcome = await consumeRedirectResult();
    const uid = session.user?.uid;
    if (outcome?.operation === 'reauthenticate' && uid && outcome.user.uid === uid) {
      accountSection.value?.openDialog(true, null);
    }
  } catch (error) {
    const code = authErrorCode(error);
    console.warn('[profile] Google re-confirmation failed:', code || 'unknown');
    const key = code === 'auth/user-mismatch' ? 'profile.delete.userMismatch' : authErrorKey(error);
    if (key) accountSection.value?.openDialog(false, key);
  }
});
</script>

<template>
  <div class="profile">
    <v-card flat tile class="old-app-card">
      <div class="old-app-wrapper">
        <div class="old-app-elevated" style="height: calc(224px - 30px)"></div>
        <div class="old-app-bg bg-primary" style="height: 224px"></div>
        <div class="old-app-content">
          <div class="pt-2 pb-4 d-flex justify-center">
            <v-avatar size="110" class="profile__avatar" aria-hidden="true">
              <v-img v-if="photoUrl" :src="photoUrl" cover />
              <template v-else>
                <span v-if="initials" class="profile__initials">{{ initials }}</span>
                <v-icon v-else icon="mdi-face-man" color="primary" />
              </template>
            </v-avatar>
          </div>

          <div v-if="!editingName" class="profile__row profile__name-row mb-n2">
            <h1 class="profile__name text-white">{{ displayName }}</h1>
            <v-btn
              ref="editButton"
              icon="mdi-pencil"
              variant="text"
              size="small"
              class="profile__edit text-white"
              :aria-label="t('profile.name.edit')"
              @click="startNameEdit"
            />
          </div>
          <template v-else>
            <h1 class="d-sr-only">{{ displayName }}</h1>
            <form
              class="profile__row profile__name-row mb-n2"
              @submit.prevent="saveName"
              @keydown.esc="cancelNameEdit"
            >
              <v-text-field
                v-model="nameDraft"
                v-focus-on-mount
                theme="light"
                class="profile__name-field"
                :aria-label="t('profile.name.field')"
                :readonly="nameSaving"
                variant="solo"
                density="compact"
                hide-details
                single-line
              >
                <template #append-inner>
                  <v-btn
                    icon="mdi-close"
                    variant="text"
                    size="x-small"
                    style="color: rgba(0, 0, 0, 0.54)"
                    :disabled="nameSaving"
                    :aria-label="t('profile.name.cancel')"
                    @click="cancelNameEdit"
                  />
                </template>
              </v-text-field>
              <v-btn
                type="submit"
                icon="mdi-check"
                variant="text"
                size="small"
                class="profile__check mx-2 text-white"
                :loading="nameSaving"
                :aria-label="t('profile.name.save')"
              />
            </form>
            <v-alert
              v-if="nameError"
              type="error"
              density="compact"
              class="profile__note mt-2 mx-auto text-start"
              :text="t(nameError)"
            />
            <v-alert
              v-else-if="nameStill.still.value"
              type="info"
              density="compact"
              class="profile__note mt-2 mx-auto text-start"
              :text="t('profile.stillSaving')"
            />
          </template>

          <div class="text-subtitle-2 mt-3 text-white profile__email">{{ email }}</div>

          <div class="d-flex justify-center">
            <div class="profile__labels mt-6">
              <h2
                id="profile-labels-heading"
                class="profile__label-heading text-overline text-left py-3"
              >
                {{ t('profile.labels.heading') }}
              </h2>
              <v-card variant="outlined" class="profile__card">
                <form class="profile__create profile__row" novalidate @submit.prevent="addLabel">
                  <v-btn
                    type="submit"
                    icon="mdi-plus-circle"
                    variant="text"
                    :color="labelColor"
                    :loading="labelSaving"
                    :ripple="false"
                    class="profile__add"
                    :aria-label="t('profile.labels.add')"
                  />
                  <v-text-field
                    v-model="labelName"
                    class="profile__label-field"
                    :aria-label="t('profile.labels.create')"
                    :placeholder="t('profile.labels.create')"
                    :readonly="labelSaving"
                    :error-messages="labelErrorText"
                    :messages="labelStill.still.value ? t('profile.stillSaving') : undefined"
                    variant="solo"
                    flat
                    density="compact"
                    bg-color="transparent"
                    hide-details="auto"
                    single-line
                    @update:model-value="labelError = null"
                  />
                  <span class="profile__palette">
                    <v-icon icon="mdi-palette" :color="labelColor" />
                    <input
                      v-model="labelColor"
                      type="color"
                      class="profile__color"
                      :aria-label="t('profile.labels.color')"
                      :disabled="labelSaving"
                    />
                  </span>
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
                  <div v-for="i in 3" :key="i" class="d-flex align-center px-6 py-4">
                    <div class="animate icon-shimmer"></div>
                    <div class="animate title-shimmer ml-11" style="width: 50%"></div>
                  </div>
                </div>
                <v-list
                  v-else-if="labels.labels.length > 0"
                  aria-labelledby="profile-labels-heading"
                  class="pa-0"
                  bg-color="transparent"
                >
                  <v-list-item v-for="label in labels.labels" :key="label.id" class="profile__item">
                    <template #prepend>
                      <v-icon icon="mdi-label" :color="label.color" class="profile__label-icon" />
                    </template>
                    <span class="profile__label-name">{{ label.label }}</span>
                  </v-list-item>
                </v-list>
              </v-card>
            </div>
          </div>

          <!-- D1: the Account card, below the labels, as wide as they are. -->
          <div class="d-flex justify-center">
            <AccountSection ref="accountSection" class="profile__labels pt-0" />
          </div>
        </div>
      </div>
    </v-card>
  </div>
</template>

<!-- The old Profile: a colour band with the avatar, name and email, the labels in an outlined card. -->
<style scoped>
.profile__avatar {
  background: #fff;
  color: rgba(0, 0, 0, 0.87);
}
.v-theme--dark .profile__avatar {
  background: #404040;
  color: #fff;
}
.profile__avatar :deep(.v-icon) {
  font-size: 24px;
}
.profile__initials {
  font-size: 2.125rem;
  font-weight: 500;
  line-height: 2.5rem;
  letter-spacing: 0.0073529412em;
}
.profile__row {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
}
/* The old row ran 32px past the right edge, where its hidden pencil sat, so the name stayed centred. */
.profile__name-row {
  margin-right: -32px;
}
.profile__name {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 500;
  line-height: 2rem;
  letter-spacing: 0.0125em;
  overflow-wrap: anywhere;
}
.profile__edit {
  width: 32px;
  height: 32px;
  margin: 0 0 0 0;
}
.profile__check {
  flex: none;
  width: 24px;
  height: 24px;
}
.profile__item :deep(.v-list-item__spacer) {
  width: 0;
}
.profile__name-field {
  flex: 0 1 300px;
  max-width: 300px;
}
.profile__email {
  overflow-wrap: anywhere;
}
.profile__note {
  max-width: 360px;
}
.profile__labels {
  width: 100%;
  max-width: 500px;
  padding: 16px;
}
.profile__card {
  padding: 8px 0;
  border-color: rgba(var(--v-border-color), var(--v-border-opacity));
  text-align: left;
}
.profile__create {
  padding: 0 16px;
  align-items: flex-start;
  justify-content: flex-start;
  min-height: 56px;
}
.profile__add {
  opacity: 1;
  margin-top: 8px;
  flex: none;
  width: 40px;
  height: 40px;
  margin-right: 28px;
}
.profile__label-field {
  flex: 1 1 auto;
  min-width: 0;
  margin-top: 8px;
}
.profile__label-field :deep(.v-input__details) {
  padding-inline: 0;
}
.profile__label-field :deep(.v-field__input) {
  padding-inline: 0;
}
.profile__palette {
  position: relative;
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-top: 14px;
  border-radius: 50%;
}
.profile__palette:focus-within {
  outline: 2px solid currentColor;
}
.profile__color {
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  padding: 0;
  border: none;
  opacity: 0;
  cursor: pointer;
}
.profile__item.v-list-item {
  min-height: 56px;
  padding: 0 16px;
}
.profile__label-heading {
  margin: 0;
}
.profile__label-icon {
  opacity: 1;
  width: 40px;
  margin-right: 28px;
}
.profile__label-name {
  font-size: 0.875rem;
}
</style>
