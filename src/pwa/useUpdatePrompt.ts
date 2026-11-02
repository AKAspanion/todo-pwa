/**
 * Registers the service worker and offers each new release instead of forcing it (D20): when a new
 * worker is waiting, the snackbar says "A new version is available" with a Reload action, and the
 * page reloads only when the user clicks it, so a half-written task is never discarded.
 */
import { registerSW } from 'virtual:pwa-register';
import { i18n } from '@/plugins/i18n';
import { errorCode } from '@/stores/session';
import { useUiStore } from '@/stores/ui';

/** Vuetify keeps a snack with this timeout until it is dismissed or its action is clicked. */
const UNTIL_DISMISSED = -1;

let started = false;
/** The user clicked Reload in this tab. Another tab's choice never reloads this one. */
let chosen = false;
let reloading = false;

function reloadOnce(): void {
  if (!chosen || reloading) return;
  reloading = true;
  window.location.reload();
}

export function useUpdatePrompt(): void {
  if (started) return;
  started = true;
  const { t } = i18n.global;

  /** The user chose the new version: the waiting worker takes over, then the page reloads. */
  async function activateNewVersion(): Promise<void> {
    chosen = true;
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration?.waiting) {
      // Another tab already let the new version take over: only this page is left to reload.
      reloadOnce();
      return;
    }
    // vite-plugin-pwa reloads on this only when the page was already controlled when it loaded;
    // on a first visit the page must reload itself once the new worker controls it.
    navigator.serviceWorker.addEventListener('controllerchange', reloadOnce, { once: true });
    await updateServiceWorker();
  }

  const updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      useUiStore().showSnack(t('pwa.update.available'), {
        actionLabel: t('pwa.update.reload'),
        action: () => {
          activateNewVersion().catch((error: unknown) => {
            console.warn('[pwa] could not activate the new version:', errorCode(error));
          });
        },
        timeoutMs: UNTIL_DISMISSED,
      });
    },
    // Called when a new worker takes control, which another tab's Reload can cause: this tab
    // reloads only if its own user chose to, and otherwise keeps the prompt and what is typed.
    onNeedReload: reloadOnce,
    onRegisterError(error: unknown) {
      console.warn('[pwa] service worker registration failed:', errorCode(error));
    },
  });
}
