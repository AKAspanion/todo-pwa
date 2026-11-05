<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, type LocationQuery } from 'vue-router';
import { useDisplay } from 'vuetify';
import type { VForm } from 'vuetify/components';
import { vFocusOnMount } from '@/directives/focusOnMount';
import AppLogo from '@/components/layout/AppLogo.vue';
import { authErrorCode, authErrorKey, isStrongPassword } from '@/lib/authForm';
import { checkResetCode, resetPassword } from '@/services/auth';
import { useUiStore, type Locale } from '@/stores/ui';

/** The `mode` Firebase's reset email puts in its link. */
const RESET_MODE = 'resetPassword';
/** The errors that mean the link itself can't be used: the screen says so, and offers a new one. */
const LINK_ERROR_KEYS: ReadonlySet<string> = new Set([
  'auth.errors.resetLinkExpired',
  'auth.errors.resetLinkInvalid',
]);
const INVALID_LINK_KEY = 'auth.errors.resetLinkInvalid';

/**
 * checking: the link's code is with Firebase (or the check failed and can be tried again);
 * invalid: the link can't be used; form: the new password is asked for; done: it is set.
 */
type Phase = 'checking' | 'invalid' | 'form' | 'done';

const { t } = useI18n();
const route = useRoute();
const ui = useUiStore();
const { xs } = useDisplay();

/**
 * The reset code from the link's query, or null when the link isn't a reset link. The query is
 * anyone's to write: a key given twice arrives as a list, and is refused like a missing one.
 */
function resetCodeFrom(query: LocationQuery): string | null {
  if (query.mode !== RESET_MODE) return null;
  const code = query.oobCode;
  return typeof code === 'string' && code !== '' ? code : null;
}

const form = useTemplateRef<InstanceType<typeof VForm>>('form');
const phase = ref<Phase>('checking');
/** The locale key the invalid state shows: expired, or not valid (used, or never was). */
const invalidKey = ref(INVALID_LINK_KEY);
/**
 * The locale key of why the check got no answer (a network failure, say), or null: while set, the
 * screen says why beside "Try again", after the snackbar has closed too.
 */
const checkErrorKey = ref<string | null>(null);
/** The account the checked code belongs to, and that code: the password is set for these. */
const email = ref('');
const checkedCode = ref('');
const password = ref('');
const confirm = ref('');
const showPassword = ref(false);
/** Set before the form validates, so a second press can't set the password twice. */
const busy = ref(false);
/** Counts checks, so the answer to a link the screen has moved on from is dropped. */
let checkRun = 0;
/** The locale key of the last error, so it follows a change of language. */
const errorKey = ref<string | null>(null);
/** Sign-in's snackbar: closing it clears the message, never the fields. */
const errorShown = computed({
  get: () => errorKey.value !== null,
  set: (open: boolean) => {
    if (!open) errorKey.value = null;
  },
});
/** Sign-in's fields are dense on phones only. */
const density = computed(() => (xs.value ? 'compact' : 'default'));

/** Sign-up's rule for a new password (D14). */
const rules = {
  password: [
    (v: string) => v !== '' || t('auth.rules.passwordEnter'),
    (v: string) => isStrongPassword(v) || t('auth.rules.passwordStrength'),
  ],
  confirm: [
    (v: string) => v !== '' || t('auth.rules.confirmRequired'),
    (v: string) => v === password.value || t('auth.rules.passwordsMatch'),
  ],
};

const locale = computed({
  get: () => ui.locale,
  set: (l: Locale) => ui.setLocale(l),
});

/** Shows the invalid state when `key` says the link can't be used; false for any other error. */
function showLinkError(key: string): boolean {
  if (!LINK_ERROR_KEYS.has(key)) return false;
  invalidKey.value = key;
  phase.value = 'invalid';
  return true;
}

/** Checks the link's code with Firebase, and shows the form for its account. */
async function check(): Promise<void> {
  const run = ++checkRun;
  const code = resetCodeFrom(route.query);
  errorKey.value = null;
  checkErrorKey.value = null;
  password.value = '';
  confirm.value = '';
  if (code === null) {
    showLinkError(INVALID_LINK_KEY);
    return;
  }
  phase.value = 'checking';
  try {
    const found = await checkResetCode(code);
    if (run !== checkRun) return;
    email.value = found;
    checkedCode.value = code;
    phase.value = 'form';
  } catch (error) {
    // The error's code only: never the link's code, the address or the message.
    console.warn('[auth] reset link check failed:', authErrorCode(error) || 'unknown');
    if (run !== checkRun) return;
    const key = authErrorKey(error);
    if (showLinkError(key)) return;
    // No answer about the link (the network, say): it may be fine, so it is never called invalid.
    errorKey.value = key;
    checkErrorKey.value = key;
  }
}

async function submit(): Promise<void> {
  if (busy.value || !form.value) return;
  busy.value = true;
  errorKey.value = null;
  const run = checkRun;
  try {
    const { valid } = await form.value.validate();
    if (!valid) return;
    await resetPassword(checkedCode.value, password.value);
    if (run !== checkRun) return;
    password.value = '';
    confirm.value = '';
    phase.value = 'done';
  } catch (error) {
    // The error's code only: never the link's code, the address, the password or the message.
    console.warn('[auth] password reset failed:', authErrorCode(error) || 'unknown');
    if (run !== checkRun) return;
    const key = authErrorKey(error);
    // Any other failure keeps both fields as typed, to press again.
    if (!showLinkError(key)) errorKey.value = key;
  } finally {
    busy.value = false;
  }
}

