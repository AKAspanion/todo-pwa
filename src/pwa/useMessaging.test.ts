/**
 * Push messaging on the client (D19, P1–P3, Review Focus 4). Firebase Messaging, the device
 * service and auth are mocked: these tests pin when permission is asked for, which device
 * documents are saved and deleted, and how many foreground handlers exist. The device documents
 * themselves are tested against the emulator in src/services/devices.test.ts.
 *
 * useMessaging keeps one state per page session, so each test loads the modules afresh.
 */
import type { User } from 'firebase/auth';
import type { MessagePayload } from 'firebase/messaging';
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('firebase/messaging', () => ({
  isSupported: vi.fn(),
  getMessaging: vi.fn(() => ({ app: {} })),
  getToken: vi.fn(),
  deleteToken: vi.fn(),
  onMessage: vi.fn(() => () => {}),
}));
vi.mock('@/services/devices', () => ({ saveDevice: vi.fn(), removeDevice: vi.fn() }));
vi.mock('@/services/auth', () => ({ onUserChanged: vi.fn(), signOutUser: vi.fn() }));
vi.mock('@/services/tasks', () => ({
  listTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}));
vi.mock('@/services/labels', () => ({ listLabels: vi.fn(), createLabel: vi.fn() }));
vi.mock('@/services/notifications', () => ({
  listNotifications: vi.fn(async () => []),
  deleteNotification: vi.fn(),
}));
vi.mock('@/lib/firebase', () => ({ firebaseApp: {}, auth: {}, db: {} }));
vi.mock('@/router', () => ({ router: { push: vi.fn(async () => undefined) } }));
vi.mock('virtual:pwa-register', () => ({ registerSW: vi.fn(() => vi.fn(async () => {})) }));

const alice = { uid: 'alice', email: 'a@example.com', displayName: 'Alice', photoURL: null };
const bob = { uid: 'bob', email: 'b@example.com', displayName: 'Bob', photoURL: null };
const TOKEN_A = 'tok-A';
const registration = { scope: 'http://localhost/' } as ServiceWorkerRegistration;

/** A browser Notification API whose permission prompt answers `answer`. */
function stubNotification(permission: NotificationPermission, answer: NotificationPermission) {
  const requestPermission = vi.fn(async () => {
    FakeNotification.permission = answer;
    return answer;
  });
  class FakeNotification {
    static permission: NotificationPermission = permission;
    static requestPermission = requestPermission;
  }
  vi.stubGlobal('Notification', FakeNotification);
  return { requestPermission, FakeNotification };
}

function stubServiceWorker() {
  const container = {
    getRegistration: vi.fn(async () => registration),
    addEventListener: vi.fn(),
  };
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: container });
  return container;
}

/** Loads the app's modules afresh (a new page session), with a new Pinia, and starts the session. */
async function loadFresh() {
  vi.resetModules();
  const pinia = await import('pinia');
  const activePinia = pinia.createPinia();
  pinia.setActivePinia(activePinia);
  const fm = await import('firebase/messaging');
  const devices = await import('@/services/devices');
  const authService = await import('@/services/auth');
  const { router } = await import('@/router');
  let listener: ((u: User | null) => void) | undefined;
  vi.mocked(authService.onUserChanged).mockImplementation((cb) => {
    listener = cb;
    return () => {};
  });
  vi.mocked(authService.signOutUser).mockResolvedValue();
  const { useSessionStore } = await import('@/stores/session');
  const { useUiStore } = await import('@/stores/ui');
  const session = useSessionStore();
  session.start();
  const { useMessaging, DEVICE_STORAGE_KEY } = await import('./useMessaging');
  const { setupPwa } = await import('./index');
  const signIn = (u: typeof alice | null) => {
    if (!listener) throw new Error('the session did not subscribe');
    listener(u as unknown as User);
  };
  return {
    activePinia,
    fm,
    devices,
    authService,
    router,
    session,
    ui: useUiStore(),
    useMessaging,
    setupPwa,
    signIn,
    DEVICE_STORAGE_KEY,
  };
}

