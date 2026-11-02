/**
 * The old Vue 2 app's service workers are unregistered at startup (security review C1, I2): the
 * Workbox worker at /service-worker.js and the FCM worker at /firebase-messaging-sw.js, whose
 * scope is /firebase-cloud-messaging-push-scope. The app's own worker, /sw.js, is kept.
 * navigator.serviceWorker is stubbed with fake registrations.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { unregisterLegacyWorkers } from './legacyWorkers';

const ORIGIN = 'https://todo.spanion.in';

function fakeRegistration(scope: string, script: string | null) {
  const worker = script === null ? null : { scriptURL: `${ORIGIN}${script}` };
  return {
    scope: `${ORIGIN}${scope}`,
    active: worker,
    waiting: null,
    installing: null,
    unregister: vi.fn(async () => true),
  };
}

function stubRegistrations(registrations: ReturnType<typeof fakeRegistration>[]) {
  vi.stubGlobal('navigator', {
    serviceWorker: { getRegistrations: vi.fn(async () => registrations) },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('unregisterLegacyWorkers', () => {
  it('unregisters the old Workbox worker, the old FCM worker and anything at the FCM scope', async () => {
    const workbox = fakeRegistration('/', '/service-worker.js');
    const fcm = fakeRegistration('/firebase-cloud-messaging-push-scope', '/firebase-messaging-sw.js');
    const atFcmScope = fakeRegistration('/firebase-cloud-messaging-push-scope', null);
    const fcmAtRoot = fakeRegistration('/', '/firebase-messaging-sw.js');
    stubRegistrations([workbox, fcm, atFcmScope, fcmAtRoot]);

    await unregisterLegacyWorkers();

    expect(workbox.unregister).toHaveBeenCalledTimes(1);
    expect(fcm.unregister).toHaveBeenCalledTimes(1);
    expect(atFcmScope.unregister).toHaveBeenCalledTimes(1);
    expect(fcmAtRoot.unregister).toHaveBeenCalledTimes(1);
  });

  it("finds a legacy script on a waiting or installing worker", async () => {
    const waiting = { ...fakeRegistration('/', null), waiting: { scriptURL: `${ORIGIN}/service-worker.js` } };
    const installing = {
      ...fakeRegistration('/', null),
      installing: { scriptURL: `${ORIGIN}/firebase-messaging-sw.js` },
    };
    stubRegistrations([waiting, installing] as ReturnType<typeof fakeRegistration>[]);

    await unregisterLegacyWorkers();

    expect(waiting.unregister).toHaveBeenCalledTimes(1);
    expect(installing.unregister).toHaveBeenCalledTimes(1);
  });

  it("keeps the app's own /sw.js registration", async () => {
    const own = fakeRegistration('/', '/sw.js');
    const legacy = fakeRegistration('/', '/service-worker.js');
    stubRegistrations([own, legacy]);

    await unregisterLegacyWorkers();

    expect(own.unregister).not.toHaveBeenCalled();
    expect(legacy.unregister).toHaveBeenCalledTimes(1);
  });

  it('does nothing where the browser has no service worker support', async () => {
    vi.stubGlobal('navigator', {});
    await expect(unregisterLegacyWorkers()).resolves.toBeUndefined();
  });

  it('logs a failed unregister and still unregisters the others', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const failing = fakeRegistration('/', '/service-worker.js');
    failing.unregister.mockRejectedValueOnce(new Error('boom'));
    const fcm = fakeRegistration('/firebase-cloud-messaging-push-scope', '/firebase-messaging-sw.js');
    stubRegistrations([failing, fcm]);

    await expect(unregisterLegacyWorkers()).resolves.toBeUndefined();

    expect(fcm.unregister).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.join(' ')).toContain('/service-worker.js');
  });

  it('logs a failed lookup of the registrations instead of throwing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('navigator', {
      serviceWorker: { getRegistrations: vi.fn(async () => Promise.reject(new Error('denied'))) },
    });

    await expect(unregisterLegacyWorkers()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
