/**
 * Unregisters the old Vue 2 app's service workers (security review C1, I2). That app registered
 * a Workbox worker, /service-worker.js, at scope "/", and Firebase's FCM worker,
 * /firebase-messaging-sw.js, at /firebase-cloud-messaging-push-scope. Both files are now kill
 * switches (public/), but a browser re-checks the FCM registration only on a push to it or a
 * register() call, so its kill switch may never run: the new app removes both itself, at startup.
 *
 * It never touches the app's own worker, /sw.js. It never throws: where service workers are
 * unsupported it does nothing, and each failure is logged with console.warn.
 */

const LEGACY_SCRIPTS = new Set(['/service-worker.js', '/firebase-messaging-sw.js']);
const LEGACY_SCOPE = '/firebase-cloud-messaging-push-scope';

function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function isLegacy(registration: ServiceWorkerRegistration): boolean {
  const scope = pathOf(registration.scope).replace(/\/+$/, '');
  if (scope.endsWith(LEGACY_SCOPE)) return true;
  const workers = [registration.active, registration.waiting, registration.installing];
  return workers.some((worker) => worker != null && LEGACY_SCRIPTS.has(pathOf(worker.scriptURL)));
}

export async function unregisterLegacyWorkers(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) return;
  let registrations: readonly ServiceWorkerRegistration[];
  try {
    registrations = await navigator.serviceWorker.getRegistrations();
  } catch (error) {
    console.warn('Could not list service worker registrations', error);
    return;
  }
  await Promise.all(
    registrations.filter(isLegacy).map(async (registration) => {
      try {
        await registration.unregister();
      } catch (error) {
        const script =
          (registration.active ?? registration.waiting ?? registration.installing)?.scriptURL ?? '';
        console.warn(
          `Could not unregister the legacy service worker ${script} at ${registration.scope}`,
          error,
        );
      }
    }),
  );
}
