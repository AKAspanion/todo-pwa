/**
 * Signing out from the menu or from Profile's Account card: one flow, and one `signingOut` flag
 * that both share, so the menu's signed-out watcher stays out of the way of either (it would
 * otherwise send the page to sign-in with a `redirect` back to it).
 */
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { authErrorCode } from '@/lib/authForm';
import { useSessionStore } from '@/stores/session';
import { useUiStore } from '@/stores/ui';

/** True from the moment a sign-out starts until its navigation to sign-in has been made. */
const signingOut = ref(false);

export function useSignOut() {
  const { t } = useI18n();
  const router = useRouter();
  const session = useSessionStore();
  const ui = useUiStore();

  /**
   * Signs out, goes to plain /signin and says so. Resolves true once signed out; on failure it
   * says so, stays put and resolves false.
   */
  async function signOut(): Promise<boolean> {
    if (signingOut.value) return false;
    signingOut.value = true;
    try {
      await session.signOut();
      await router.replace('/signin');
      ui.showSnack(t('auth.menu.signedOut'));
      return true;
    } catch (error) {
      console.warn('[auth] sign-out failed:', authErrorCode(error) || 'unknown');
      ui.showSnack(t('auth.menu.signOutFailed'));
      return false;
    } finally {
      signingOut.value = false;
    }
  }

  return { signingOut, signOut };
}
