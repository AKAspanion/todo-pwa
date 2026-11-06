<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, type LocationQuery } from 'vue-router';
import AppLogo from '@/components/layout/AppLogo.vue';
import { authErrorCode, authErrorKey } from '@/lib/authForm';
import { applyVerificationCode } from '@/services/auth';
import { errorCode, useSessionStore } from '@/stores/session';
import { useUiStore, type Locale } from '@/stores/ui';

/** The `mode` Firebase's verification email puts in its link. */
const VERIFY_MODE = 'verifyEmail';
/** The errors that mean the link itself can't be used, each with what the screen says. */
const LINK_ERRORS: ReadonlyMap<string, string> = new Map([
  ['auth/invalid-action-code', 'verify.screen.invalid'],
  ['auth/expired-action-code', 'verify.screen.expired'],
]);
const INVALID_KEY = 'verify.screen.invalid';

/**
 * checking: the code is with Firebase (or the check got no answer, and can be tried again);
 * invalid: the link can't be used; done: the email is verified.
 */
type Phase = 'checking' | 'invalid' | 'done';

const { t } = useI18n();
const route = useRoute();
const ui = useUiStore();
const session = useSessionStore();

/** The code from the link's query, or null when it isn't a verification link (or a key repeats). */
function verifyCodeFrom(query: LocationQuery): string | null {
  if (query.mode !== VERIFY_MODE) return null;
  const code = query.oobCode;
  return typeof code === 'string' && code !== '' ? code : null;
}

const phase = ref<Phase>('checking');
/** The locale key the invalid state shows. */
const invalidKey = ref(INVALID_KEY);
/** The locale key of why the check got no answer, shown beside Try again; null while waiting. */
const errorKey = ref<string | null>(null);
/** Counts runs, so the answer for a link the screen has moved on from is dropped. */
let run = 0;

const locale = ref<Locale>(ui.locale);
watch(locale, (l) => ui.setLocale(l));

/**
 * The code was for whichever account it was sent to, maybe not the one signed in here, so the
 * signed-in user is asked about again rather than marked verified. Best effort: the banner's
 * "I've verified" does the same.
 */
async function recheckSignedInUser(): Promise<void> {
  if (!session.user) return;
  try {
    await session.checkEmailVerified();
  } catch (error) {
    console.warn('[auth] signed-in user not re-checked after verification:', errorCode(error));
  }
}

async function verify(): Promise<void> {
  const mine = ++run;
  errorKey.value = null;
  const code = verifyCodeFrom(route.query);
  if (code === null) {
    invalidKey.value = INVALID_KEY;
    phase.value = 'invalid';
    return;
  }
  phase.value = 'checking';
  try {
    await applyVerificationCode(code);
    if (mine !== run) return;
    phase.value = 'done';
    await recheckSignedInUser();
  } catch (error) {
    // The error's code only: never the link's code or the message.
    const failed = authErrorCode(error);
    console.warn('[auth] verification link failed:', failed || 'unknown');
    if (mine !== run) return;
    const linkKey = LINK_ERRORS.get(failed);
    if (linkKey) {
      invalidKey.value = linkKey;
      phase.value = 'invalid';
      return;
    }
    // No answer about the link (the network, say): it may be fine, so it is never called invalid.
    errorKey.value = authErrorKey(error);
  }
}

const ownPath = route.path;
watch(
  () => [route.query.mode, route.query.oobCode],
  () => {
    if (route.path === ownPath) void verify();
  },
  { immediate: true },
);
</script>

<template>
  <div class="verify-container auth-page">
    <div class="auth-layout px-7">
      <v-card variant="outlined" class="auth-card mt-2 pb-8 px-8">
        <div class="d-flex flex-column align-center pt-4">
          <AppLogo :size="72" class="mt-4" />
          <h1 class="pt-4 auth-title">{{ t('auth.signIn.title') }}</h1>
          <div class="pa-2 text-caption font-weight-light">
            {{ t('verify.screen.subtitle') }}
          </div>
        </div>

        <v-card-text class="pb-0 px-0">
          <div class="auth-message text-body-2 py-3">
            <template v-if="phase === 'checking'">
              <template v-if="errorKey">
                <p class="pb-4" role="alert">{{ t(errorKey) }}</p>
                <v-btn variant="outlined" color="primary" class="auth-btn mb-4" @click="verify">{{
                  t('verify.screen.retry')
                }}</v-btn>
              </template>
              <div v-else role="status">
                <v-progress-circular
                  indeterminate
                  color="primary"
                  :aria-label="t('verify.screen.checking')"
                />
                <p class="pt-3">{{ t('verify.screen.checking') }}</p>
              </div>
            </template>
            <p v-else-if="phase === 'invalid'" class="pb-4" role="status">{{ t(invalidKey) }}</p>
            <p v-else class="pb-4" role="status">{{ t('verify.screen.done') }}</p>

            <v-btn
              v-if="phase !== 'checking' || errorKey"
              to="/home"
              width="280"
              max-width="100%"
              size="large"
              color="primary"
              class="auth-btn"
              >{{ t('verify.screen.home') }}</v-btn
            >
          </div>
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
  </div>
</template>

<style scoped>
.verify-container {
  min-height: 100vh;
}
.auth-layout {
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
}
.auth-message {
  max-width: 280px;
  margin: 0 auto;
  text-align: center;
}
</style>