type Loaded = Awaited<ReturnType<typeof loadFresh>>;

function supportedBrowser(l: Loaded, permission: NotificationPermission = 'default') {
  vi.mocked(l.fm.isSupported).mockResolvedValue(true);
  vi.mocked(l.fm.getToken).mockResolvedValue(TOKEN_A);
  vi.mocked(l.fm.deleteToken).mockResolvedValue(true);
  vi.mocked(l.devices.saveDevice).mockResolvedValue();
  vi.mocked(l.devices.removeDevice).mockResolvedValue();
  stubServiceWorker();
  return stubNotification(permission, 'granted');
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  delete (navigator as { serviceWorker?: unknown }).serviceWorker;
});

describe('useMessaging where push is unsupported (P1)', () => {
  it('isSupported() false: supported is false and enable() resolves unsupported without asking', async () => {
    const l = await loadFresh();
    vi.mocked(l.fm.isSupported).mockResolvedValue(false);
    stubServiceWorker();
    const { requestPermission } = stubNotification('default', 'granted');

    const messaging = l.useMessaging();
    const result = await messaging.enable();

    expect(result).toBe('unsupported');
    expect(messaging.supported.value).toBe(false);
    expect(messaging.permission.value).toBe('unsupported');
    expect(requestPermission).not.toHaveBeenCalled();
    expect(l.fm.getMessaging).not.toHaveBeenCalled();
    expect(l.fm.getToken).not.toHaveBeenCalled();
  });

  it('nothing throws when window.Notification is undefined (iOS Safari)', async () => {
    const l = await loadFresh();
    vi.mocked(l.fm.isSupported).mockResolvedValue(true);
    stubServiceWorker();
    expect('Notification' in window).toBe(false);

    l.setupPwa();
    const messaging = l.useMessaging();
    await flushPromises();

    await expect(messaging.enable()).resolves.toBe('unsupported');
    expect(messaging.supported.value).toBe(false);
    expect(messaging.permission.value).toBe('unsupported');
    expect(l.fm.onMessage).not.toHaveBeenCalled();
  });
});

