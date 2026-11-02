<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import type { VForm } from 'vuetify/components';
import { authErrorCode, authErrorKey, isStrongPassword } from '@/lib/authForm';
import { safeRedirect } from '@/router/guard';
import { signInWithGoogle, signUpEmail } from '@/services/auth';
import { useUiStore, type Locale } from '@/stores/ui';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const ui = useUiStore();

const form = useTemplateRef<InstanceType<typeof VForm>>('form');
const email = ref('');
const password = ref('');
const confirm = ref('');
const showPassword = ref(false);
/** Which sign-up is under way, so only its button spins and the other waits. */
const busy = ref<'email' | 'google' | null>(null);
/** The locale key of the last error, so it follows a change of language. */
const errorKey = ref<string | null>(null);

/** Any address Firebase accepts is accepted: Firebase itself judges the format (D14). */
const rules = {
  email: [(v: string) => v.trim() !== '' || t('auth.rules.emailRequired')],
  password: [
    (v: string) => v !== '' || t('auth.rules.passwordRequired'),
    (v: string) => isStrongPassword(v) || t('auth.rules.passwordStrength'),
  ],
  confirm: [(v: string) => v === password.value || t('auth.rules.passwordsMatch')],
};

const locale = computed({
  get: () => ui.locale,
  set: (l: Locale) => ui.setLocale(l),
});

/** Sign-in keeps the page to return to. */
const signInLink = computed(() => {
  const redirect = route.query.redirect;
  return { path: '/signin', query: typeof redirect === 'string' ? { redirect } : {} };
});

function finish(): Promise<unknown> {
  return router.replace(safeRedirect(route.query.redirect));
}

function fail(action: string, error: unknown): void {
  console.warn(`[auth] ${action} failed:`, authErrorCode(error) || 'unknown');
  const key = authErrorKey(error);
  if (key) errorKey.value = key;
}

async function submitEmail(): Promise<void> {
  if (busy.value || !form.value) return;
  const { valid } = await form.value.validate();
  if (!valid) return;
  busy.value = 'email';
  errorKey.value = null;
  try {
    await signUpEmail(email.value, password.value);
    await finish();
  } catch (error) {
    fail('email sign-up', error);
  } finally {
    busy.value = null;
  }
}

async function signUpGoogle(): Promise<void> {
  if (busy.value) return;
  busy.value = 'google';
  errorKey.value = null;
  try {
    // null: popups are unavailable and the page is leaving for Google's redirect.
    if (await signInWithGoogle()) await finish();
  } catch (error) {
    fail('Google sign-up', error);
  } finally {
    busy.value = null;
  }
}
</script>

<template>
  <v-container class="auth-screen d-flex align-center justify-center">
    <v-card class="auth-card pa-6" width="100%" max-width="420" variant="flat">
      <h1 class="text-h5 text-center">{{ t('auth.signUp.title') }}</h1>
      <p class="text-body-2 text-center text-medium-emphasis mb-6">
        {{ t('auth.signUp.subtitle') }}
      </p>

      <v-alert
        v-if="errorKey"
        type="error"
        variant="tonal"
        density="compact"
        class="mb-4"
        role="alert"
        data-testid="auth-error"
      >
        {{ t(errorKey) }}
      </v-alert>

      <v-form ref="form" validate-on="submit" @submit.prevent="submitEmail">
        <v-text-field
          v-model="email"
          type="email"
          name="email"
          autocomplete="email"
          maxlength="254"
          variant="outlined"
          class="mb-2"
          :label="t('auth.fields.email')"
          :rules="rules.email"
        />
        <v-text-field
          v-model="password"
          name="new-password"
          autocomplete="new-password"
          maxlength="4096"
          variant="outlined"
          class="mb-2"
          :type="showPassword ? 'text' : 'password'"
          :label="t('auth.fields.password')"
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
          class="mb-2"
          :type="showPassword ? 'text' : 'password'"
          :label="t('auth.fields.confirmPassword')"
          :rules="rules.confirm"
        />
        <v-btn
          type="submit"
          block
          size="large"
          color="primary"
          class="auth-btn"
          :loading="busy === 'email'"
          :disabled="busy === 'google'"
        >
          {{ t('auth.signUp.submit') }}
        </v-btn>
      </v-form>

      <div class="d-flex align-center my-4">
        <v-divider />
        <span class="text-caption text-medium-emphasis px-3">{{ t('auth.signUp.or') }}</span>
        <v-divider />
      </div>

      <v-btn
        block
        size="large"
        variant="outlined"
        prepend-icon="mdi-google"
        class="auth-btn"
        :loading="busy === 'google'"
        :disabled="busy === 'email'"
        @click="signUpGoogle"
      >
        {{ t('auth.signUp.google') }}
      </v-btn>

      <p class="text-body-2 text-center mt-6">
        {{ t('auth.signUp.hasAccount') }}
        <router-link :to="signInLink">{{ t('auth.signUp.signInLink') }}</router-link>
      </p>

      <div class="d-flex justify-center mt-4">
        <v-btn-toggle
          v-model="locale"
          mandatory
          density="compact"
          variant="outlined"
          divided
          :aria-label="t('auth.language.label')"
          role="group"
        >
          <v-btn value="en" size="small" lang="en" :aria-pressed="locale === 'en'">{{
            t('auth.language.en')
          }}</v-btn>
          <v-btn value="hi" size="small" lang="hi" :aria-pressed="locale === 'hi'">{{
            t('auth.language.hi')
          }}</v-btn>
        </v-btn-toggle>
      </div>
    </v-card>
  </v-container>
</template>

<style scoped>
.auth-screen {
  min-height: 100%;
}
/* Long Hindi labels wrap inside the button instead of overflowing it at phone width. */
.auth-btn {
  height: auto !important;
  min-height: 44px;
  white-space: normal;
}
.auth-btn :deep(.v-btn__content) {
  white-space: normal;
  text-align: center;
}
</style>
