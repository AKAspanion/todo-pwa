<script setup lang="ts">
/**
 * Profile's Account card (D1), drawn like the labels card above it: the privacy policy (W2), Sign
 * out (the menu's flow, `useSignOut`) and Delete account, whose dialog it owns. Profile calls
 * `openDialog` when Google's re-confirmation redirect comes back (D4).
 */
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSignOut } from '@/composables/useSignOut';
import DeleteAccountDialog from './DeleteAccountDialog.vue';

const { t } = useI18n();
const { signingOut, signOut } = useSignOut();

const dialogOpen = ref(false);
const dialogConfirmed = ref(false);
/** The locale key of a message the dialog opens with, or null. */
const dialogMessage = ref<string | null>(null);

/** Opens the delete dialog, already confirmed or not, with a message (a locale key) or none. */
function openDialog(confirmed: boolean, message: string | null): void {
  dialogConfirmed.value = confirmed;
  dialogMessage.value = message;
  dialogOpen.value = true;
}

defineExpose({ openDialog });
</script>

<template>
  <section class="account" aria-labelledby="profile-account-heading">
    <h2 id="profile-account-heading" class="account__heading text-overline text-left py-3">
      {{ t('profile.account.title') }}
    </h2>
    <v-card variant="outlined" class="account__card">
      <router-link to="/privacy" class="account__item">
        <v-icon icon="mdi-shield-account" class="account__icon" />
        <span class="account__text">{{ t('profile.account.privacy') }}</span>
      </router-link>
      <button type="button" class="account__item" :disabled="signingOut" @click="signOut">
        <v-icon icon="mdi-logout-variant" class="account__icon" />
        <span class="account__text">{{ t('auth.menu.signOut') }}</span>
      </button>
      <button type="button" class="account__item" @click="openDialog(false, null)">
        <v-icon icon="mdi-delete" class="account__icon" />
        <span class="account__text">{{ t('profile.delete.button') }}</span>
      </button>
    </v-card>
    <DeleteAccountDialog
      :open="dialogOpen"
      :confirmed="dialogConfirmed"
      :message="dialogMessage"
      @close="dialogOpen = false"
    />
  </section>
</template>

<!-- Rows sized and spaced as the labels list's rows (ProfileView.vue's .profile__item). -->
<style scoped>
.account__heading {
  margin: 0;
}
.account__card {
  padding: 8px 0;
  border-color: rgba(var(--v-border-color), var(--v-border-opacity));
  text-align: left;
}
.account__item {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 56px;
  padding: 0 16px;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}
.account__item:disabled {
  cursor: progress;
  opacity: 0.6;
}
.account__item:hover {
  background: rgba(var(--v-theme-on-surface), var(--v-hover-opacity));
}
.account__item:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: -2px;
}
.account__icon {
  width: 40px;
  margin-right: 28px;
}
.account__text {
  font-size: 0.875rem;
}
</style>
