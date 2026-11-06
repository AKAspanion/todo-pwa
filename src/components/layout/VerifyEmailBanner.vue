<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { authErrorCode, authErrorKey } from '@/lib/authForm';
import { dismissedRecently, rememberDismissal } from '@/lib/verifyReminder';
import { useSessionStore } from '@/stores/session';
import { useUiStore } from '@/stores/ui';

/** The wait between resends, as in flash-cards, so presses don't run into Firebase's rate limit. */
const RESEND_COOLDOWN_SECONDS = 60;
/**
 * The CSS variable the full-height screens subtract (`.old-app-card` in `src/assets/style.css`,
 * and HomeView), so the banner pushes nothing under the bottom navigation.
 */
const HEIGHT_VARIABLE = '--verify-banner-height';

const { t } = useI18n();
const route = useRoute();
const session = useSessionStore();
const ui = useUiStore();

/** Bumped on Dismiss, so `shown` reads the saved dismissal again. */
const dismissals = ref(0);

/**
 * A reminder only (decisions/email-verification-reminder): it gates nothing, and shows to a
 * signed-in user whose email isn't verified, on the routes whose `meta.verifyBanner` says so:
 * always on Profile, and on Home until dismissed there, then again after 7 days. Google accounts
 * arrive verified.
 */
const shown = computed(() => {
  const user = session.user;
  const where = route.meta.verifyBanner;
  if (!user || user.emailVerified || !where) return false;
  void dismissals.value;
  return where === 'always' || !dismissedRecently(user.uid);
});

/** Dismiss is offered only where the banner can be dismissed. */
const dismissible = computed(() => route.meta.verifyBanner === 'dismissible');

const resending = ref(false);
const secondsLeft = ref(0);
let cooldownEnd = 0;
let cooldownTimer: ReturnType<typeof setInterval> | null = null;

function stopCooldown(): void {
  if (cooldownTimer) clearInterval(cooldownTimer);
  cooldownTimer = null;
}

/** Counted from the end time, not by ticks, so a throttled background tab still ends on time. */
function tick(): void {
  secondsLeft.value = Math.max(0, Math.ceil((cooldownEnd - Date.now()) / 1000));
  if (secondsLeft.value === 0) stopCooldown();
}

function startCooldown(): void {
  stopCooldown();
  cooldownEnd = Date.now() + RESEND_COOLDOWN_SECONDS * 1000;
  tick();
  cooldownTimer = setInterval(tick, 1000);
}

function showError(what: string, error: unknown): void {
  // The error's code only: never the address or Firebase's message.
  console.warn(`[auth] ${what} failed:`, authErrorCode(error) || 'unknown');
  ui.showSnack(t(authErrorKey(error)));
}

async function resend(): Promise<void> {
  if (resending.value || secondsLeft.value > 0) return;
  resending.value = true;
  try {
    await session.resendVerification();
    startCooldown();
    ui.showSnack(t('verify.banner.sent'));
  } catch (error) {
    showError('verification resend', error);
  } finally {
    resending.value = false;
  }
}

function dismiss(): void {
  const uid = session.user?.uid;
  if (!uid) return;
  rememberDismissal(uid);
  dismissals.value += 1;
}

/**
 * The user may have verified on another device or in Firebase's own page since this one cached
 * them, so the first time the banner shows on each page load Firebase is asked quietly; once
 * verified, the banner goes away. A failure is logged by its code and changes nothing.
 */
let checkedThisLoad = false;
watch(
  shown,
  async (now) => {
    if (!now || checkedThisLoad) return;
    checkedThisLoad = true;
    try {
      await session.checkEmailVerified();
    } catch (error) {
      console.warn('[auth] quiet verification check failed:', authErrorCode(error) || 'unknown');
    }
  },
  { immediate: true },
);

/** Publishes the banner's height while it shows, and 0 once it goes. */
const root = useTemplateRef<HTMLElement>('root');
let observer: ResizeObserver | null = null;

function setHeight(px: number): void {
  document.documentElement.style.setProperty(HEIGHT_VARIABLE, `${px}px`);
}

watch(
  root,
  (el) => {
    observer?.disconnect();
    observer = null;
    if (!el) {
      document.documentElement.style.removeProperty(HEIGHT_VARIABLE);
      return;
    }
    setHeight(el.offsetHeight);
    observer = new ResizeObserver(() => setHeight(el.offsetHeight));
    observer.observe(el);
  },
  { flush: 'post' },
);

onBeforeUnmount(() => {
  stopCooldown();
  observer?.disconnect();
  document.documentElement.style.removeProperty(HEIGHT_VARIABLE);
});
</script>

<template>
  <!--
    A region named by its text, not a live region: the Resend countdown changes every second, and a
    live region around it would be read out on each tick. Results reach screen readers in the snack.
  -->
  <div
    v-if="shown"
    ref="root"
    class="verify-banner"
    role="region"
    aria-labelledby="verify-banner-text"
  >
    <v-banner density="compact" lines="two" color="primary" icon="mdi-email-alert-outline">
      <template #text>
        <span id="verify-banner-text">{{
          t('verify.banner.text', { email: session.user?.email ?? '' })
        }}</span>
      </template>
      <template #actions>
        <v-btn :disabled="secondsLeft > 0" :loading="resending" @click="resend">{{
          secondsLeft > 0
            ? t('verify.banner.resendIn', { seconds: secondsLeft })
            : t('verify.banner.resend')
        }}</v-btn>
        <v-btn v-if="dismissible" @click="dismiss">{{ t('verify.banner.dismiss') }}</v-btn>
      </template>
    </v-banner>
  </div>
</template>

<style scoped>
.verify-banner #verify-banner-text {
  overflow-wrap: anywhere;
}
</style>
