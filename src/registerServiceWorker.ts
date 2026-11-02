/* tslint:disable:no-console */

import { register } from 'register-service-worker';

if (process.env.NODE_ENV === 'production') {
  // A new release activates immediately (skipWaiting) and drops the old precache,
  // so reload once to stop this tab requesting chunks that no longer exist.
  // Skipped on first install, when there was no controlling worker yet.
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) {
        return;
      }
      reloading = true;
      window.location.reload();
    });
  }

  register(`${process.env.BASE_URL}service-worker.js`, {
    ready() {
      console.log(
        'App is being served from cache by a service worker.\n' +
        'For more details, visit https://goo.gl/AFskqB',
      );
    },
    registered() {
      console.log('Service worker has been registered.');
    },
    cached() {
      console.log('Content has been cached for offline use.');
    },
    updatefound() {
      console.log('New content is downloading.');
    },
    updated() {
      console.log('New content is available; please refresh.');
    },
    offline() {
      console.log('No internet connection found. App is running in offline mode.');
    },
    error(error) {
      console.error('Error during service worker registration:', error);
    },
  });
}
