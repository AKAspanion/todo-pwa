<script setup lang="ts">
/**
 * Deleting the account (D2–D5): says what goes, confirms who the user is by the providers they
 * have (a password in place, D3, or Google by redirect, D4), then asks for the typed word before
 * Delete runs the session's `deleteAccount` (D5). `confirmed` and `message` set the dialog each
 * time it opens: Profile opens it confirmed, or with a message, when Google's redirect comes back.
 * `message` is a locale key, so it follows a change of language. Escape, a click outside and
 * Cancel emit `close`, except while deleting.
 */
import { computed, onMounted, onUnmounted, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { authErrorCode, authErrorKey } from '@/lib/authForm';
import {
  accountProviders,
  confirmWithGoogle,
  confirmWithPassword,
  type AccountProvider,
} from '@/services/account';
import { errorCode, useSessionStore } from '@/stores/session';
import { useUiStore } from '@/stores/ui';

const props = defineProps<{ open: boolean; confirmed: boolean; message: string | null }>();
const emit = defineEmits<{ close: [] }>();

/** D2: the word, exactly, upper case, that the user types before Delete is enabled. */
const CONFIRM_WORD = 'DELETE';
/** D3: Firebase's codes for a password that doesn't match the account. */
const WRONG_PASSWORD = new Set([
  'auth/wrong-password',
  'auth/invalid-credential',
  'auth/invalid-login-credentials',
]);

const { t } = useI18n();
const router = useRouter();
const session = useSessionStore();
const ui = useUiStore();
const titleId = useId();

const providers = ref<AccountProvider[]>([]);
const isConfirmed = ref(false);
/** The locale key of the message shown in the dialog, or null. */
const messageKey = ref<string | null>(null);
const password = ref('');
const word = ref('');
/** What is under way, so only its button spins and the others wait. */
const busy = ref<'password' | 'google' | 'delete' | null>(null);

const canDelete = computed(
  () => isConfirmed.value && word.value === CONFIRM_WORD && busy.value === null,
);

function readProviders(): AccountProvider[] {
  try {
    return accountProviders();
  } catch (error) {
    console.warn('[profile] could not read the account providers:', errorCode(error));
    return [];
  }
}

/** Each opening starts from the props, with the fields empty. */
watch(
  () => [props.open, props.confirmed, props.message] as const,
  ([open, confirmed, message]) => {
    if (!open) return;
    providers.value = readProviders();
    isConfirmed.value = confirmed;
    messageKey.value = message;
    password.value = '';
    word.value = '';
    busy.value = null;
  },
  { immediate: true },
);

/** D3: re-authenticates in place; a wrong password says so and leaves the dialog unconfirmed. */
async function confirmPassword(): Promise<void> {
  if (busy.value !== null || isConfirmed.value) return;
  busy.value = 'password';
  messageKey.value = null;
  try {
    await confirmWithPassword(password.value);
    isConfirmed.value = true;
    password.value = '';
  } catch (error) {
    const code = authErrorCode(error);
    console.warn('[profile] password confirmation failed:', code || 'unknown');
    messageKey.value = WRONG_PASSWORD.has(code)
      ? 'profile.delete.wrongPassword'
      : authErrorKey(error);
  } finally {
    busy.value = null;
  }
}

/** D4: the page leaves for Google, so the button stays busy unless the redirect can't start. */
async function confirmGoogle(): Promise<void> {
  if (busy.value !== null || isConfirmed.value) return;
  busy.value = 'google';
  messageKey.value = null;
  try {
    await confirmWithGoogle();
  } catch (error) {
    console.warn('[profile] Google confirmation failed:', authErrorCode(error) || 'unknown');
    messageKey.value = authErrorKey(error);
    busy.value = null;
  }
}

/**
 * Back from Google without finishing, the browser may restore this page from its back-forward
 * cache with the Google button still busy: it is usable again.
 */
function onPageShow(event: PageTransitionEvent): void {
  if (event.persisted && busy.value === 'google') busy.value = null;
}

onMounted(() => window.addEventListener('pageshow', onPageShow));
onUnmounted(() => window.removeEventListener('pageshow', onPageShow));

/**
 * D5: deletes through the session store, then goes to /signin and says so. A stale sign-in
 * returns the dialog to unconfirmed; any other failure says so and changes nothing else.
 */
async function deleteAccount(): Promise<void> {
  if (!canDelete.value) return;
  busy.value = 'delete';
  messageKey.value = null;
  try {
    await session.deleteAccount();
  } catch (error) {
    const code = errorCode(error);
    console.warn('[profile] account deletion failed:', code);
    if (code === 'auth/requires-recent-login') {
      isConfirmed.value = false;
      word.value = '';
      messageKey.value = 'profile.delete.again';
    } else {
      messageKey.value = 'profile.delete.failed';
    }
    busy.value = null;
    return;
  }
  await router.replace('/signin');
  // After the session cleared the per-user stores, which clears the snack too.
  ui.showSnack(t('profile.delete.done'));
}

function onOpenChange(open: boolean): void {
  if (!open && busy.value !== 'delete') emit('close');
}
</script>

<template>
  <v-dialog
    :model-value="open"
    max-width="420"
    scrollable
    :persistent="busy === 'delete'"
    :aria-labelledby="titleId"
    @update:model-value="onOpenChange"
  >
    <v-card data-testid="delete-account-dialog" class="delete-account">
      <v-card-title :id="titleId" class="delete-account__title">
        {{ t('profile.delete.title') }}
      </v-card-title>
      <v-card-text>
        <p class="mb-2">{{ t('profile.delete.body') }}</p>
        <router-link class="text-caption" to="/delete-account">
          {{ t('profile.delete.howItWorks') }}
        </router-link>

        <div v-if="!isConfirmed" class="mt-4">
          <form
            v-if="providers.includes('password')"
            class="delete-account__row"
            novalidate
            @submit.prevent="confirmPassword"
          >
            <v-text-field
              v-model="password"
              type="password"
              name="password"
              autocomplete="current-password"
              maxlength="4096"
              variant="outlined"
              color="primary"
              density="compact"
              hide-details
              :label="t('profile.delete.password')"
              :readonly="busy === 'password'"
            />
            <v-btn
              type="submit"
              variant="text"
              color="primary"
              class="ml-2"
              :loading="busy === 'password'"
              :disabled="busy !== null && busy !== 'password'"
            >
              {{ t('profile.delete.confirmPassword') }}
            </v-btn>
          </form>
          <v-btn
            v-if="providers.includes('google.com')"
            block
            color="#179c52"
            class="mt-3 text-white"
            prepend-icon="mdi-google"
            :loading="busy === 'google'"
            :disabled="busy !== null && busy !== 'google'"
            @click="confirmGoogle"
          >
            {{ t('profile.delete.google') }}
          </v-btn>
        </div>
        <p v-else class="mt-4 mb-0 text-success" role="status">
          {{ t('profile.delete.confirmed') }}
        </p>

        <v-text-field
          v-model="word"
          class="mt-4"
          variant="outlined"
          color="primary"
          density="compact"
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false"
          maxlength="20"
          hide-details
          :label="t('profile.delete.type')"
          :disabled="!isConfirmed"
          @keyup.enter="deleteAccount"
        />

        <v-alert
          v-if="messageKey"
          type="error"
          variant="tonal"
          density="compact"
          class="mt-4 text-start"
          role="alert"
          :text="t(messageKey)"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="busy === 'delete'" @click="emit('close')">
          {{ t('profile.delete.cancel') }}
        </v-btn>
        <v-btn
          variant="text"
          color="error"
          :loading="busy === 'delete'"
          :disabled="!canDelete && busy !== 'delete'"
          @click="deleteAccount"
        >
          {{ t('profile.delete.confirm') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.delete-account__title {
  white-space: normal;
  overflow-wrap: anywhere;
}
.delete-account__row {
  display: flex;
  align-items: center;
}
</style>
