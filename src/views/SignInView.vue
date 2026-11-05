<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import type { VForm } from 'vuetify/components';
import { vFocusOnMount } from '@/directives/focusOnMount';
import AppLogo from '@/components/layout/AppLogo.vue';
import { authErrorCode, authErrorKey, isEmailAddress } from '@/lib/authForm';
import { safeRedirect } from '@/router/guard';
import { consumeRedirectResult, signInEmail, signInWithGoogle } from '@/services/auth';
import { useUiStore, type Locale } from '@/stores/ui';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const ui = useUiStore();
const { xs } = useDisplay();

const form = useTemplateRef<InstanceType<typeof VForm>>('form');
const emailOpen = ref(false);
const email = ref('');
const showPassword = ref(false);
const password = ref('');
/** Which sign-in is under way, so only its button spins and the other waits. */
const busy = ref<'email' | 'google' | null>(null);
/** The locale key of the last error, so it follows a change of language. */
const errorKey = ref<string | null>(null);
/** The old sign-in showed a failure in a snackbar; closing it clears the message, never the fields. */
const errorShown = computed({
  get: () => errorKey.value !== null,
  set: (open: boolean) => {
    if (!open) errorKey.value = null;
  },
});
/** The old fields were dense on phones only. */
const density = computed(() => (xs.value ? 'compact' : 'default'));

const rules = {
  email: [
    (v: string) => v.trim() !== '' || t('auth.rules.emailRequired'),
    (v: string) => isEmailAddress(v.trim()) || t('auth.rules.emailInvalid'),
  ],
  password: [(v: string) => v !== '' || t('auth.rules.passwordRequired')],
};

const locale = computed({
  get: () => ui.locale,
  set: (l: Locale) => ui.setLocale(l),
});

/** Sign-up keeps the page to return to. */
const signUpLink = computed(() => {
  const redirect = route.query.redirect;
  return { path: '/signup', query: typeof redirect === 'string' ? { redirect } : {} };
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
    await signInEmail(email.value, password.value);
    await finish();
  } catch (error) {
    fail('email sign-in', error);
  } finally {
    busy.value = null;
  }
}

async function signInGoogle(): Promise<void> {
  if (busy.value) return;
  busy.value = 'google';
  errorKey.value = null;
  try {
    // null: popups are unavailable and the page is leaving for Google's redirect.
    if (await signInWithGoogle()) await finish();
  } catch (error) {
    fail('Google sign-in', error);
  } finally {
    busy.value = null;
  }
}

onMounted(async () => {
  // Back from a Google redirect: an error it ended in is shown here.
  try {
    if (await consumeRedirectResult()) await finish();
  } catch (error) {
    fail('Google redirect sign-in', error);
  }
});
</script>

<template>
  <div class="signin-container auth-page">
    <div class="auth-layout px-7">
      <v-card variant="outlined" class="auth-card mt-2 pb-8 px-8">
        <div class="d-flex flex-column align-center pt-4">
          <AppLogo :size="72" class="mt-4" />
          <h1 class="pt-4 auth-title">{{ t('auth.signIn.title') }}</h1>
          <div class="pa-2 text-caption font-weight-light">{{ t('auth.signIn.subtitle') }}</div>
        </div>

        <v-card-text class="pb-0 px-0">
          <div class="py-3">
            <v-btn
              width="280"
              size="large"
              color="#179c52"
              class="auth-btn"
              :loading="busy === 'google'"
              :disabled="busy === 'email'"
              @click="signInGoogle"
            >
              <span class="auth-btn__row">
                <v-icon start icon="mdi-google" />
                <v-spacer />
                <div class="auth-btn__text">{{ t('auth.signIn.google') }}</div>
              </span>
            </v-btn>
          </div>
          <div>
            <v-expand-transition>
              <div v-if="emailOpen">
                <v-divider class="my-1 mb-4" />
                <v-form ref="form" validate-on="invalid-input" @submit.prevent="submitEmail">
                  <div class="auth-fields px-0 pb-3">
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
                      @keyup.enter="submitEmail"
                    />
                    <v-text-field
                      v-model="password"
                      :type="showPassword ? 'text' : 'password'"
                      name="password"
                      autocomplete="current-password"
                      maxlength="4096"
                      variant="outlined"
                      color="primary"
                      class="mb-3"
                      :density="density"
                      :label="t('auth.fields.password')"
                      :rules="rules.password"
                      @keyup.enter="submitEmail"
                    >
                      <template #append-inner>
                        <v-btn
                          variant="text"
                          size="small"
                          density="comfortable"
                          :icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                          :aria-label="
                            showPassword
                              ? t('auth.fields.hidePassword')
                              : t('auth.fields.showPassword')
                          "
                          @click="showPassword = !showPassword"
                        />
                      </template>
                    </v-text-field>
                  </div>
                </v-form>
              </div>
            </v-expand-transition>
          </div>
          <div>
            <v-btn
              v-if="!emailOpen"
              width="280"
              size="large"
              class="auth-btn"
              :disabled="busy !== null"
              @click="emailOpen = true"
            >
              <span class="auth-btn__row">
                <v-icon start icon="mdi-email" />
                <v-spacer />
                <div class="auth-btn__text">{{ t('auth.signIn.email') }}</div>
              </span>
            </v-btn>
            <v-btn
              v-else
              width="280"
              size="large"
              color="primary"
              class="auth-btn"
              :loading="busy === 'email'"
              :disabled="busy === 'google'"
              @click="submitEmail"
            >
              {{ t('auth.signIn.submit') }}
            </v-btn>
          </div>
        </v-card-text>

        <v-card-text class="pt-9 pb-7">
          <span class="text-caption">{{ t('auth.signIn.noAccount') }}&nbsp;</span>
          <router-link class="auth-link text-caption" :to="signUpLink">{{
            t('auth.signIn.signUpLink')
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
.signin-container {
  height: 100vh;
}
.auth-layout {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
}
.auth-fields {
  max-width: 280px;
  margin: 0 auto;
  text-align: center;
}
</style>
