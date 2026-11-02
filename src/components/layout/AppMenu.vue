<!-- The app bar and its menu: who is signed in, language, theme, the author link and sign-out. -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { authErrorCode } from '@/lib/authForm';
import { useSessionStore } from '@/stores/session';
import { useUiStore, type Locale } from '@/stores/ui';

const AUTHOR_URL = 'https://www.spanion.xyz';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const ui = useUiStore();

const open = ref(false);
const signingOut = ref(false);

/** Shown on the app's own screens only: never on sign-in or sign-up. */
const visible = computed(() => session.user !== null && route.meta.requireAuth === true);
const name = computed(() => session.user?.displayName || session.user?.email || '');
const initial = computed(() => [...name.value.trim()][0]?.toUpperCase() ?? '?');
/** The profile photo, only over https: the URL comes from the account, which anyone can set. */
const photo = computed(() => {
  const raw = session.user?.photoURL;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol === 'https:') return url.href;
  } catch {
    // Not a URL at all: handled with the other rejections below.
  }
  console.warn('[auth] ignored a profile photo that is not an https URL');
  return null;
});

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
  <v-app-bar v-if="visible" density="compact" flat border="b">
    <v-app-bar-title>{{ t('common.appName') }}</v-app-bar-title>
    <template #append>
      <v-menu v-model="open" location="bottom end" :close-on-content-click="false">
        <template #activator="{ props: activator }">
          <v-btn v-bind="activator" icon :aria-label="t('auth.menu.open')" data-testid="app-menu">
            <v-avatar size="32" color="primary">
              <v-img v-if="photo" :src="photo" alt="" />
              <span v-else aria-hidden="true">{{ initial }}</span>
            </v-avatar>
          </v-btn>
        </template>

        <v-list :aria-label="t('auth.menu.label')" min-width="300" max-width="360">
          <v-list-item :title="name" :subtitle="session.user?.email ?? undefined">
            <template #prepend>
              <v-avatar size="40" color="primary">
                <v-img v-if="photo" :src="photo" alt="" />
                <span v-else aria-hidden="true">{{ initial }}</span>
              </v-avatar>
            </template>
          </v-list-item>

          <v-divider class="my-1" />
          <v-list-subheader>{{ t('auth.menu.options') }}</v-list-subheader>

          <v-list-item :title="t('auth.language.label')">
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

          <v-list-item>
            <v-switch
              v-model="dark"
              color="primary"
              density="compact"
              hide-details
              inset
              :label="t('auth.menu.darkMode')"
            />
          </v-list-item>

          <v-divider class="my-1" />

          <!-- An action, not a place: a button to assistive tech (Vuetify gives it role listitem). -->
          <v-list-item
            role="button"
            prepend-icon="mdi-logout-variant"
            :title="t('auth.menu.signOut')"
            :disabled="signingOut"
            @click="signOut"
          />

          <v-divider class="my-1" />

          <v-list-item
            :href="AUTHOR_URL"
            target="_blank"
            rel="noopener noreferrer"
            prepend-icon="mdi-heart"
            :title="t('auth.menu.author')"
          />
        </v-list>
      </v-menu>
    </template>
  </v-app-bar>
</template>