describe('useMessaging enable and disable (D19, P3)', () => {
  it('enable() granted saves users/{uid}/devices/{token} through the app service worker', async () => {
    const l = await loadFresh();
    const { requestPermission } = supportedBrowser(l);
    l.signIn(alice);
    const messaging = l.useMessaging();

    const result = await messaging.enable();

    expect(result).toBe('granted');
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(l.fm.getToken).toHaveBeenCalledWith(expect.anything(), {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    expect(l.devices.saveDevice).toHaveBeenCalledExactlyOnceWith('alice', TOKEN_A);
    expect(messaging.enabled.value).toBe(true);
    expect(messaging.permission.value).toBe('granted');
  });

  it('enable() denied saves nothing and reports denied', async () => {
    const l = await loadFresh();
    supportedBrowser(l);
    stubNotification('default', 'denied');
    l.signIn(alice);
    const messaging = l.useMessaging();

    await expect(messaging.enable()).resolves.toBe('denied');

    expect(l.fm.getToken).not.toHaveBeenCalled();
    expect(l.devices.saveDevice).not.toHaveBeenCalled();
    expect(messaging.permission.value).toBe('denied');
    expect(messaging.enabled.value).toBe(false);
  });

  it('enable() reports error, and logs only the code, when getToken fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const l = await loadFresh();
    supportedBrowser(l);
    vi.mocked(l.fm.getToken).mockRejectedValue(
      Object.assign(new Error('secret detail'), { code: 'messaging/token-subscribe-failed' }),
    );
    l.signIn(alice);
    const messaging = l.useMessaging();

    await expect(messaging.enable()).resolves.toBe('error');

    expect(l.devices.saveDevice).not.toHaveBeenCalled();
    expect(messaging.enabled.value).toBe(false);
    expect(warn).toHaveBeenCalledWith(
      '[messaging] enable failed:',
      'messaging/token-subscribe-failed',
    );
  });

  it('enable() signed out reports error without asking for permission', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const l = await loadFresh();
    const { requestPermission } = supportedBrowser(l);
    const messaging = l.useMessaging();

    await expect(messaging.enable()).resolves.toBe('error');

    expect(requestPermission).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith('[messaging] enable: nobody is signed in');
  });

  it("disable() deletes this device's doc and calls deleteToken; no other device is touched", async () => {
    const l = await loadFresh();
    supportedBrowser(l);
    l.signIn(alice);
    const messaging = l.useMessaging();
    await messaging.enable();

    await messaging.disable();

    expect(l.devices.removeDevice).toHaveBeenCalledExactlyOnceWith('alice', TOKEN_A);
    expect(l.fm.deleteToken).toHaveBeenCalledTimes(1);
    expect(messaging.enabled.value).toBe(false);
    expect(localStorage.getItem(l.DEVICE_STORAGE_KEY)).toBeNull();
  });

  it('disable() rejects and changes nothing when the delete fails', async () => {
    const l = await loadFresh();
    supportedBrowser(l);
    l.signIn(alice);
    const messaging = l.useMessaging();
    await messaging.enable();
    vi.mocked(l.devices.removeDevice).mockRejectedValue(new Error('unavailable'));

    await expect(messaging.disable()).rejects.toThrow('unavailable');

    expect(l.fm.deleteToken).not.toHaveBeenCalled();
    expect(messaging.enabled.value).toBe(true);
  });

  it('a permission revoked in the browser deletes the saved device on the next load (P3)', async () => {
    localStorage.setItem('pushDevice', JSON.stringify({ uid: 'alice', token: TOKEN_A }));
    const l = await loadFresh();
    supportedBrowser(l, 'denied');

    l.setupPwa();
    l.signIn(alice);

    await vi.waitFor(() =>
      expect(l.devices.removeDevice).toHaveBeenCalledExactlyOnceWith('alice', TOKEN_A),
    );
    expect(l.useMessaging().enabled.value).toBe(false);
    expect(l.fm.getToken).not.toHaveBeenCalled();
  });

  it('a saved record that is not a device is ignored', async () => {
    localStorage.setItem('pushDevice', JSON.stringify({ uid: 42, token: { __proto__: {} } }));
    const l = await loadFresh();
    supportedBrowser(l, 'denied');

    l.setupPwa();
    l.signIn(alice);
    await flushPromises();

    expect(l.devices.removeDevice).not.toHaveBeenCalled();
    expect(l.useMessaging().enabled.value).toBe(false);
  });
});

describe('two accounts on one browser (Review Focus 4)', () => {
  it('signing out runs removeDevice before the auth sign-out, and user B gets no device of A', async () => {
    const l = await loadFresh();
    supportedBrowser(l);
    l.setupPwa();
    l.signIn(alice);
    const messaging = l.useMessaging();
    await messaging.enable();
    const order: string[] = [];
    vi.mocked(l.devices.removeDevice).mockImplementation(async (uid, token) => {
      order.push(`removeDevice ${uid} ${token}`);
    });
    vi.mocked(l.fm.deleteToken).mockImplementation(async () => {
      order.push('deleteToken');
      return true;
    });
    vi.mocked(l.authService.signOutUser).mockImplementation(async () => {
      order.push('signOutUser');
    });

    await l.session.signOut();
    l.signIn(null);
    l.signIn(bob);
    await flushPromises();

    expect(order).toEqual([`removeDevice alice ${TOKEN_A}`, 'deleteToken', 'signOutUser']);
    expect(l.devices.saveDevice).toHaveBeenCalledExactlyOnceWith('alice', TOKEN_A);
    expect(messaging.enabled.value).toBe(false);
  });

  it("revokes the token when another account's device is still saved on this browser", async () => {
    localStorage.setItem('pushDevice', JSON.stringify({ uid: 'alice', token: TOKEN_A }));
    const l = await loadFresh();
    supportedBrowser(l, 'granted');

    l.setupPwa();
    l.signIn(bob);

    await vi.waitFor(() => expect(l.fm.deleteToken).toHaveBeenCalledTimes(1));
    expect(l.devices.saveDevice).not.toHaveBeenCalled();
    expect(l.useMessaging().enabled.value).toBe(false);
    expect(localStorage.getItem(l.DEVICE_STORAGE_KEY)).toBeNull();
  });

  it('the token is revoked on sign-out even when the delete fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const l = await loadFresh();
    supportedBrowser(l);
    l.signIn(alice);
    const messaging = l.useMessaging();
    await messaging.enable();
    vi.mocked(l.devices.removeDevice).mockRejectedValue(new Error('unavailable'));

    await l.session.signOut();

    expect(l.fm.deleteToken).toHaveBeenCalledTimes(1);
    expect(l.authService.signOutUser).toHaveBeenCalledTimes(1);
  });
});

