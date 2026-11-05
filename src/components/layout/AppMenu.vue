<!-- The app bar and its menu: who is signed in, language, theme, the author link and sign-out. -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { authErrorCode } from '@/lib/authForm';
import { httpsPhotoUrl } from '@/lib/photo';
import heartIcon from '@/assets/heart-icon.png';
import { useSessionStore } from '@/stores/session';
import { useUiStore, type Locale } from '@/stores/ui';

const AUTHOR_URL = 'https://spanion.in';

const { t } = useI18n();
const { smAndUp } = useDisplay();
const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const ui = useUiStore();

const open = ref(false);
const signingOut = ref(false);

/** Shown on the app's own screens only: never on sign-in or sign-up. */
const visible = computed(() => session.user !== null && route.meta.requireAuth === true);
/** The old app's bars: home and profile are the blue bar, every other route a plain one with a back arrow. */
const isHome = computed(() => route.meta.nav === 'home');
const plain = computed(() => route.meta.nav !== 'home' && route.meta.nav !== 'profile');
/** The old back arrow went to home. */
function goHome(): void {
  void router.push('/home');
}
const name = computed(() => session.user?.displayName || session.user?.email || '');
/** The email under the name, only when there is a name: with none, the name already is the email. */
const subtitle = computed(() =>
  session.user?.displayName ? (session.user.email ?? undefined) : undefined,
);
const initial = computed(() => [...name.value.trim()][0]?.toUpperCase() ?? '?');
/** The profile photo, only over https (src/lib/photo.ts). */
const photo = computed(() => httpsPhotoUrl(session.user?.photoURL));

const locale = computed({
  get: () => ui.locale,
  set: (l: Locale) => ui.setLocale(l),
});
const dark = computed({
  get: () => ui.theme === 'dark',
  set: (on: boolean | null) => ui.setTheme(on ? 'dark' : 'light'),
});

async function signOut(): Promise<void> {
  if (signingOut.value) return;
  signingOut.value = true;
  try {
    await session.signOut();
    open.value = false;
    await router.replace('/signin');
    ui.showSnack(t('auth.menu.signedOut'));
  } catch (error) {
    console.warn('[auth] sign-out failed:', authErrorCode(error) || 'unknown');
    ui.showSnack(t('auth.menu.signOutFailed'));
  } finally {
    signingOut.value = false;
  }
}

// Signed out elsewhere (another tab, an expired session): leave the page for sign-in, which
// brings the user back here afterwards. A sign-out from this menu goes to plain /signin instead.
watch(
  () => session.user,
  (user, previous) => {
    if (previous && !user && !signingOut.value && route.meta.requireAuth) {
      void router.replace({ path: '/signin', query: { redirect: route.fullPath } });
    }
  },
);
</script>

<template>
  <v-app-bar
    v-if="visible"
    height="80"
    flat
    :color="plain ? undefined : 'primary'"
    :class="smAndUp ? 'px-3' : ''"
  >
    <div class="bar-slot bar-left">
      <v-avatar v-if="isHome" variant="text" aria-hidden="true">
        <v-icon icon="mdi-check-all" size="24" />
      </v-avatar>
      <v-btn
        v-else
        icon="mdi-arrow-left"
        variant="text"
        :aria-label="t('common.bar.back')"
        data-testid="app-back"
        @click="goHome"
      />
    </div>
    <v-spacer />
    <div class="bar-slot">
      <v-chip v-if="route.meta.nav" size="small" variant="outlined">
        {{ isHome ? t('common.nav.home') : t(`common.bar.${route.meta.nav}`) }}
      </v-chip>
    </div>
    <v-spacer />
    <div class="bar-slot bar-right">
      <v-menu
        v-model="open"
        location="bottom end"
        origin="top right"
        transition="scale-transition"
        min-width="348"
        :close-on-content-click="false"
      >
        <template #activator="{ props: activator }">
          <v-btn
            v-bind="activator"
            icon="mdi-dots-horizontal"
            variant="text"
            :aria-label="t('auth.menu.open')"
            data-testid="app-menu"
          />
        </template>

        <v-list :aria-label="t('auth.menu.label')">
          <v-list-item :title="name" :subtitle="subtitle" class="text-left">
            <template #prepend>
              <v-avatar size="40" color="primary">
                <v-img v-if="photo" :src="photo" alt="" />
                <span v-else aria-hidden="true">{{ initial }}</span>
              </v-avatar>
            </template>
          </v-list-item>

          <v-list-subheader class="text-overline">{{ t('auth.menu.options') }}</v-list-subheader>

          <v-list-item :title="t('auth.language.label')" class="text-left">
            <template #append>
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
            </template>
          </v-list-item>

          <v-list-item class="text-left">
            <v-switch
              v-model="dark"
              color="primary"
              density="compact"
              hide-details
              :label="t('auth.menu.darkMode')"
            />
          </v-list-item>

          <!-- An action, not a place: a button to assistive tech (Vuetify gives it role listitem). -->
          <v-list-item
            role="button"
            :title="t('auth.menu.signOut')"
            :disabled="signingOut"
            class="text-left"
            @click="signOut"
          >
            <template #append>
              <v-avatar size="36" variant="text" aria-hidden="true">
                <v-icon icon="mdi-logout-variant" />
              </v-avatar>
            </template>
          </v-list-item>

          <v-divider class="mt-1" />

          <v-list-item
            :href="AUTHOR_URL"
            target="_blank"
            rel="noopener noreferrer"
            class="made-by text-center text-overline pt-5"
          >
            <img :src="heartIcon" alt="" />
            {{ t('auth.menu.author') }}
          </v-list-item>
        </v-list>
      </v-menu>
    </div>
  </v-app-bar>
</template>

<style scoped>
.bar-slot {
  min-width: 48px;
}
.bar-left {
  margin-left: 4px;
}
.bar-right {
  margin-right: 4px;
}
.made-by img {
  width: 12px;
  height: 12px;
  margin: 0 4px;
  animation: heartbeat 1s infinite ease;
}
</style>
