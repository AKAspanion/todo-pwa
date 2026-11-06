<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import type { VForm } from 'vuetify/components';
import { vFocusOnMount } from '@/directives/focusOnMount';
import AppLogo from '@/components/layout/AppLogo.vue';
import { authErrorCode, authErrorKey, isEmailAddress } from '@/lib/authForm';
import { requestPasswordReset } from '@/services/auth';
import { useUiStore, type Locale } from '@/stores/ui';

/** The email field's own limit; a longer value in history state isn't an address sign-in typed. */
const EMAIL_MAX_LENGTH = 254;

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const ui = useUiStore();
const { xs } = useDisplay();

/**
 * The email typed on sign-in, carried in history state (never the URL, decisions/password-reset).
 * History state is anyone's to write, so only a string the field could hold is taken.
 */
function emailFromSignIn(): string {
  const carried: unknown = router.options.history.state?.email;
  return typeof carried === 'string' && carried.length <= EMAIL_MAX_LENGTH ? carried : '';
}

const form = useTemplateRef<InstanceType<typeof VForm>>('form');
const email = ref(emailFromSignIn());
/** Set before the form validates, so a second press can't send a second request. */
const busy = ref(false);
/** Once the request is answered the form gives way to one confirmation, for every address. */
const sent = ref(false);
/** The locale key of the last error, so it follows a change of language. */
const errorKey = ref<string | null>(null);
/** Sign-in's snackbar: closing it clears the message, never the field. */
const errorShown = computed({
  get: () => errorKey.value !== null,
  set: (open: boolean) => {
    if (!open) errorKey.value = null;
  },
});
/** Sign-in's fields are dense on phones only. */
const density = computed(() => (xs.value ? 'compact' : 'default'));

const rules = {
  email: [
    (v: string) => v.trim() !== '' || t('auth.rules.emailRequired'),
    (v: string) => isEmailAddress(v.trim()) || t('auth.rules.emailInvalid'),
  ],
};

const locale = computed({
  get: () => ui.locale,
  set: (l: Locale) => ui.setLocale(l),
});

/** Back to sign-in, keeping the page to return to. */
const signInLink = computed(() => {
  const redirect = route.query.redirect;
  return { path: '/signin', query: typeof redirect === 'string' ? { redirect } : {} };
});

async function submit(): Promise<void> {
  if (busy.value || !form.value) return;
  busy.value = true;
  errorKey.value = null;
  try {
    const { valid } = await form.value.validate();
    if (!valid) return;
    await requestPasswordReset(email.value.trim());
    sent.value = true;
  } catch (error) {
    // The code only: the message and the address stay out of the log.
    console.warn('[auth] password reset request failed:', authErrorCode(error) || 'unknown');
    errorKey.value = authErrorKey(error);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="forgot-container auth-page">
    <div class="auth-layout px-7">
      <v-card variant="outlined" class="auth-card mt-2 pb-8 px-8">
        <div class="d-flex flex-column align-center pt-4">
          <AppLogo :size="72" class="mt-4" />
          <h1 class="pt-4 auth-title">{{ t('auth.signIn.title') }}</h1>
          <div class="pa-2 text-caption font-weight-light">{{ t('auth.forgot.subtitle') }}</div>
        </div>

        <v-card-text class="pb-0 px-0">
          <div v-if="sent" class="auth-message text-body-2 py-3" role="status">
            {{ t('auth.forgot.sent') }}
          </div>
          <v-form v-else ref="form" validate-on="invalid-input" @submit.prevent="submit">
            <div class="auth-fields px-0 pb-3">
              <p class="text-body-2 pb-4">{{ t('auth.forgot.hint') }}</p>
              <v-text-field
                v-model="email"
                v-focus-on-mount
                type="email"
                name="email"
                autocomplete="email"
                maxlength="254"
                variant="outlined"
                color="primary"
                class="mb-3"
                :density="density"
                :label="t('auth.fields.email')"
                :rules="rules.email"
              />
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
              {{ t('auth.forgot.submit') }}
            </v-btn>
          </v-form>
        </v-card-text>

        <v-card-text class="pt-9 pb-7">
          <router-link class="auth-link text-caption" :to="signInLink">{{
            t('auth.forgot.backToSignIn')
          }}</router-link>
          <div class="pt-2">
            <router-link class="auth-link text-caption" to="/privacy">{{
              t('auth.privacyLink')
            }}</router-link>
          </div>
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
.forgot-container {
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
</style>
