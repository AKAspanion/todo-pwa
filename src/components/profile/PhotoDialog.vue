<script setup lang="ts">
/**
 * Sets or removes the profile photo's link. Only an https link is accepted, since the photo is
 * shown only over https (`httpsPhotoUrl`); an empty link removes the photo. A failed save keeps
 * the dialog and the link as typed. Saves never time out (decisions/saves-never-time-out).
 */
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { isHttpsUrl } from '@/lib/photo';
import { updatePhotoUrl } from '@/services/auth';
import { errorCode, useSessionStore } from '@/stores/session';

/** A link longer than this is no photo link anyone types. */
const PHOTO_URL_MAX = 2048;

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const session = useSessionStore();

const link = ref('');
const saving = ref(false);
/** The locale key of what's wrong with the link, or of the failed save; null when nothing is. */
const errorKey = ref<string | null>(null);

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    link.value = session.user?.photoURL ?? '';
    errorKey.value = null;
  },
  { immediate: true },
);

function close(): void {
  if (!saving.value) emit('close');
}

async function save(): Promise<void> {
  if (saving.value) return;
  const typed = link.value.trim();
  if (typed !== '' && !isHttpsUrl(typed)) {
    errorKey.value = 'profile.photo.invalid';
    return;
  }
  const uid = session.user?.uid;
  const next = typed === '' ? null : typed;
  saving.value = true;
  errorKey.value = null;
  try {
    await updatePhotoUrl(next);
    // Firebase reports no auth-state change for a profile update, so the session's copy is
    // updated here, as for the name, and the photo changes without a reload.
    if (session.user && session.user.uid === uid) session.user.photoURL = next;
    emit('close');
  } catch (error) {
    console.warn('[profile] photo update failed:', errorCode(error));
    errorKey.value = 'profile.photo.error';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <v-dialog
    :model-value="open"
    max-width="420"
    :persistent="saving"
    @update:model-value="(v: boolean) => !v && close()"
  >
    <v-card :title="t('profile.photo.title')">
      <form novalidate @submit.prevent="save">
        <v-card-text>
          <v-text-field
            v-model="link"
            name="photo-url"
            type="url"
            inputmode="url"
            autocomplete="photo"
            :maxlength="PHOTO_URL_MAX"
            variant="outlined"
            color="primary"
            :label="t('profile.photo.field')"
            :hint="t('profile.photo.hint')"
            persistent-hint
            :readonly="saving"
            :error-messages="errorKey ? t(errorKey) : undefined"
            @update:model-value="errorKey = null"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="saving" @click="close">{{
            t('profile.photo.cancel')
          }}</v-btn>
          <v-btn type="submit" variant="text" color="primary" :loading="saving">{{
            t('profile.photo.save')
          }}</v-btn>
        </v-card-actions>
      </form>
    </v-card>
  </v-dialog>
</template>