/** This screen's own path: a query change while on it is a new link, checked again. */
const ownPath = route.path;
watch(
  () => [route.query.mode, route.query.oobCode],
  () => {
    if (route.path === ownPath) void check();
  },
  { immediate: true },
);
</script>

<template>
  <div class="reset-container auth-page">
    <div class="auth-layout px-7">
      <v-card variant="outlined" class="auth-card mt-2 pb-8 px-8">
        <div class="d-flex flex-column align-center pt-4">
          <AppLogo :size="72" class="mt-4" />
          <h1 class="pt-4 auth-title">{{ t('auth.signIn.title') }}</h1>
          <div class="pa-2 text-caption font-weight-light">{{ t('auth.reset.subtitle') }}</div>
        </div>

        <v-card-text class="pb-0 px-0">
          <div v-if="phase === 'checking'" class="auth-message text-body-2 py-3">
            <template v-if="checkErrorKey">
              <p class="pb-4">{{ t(checkErrorKey) }}</p>
              <v-btn variant="outlined" color="primary" class="auth-btn" @click="check">{{
                t('auth.reset.retry')
              }}</v-btn>
            </template>
            <div v-else role="status">
              <v-progress-circular
                indeterminate
                color="primary"
                :aria-label="t('auth.reset.checking')"
              />
              <p class="pt-3">{{ t('auth.reset.checking') }}</p>
            </div>
          </div>

          <div v-else-if="phase === 'invalid'" class="auth-message text-body-2 py-3">
            <p class="pb-4" role="status">{{ t(invalidKey) }}</p>
            <v-btn
              to="/forgot-password"
              width="280"
              max-width="100%"
              size="large"
              color="primary"
              class="auth-btn"
              >{{ t('auth.reset.requestNew') }}</v-btn
            >
          </div>

          <div v-else-if="phase === 'done'" class="auth-message text-body-2 py-3">
            <p class="pb-4" role="status">{{ t('auth.reset.done') }}</p>
            <v-btn
              to="/signin"
              width="280"
              max-width="100%"
              size="large"
              color="primary"
              class="auth-btn"
              >{{ t('auth.reset.signIn') }}</v-btn
            >
          </div>

          <v-form v-else ref="form" validate-on="invalid-input" @submit.prevent="submit">
            <div class="auth-fields px-0 pb-3">
              <p class="text-body-2 pb-4 auth-account">
                {{ t('auth.reset.forEmail', { email }) }}
              </p>
              <v-text-field
                v-model="password"
                v-focus-on-mount
                name="new-password"
                autocomplete="new-password"
                maxlength="4096"
                variant="outlined"
                color="primary"
                class="mb-3"
                :density="density"
                :type="showPassword ? 'text' : 'password'"
                :label="t('auth.fields.newPassword')"
                :rules="rules.password"
              >
                <template #append-inner>
                  <v-btn
                    variant="text"
                    size="small"
                    density="comfortable"
                    :icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                    :aria-label="
                      showPassword ? t('auth.fields.hidePassword') : t('auth.fields.showPassword')
                    "
                    @click="showPassword = !showPassword"
                  />
                </template>
              </v-text-field>
              <v-text-field
                v-model="confirm"
                name="confirm-password"
                autocomplete="new-password"
                maxlength="4096"
                variant="outlined"
                color="primary"
                class="mb-3"
                :density="density"
                :type="showPassword ? 'text' : 'password'"
                :label="t('auth.fields.confirmPassword')"
                :rules="rules.confirm"
              >
                <template #append-inner>
                  <v-btn
                    variant="text"
                    size="small"
                    density="comfortable"
                    :icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                    :aria-label="
                      showPassword ? t('auth.fields.hidePassword') : t('auth.fields.showPassword')
                    "
                    @click="showPassword = !showPassword"
                  />
                </template>
              </v-text-field>
            </div>
            <v-btn
              type="submit"
              width="280"
              max-width="100%"
              size="large"
              color="primary"
              class="auth-btn"
              :loading="busy"
            >
              {{ t('auth.reset.submit') }}
            </v-btn>
          </v-form>
        </v-card-text>

        <v-card-text class="pt-9 pb-7">
          <router-link class="auth-link text-caption" to="/privacy">{{
            t('auth.privacyLink')
          }}</router-link>
        </v-card-text>

        <v-btn-toggle
          v-model="locale"
          mandatory
          density="compact"
          variant="text"
          class="auth-lang"
          :aria-label="t('auth.language.label')"
          role="group"
        >
          <v-btn
            value="en"
            size="x-small"
            lang="en"
            :aria-label="t('auth.language.en')"
            :aria-pressed="locale === 'en'"
            >en</v-btn
          >
          <v-btn
            value="hi"
            size="x-small"
            lang="hi"
            :aria-label="t('auth.language.hi')"
            :aria-pressed="locale === 'hi'"
            >hi</v-btn
          >
        </v-btn-toggle>
      </v-card>
    </div>

    <v-snackbar
      v-model="errorShown"
      :timeout="5000"
      multi-line
      location="bottom"
      class="app-snackbar"
      data-testid="auth-error"
      role="alert"
    >
      {{ errorKey ? t(errorKey) : '' }}
      <template #actions>
        <v-btn variant="text" @click="errorShown = false">{{ t('common.close') }}</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<style scoped>
.reset-container {
  height: 100vh;
}
.auth-layout {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
}
.auth-fields,
.auth-message {
  max-width: 280px;
  margin: 0 auto;
  text-align: center;
}
.auth-account {
  overflow-wrap: anywhere;
}
</style>
