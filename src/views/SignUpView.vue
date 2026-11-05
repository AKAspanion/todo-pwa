<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import type { VForm } from 'vuetify/components';
import AppLogo from '@/components/layout/AppLogo.vue';
import { authErrorCode, authErrorKey, isStrongPassword } from '@/lib/authForm';
import { safeRedirect } from '@/router/guard';
import { signInWithGoogle, signUpEmail } from '@/services/auth';
import { useUiStore, type Locale } from '@/stores/ui';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const ui = useUiStore();
const { xs } = useDisplay();

const form = useTemplateRef<InstanceType<typeof VForm>>('form');
const email = ref('');
const password = ref('');
const confirm = ref('');
const showPassword = ref(false);
/** Which sign-up is under way, so only its button spins and the other waits. */
const busy = ref<'email' | 'google' | null>(null);
/** The locale key of the last error, so it follows a change of language. */
const errorKey = ref<string | null>(null);
/** The old sign-up showed a failure in a snackbar; closing it clears the message, never the fields. */
const errorShown = computed({
  get: () => errorKey.value !== null,
  set: (open: boolean) => {
    if (!open) errorKey.value = null;
  },
});
/** The old fields were dense on phones only. */
const density = computed(() => (xs.value ? 'compact' : 'default'));

/** Any address Firebase accepts is accepted: Firebase itself judges the format (D14). */
const rules = {
  email: [(v: string) => v.trim() !== '' || t('auth.rules.emailRequired')],
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
  <div class="signup-container auth-page">
    <div class="auth-layout px-7">
      <v-card variant="outlined" class="auth-card mt-2 pb-8 px-8">
        <div class="d-flex flex-column align-center pt-4">
          <AppLogo :size="72" class="mt-4" />
          <h1 class="pt-4 auth-title">{{ t('auth.signUp.title') }}</h1>
          <div class="pa-2 text-caption font-weight-light">{{ t('auth.signUp.subtitle') }}</div>
        </div>

        <v-card-text class="auth-form">
          <v-form ref="form" validate-on="submit" @submit.prevent="submitEmail">
            <v-card-text class="px-0 pb-0">
              <v-row class="gr-1">
                <v-col cols="12" class="py-0">
                  <v-text-field
                    v-model="email"
                    type="email"
                    name="email"
                    autocomplete="email"
                    maxlength="254"
                    variant="outlined"
                    color="primary"
                    :density="density"
                    :label="t('auth.fields.email')"
                    :rules="rules.email"
                  />
                </v-col>
                <v-col cols="12" sm="6" class="py-0">
                  <v-text-field
                    v-model="password"
                    name="new-password"
                    autocomplete="new-password"
                    maxlength="4096"
                    variant="outlined"
                    color="primary"
                    :density="density"
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
                          showPassword
                            ? t('auth.fields.hidePassword')
                            : t('auth.fields.showPassword')
                        "
                        @click="showPassword = !showPassword"
                      />
                    </template>
                  </v-text-field>
                </v-col>
                <v-col cols="12" sm="6" class="py-0">
                  <v-text-field
                    v-model="confirm"
                    name="confirm-password"
                    autocomplete="new-password"
                    maxlength="4096"
                    variant="outlined"
                    color="primary"
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
                          showPassword
                            ? t('auth.fields.hidePassword')
                            : t('auth.fields.showPassword')
                        "
                        @click="showPassword = !showPassword"
                      />
                    </template>
                  </v-text-field>
                </v-col>
              </v-row>
            </v-card-text>
            <v-card-actions class="px-0 py-4">
              <v-btn
                type="submit"
                size="large"
                block
                color="primary"
                class="auth-btn"
                :loading="busy === 'email'"
                :disabled="busy === 'google'"
              >
                {{ t('auth.signUp.submit') }}
              </v-btn>
            </v-card-actions>
          </v-form>
        </v-card-text>

        <div class="text-overline py-0">{{ t('auth.signUp.or') }}</div>
        <v-card-text>
          <div>
            <span class="pa-1">
              <v-btn
                size="large"
                icon
                variant="text"
                :aria-label="t('auth.signUp.google')"
                :loading="busy === 'google'"
                :disabled="busy === 'email'"
                @click="signUpGoogle"
              >
                <v-icon color="#179c52" icon="mdi-google" />
              </v-btn>
            </span>
          </div>
        </v-card-text>

        <v-card-text class="pt-0 pb-7">
          <span class="text-caption">{{ t('auth.signUp.hasAccount') }}&nbsp;</span>
          <router-link class="auth-link text-caption" :to="signInLink">{{
            t('auth.signUp.signInLink')
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
.signup-container {
  height: 100vh;
  width: 100vw;
  overflow-x: hidden;
  overflow-y: scroll;
  scrollbar-width: none;
}
.signup-container::-webkit-scrollbar {
  width: 0;
}
.auth-layout {
  display: flex;
  min-height: 100%;
  align-items: center;
  justify-content: center;
}
.auth-form {
  max-width: 420px;
  margin: 0 auto;
  text-align: center;
}
</style>