describe('the foreground handler (P2)', () => {
  it('mounting the app, signing out and in three times leaves exactly one onMessage registration', async () => {
    const l = await loadFresh();
    supportedBrowser(l);

    l.setupPwa();
    l.signIn(alice);
    await flushPromises();
    for (let i = 0; i < 3; i += 1) {
      await l.session.signOut();
      l.signIn(null);
      l.signIn(i % 2 === 0 ? bob : alice);
      l.setupPwa();
      l.useMessaging();
      await flushPromises();
    }

    expect(l.fm.onMessage).toHaveBeenCalledTimes(1);
    expect(l.fm.getMessaging).toHaveBeenCalledTimes(1);
  });

  it('shows a foreground reminder in the snackbar with View, which opens /notification', async () => {
    const l = await loadFresh();
    supportedBrowser(l);
    l.setupPwa();
    await vi.waitFor(() => expect(l.fm.onMessage).toHaveBeenCalledTimes(1));
    const handler = vi.mocked(l.fm.onMessage).mock.calls[0]?.[1] as (p: MessagePayload) => void;

    handler({
      notification: { title: 'Reminder', body: 'Buy milk' },
      data: { taskId: 't1' },
      from: 'fcm',
      collapseKey: '',
      messageId: 'm1',
    });

    expect(l.ui.snack).toMatchObject({ text: 'Reminder: Buy milk', actionLabel: 'View' });
    l.ui.snack?.action?.();
    expect(l.router.push).toHaveBeenCalledWith('/notification');
  });
});

describe('permission is asked for only from the toggle (P1)', () => {
  it('mounting the notifications screen and changing user never calls enable()', async () => {
    const l = await loadFresh();
    const { requestPermission } = supportedBrowser(l);
    const [{ default: NotificationsView }, { i18n }, { vuetify }] = await Promise.all([
      import('@/views/NotificationsView.vue'),
      import('@/plugins/i18n'),
      import('@/plugins/vuetify'),
    ]);
    const messaging = l.useMessaging();
    const enable = vi.spyOn(messaging, 'enable');

    l.setupPwa();
    l.signIn(alice);
    const wrapper = mount(NotificationsView, {
      global: { plugins: [l.activePinia, i18n, vuetify] },
    });
    await flushPromises();
    await l.session.signOut();
    l.signIn(null);
    l.signIn(bob);
    await flushPromises();

    expect(enable).not.toHaveBeenCalled();
    expect(requestPermission).not.toHaveBeenCalled();
    expect(l.fm.getToken).not.toHaveBeenCalled();

    // A click on the toggle is what asks.
    await wrapper.get('[data-testid="push-toggle"] input').trigger('click');
    await flushPromises();

    expect(enable).toHaveBeenCalledTimes(1);
    expect(requestPermission).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });
});
