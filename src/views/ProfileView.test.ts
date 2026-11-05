/**
 * Profile's Account card (D1) and its pickup of Google's re-confirmation redirect on load (D4),
 * with the auth and account services mocked.
 */
import type { User } from 'firebase/auth';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { i18n } from '@/plugins/i18n';
import { vuetify } from '@/plugins/vuetify';
import { accountProviders } from '@/services/account';
import { consumeRedirectResult } from '@/services/auth';
import { listLabels } from '@/services/labels';
import { useSessionStore } from '@/stores/session';
import ProfileView from './ProfileView.vue';

vi.mock('@/services/auth', () => ({
  consumeRedirectResult: vi.fn(),
  updateDisplayName: vi.fn(),
  onUserChanged: vi.fn(),
  signOutUser: vi.fn(),
}));
vi.mock('@/services/account', () => ({
  accountProviders: vi.fn(),
  confirmWithPassword: vi.fn(),
  confirmWithGoogle: vi.fn(),
  deleteCurrentUser: vi.fn(),
}));
vi.mock('@/services/tasks', () => ({
  listTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}));
vi.mock('@/services/labels', () => ({
  LABEL_NAME_MAX: 30,
  listLabels: vi.fn(),
  createLabel: vi.fn(),
}));
vi.mock('@/services/notifications', () => ({
  listNotifications: vi.fn(),
  deleteNotification: vi.fn(),
}));

/** Vuetify's inputs measure themselves; jsdom has no ResizeObserver. */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

/** Vuetify's overlays place themselves in the visual viewport; jsdom has none. */
const visualViewportStub = {
  width: 1024,
  height: 768,
  offsetLeft: 0,
  offsetTop: 0,
  pageLeft: 0,
  pageTop: 0,
  scale: 1,
  addEventListener(): void {},
  removeEventListener(): void {},
};

const Blank = { render: () => h('div') };
const alice = { uid: 'alice', email: 'alice@example.com', displayName: 'Alice', photoURL: null };

function firebaseError(code: string): Error {
  return Object.assign(new Error(`Firebase: internal detail (${code}).`), { code });
}

let wrapper: VueWrapper | null = null;

/** Mounts /profile with Alice signed in, as a page load does. */
async function loadProfile(): Promise<VueWrapper> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ['/profile', '/signin', '/privacy', '/delete-account'].map((path) => ({
      path,
      component: Blank,
    })),
  });
  await router.push('/profile');
  await router.isReady();
  const pinia = createPinia();
  setActivePinia(pinia);
  useSessionStore().user = { ...alice };
  wrapper = mount(ProfileView, {
    global: { plugins: [router, vuetify, i18n, pinia] },
    attachTo: document.body,
  });
  await flushPromises();
  return wrapper;
}

function unmountProfile(): void {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
}

function openDialog(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-testid="delete-account-dialog"]');
}

/** The dialog's DELETE field, found by its label. */
function wordField(): HTMLInputElement {
  const dialog = openDialog();
  const label = [...(dialog?.querySelectorAll('label[for]') ?? [])].find(
    (l) => l.textContent?.trim() === 'Type DELETE to confirm',
  );
  const field = document.getElementById(label?.getAttribute('for') ?? '');
  if (!(field instanceof HTMLInputElement)) throw new Error('no DELETE field');
  return field;
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  vi.stubGlobal('visualViewport', visualViewportStub);
  i18n.global.locale.value = 'en';
  vi.mocked(consumeRedirectResult).mockReset().mockResolvedValue(null);
  vi.mocked(accountProviders).mockReset().mockReturnValue(['google.com']);
  vi.mocked(listLabels).mockReset().mockResolvedValue([]);
});

afterEach(() => {
  unmountProfile();
  vi.restoreAllMocks();
});

describe('ProfileView: the Account card (D1)', () => {
  it('sits below the labels, with a Privacy policy link and a Delete account button', async () => {
    const profile = await loadProfile();

    const headings = profile.findAll('h2').map((h2) => h2.text());
    expect(headings).toEqual(['LABELS', 'Account']);
    const privacy = profile.get('a[href="/privacy"]');
    expect(privacy.text()).toBe('Privacy policy');
    const remove = profile.findAll('button').find((b) => b.text() === 'Delete account');
    expect(remove).toBeDefined();
    expect(openDialog()).toBeNull();

    await remove?.trigger('click');
    await flushPromises();

    expect(openDialog()?.textContent).toContain('Delete your account?');
    expect(wordField().disabled).toBe(true);
  });
});

describe('ProfileView: back from Google’s re-confirmation (D4)', () => {
  it('a re-authentication of the signed-in user opens the dialog confirmed', async () => {
    vi.mocked(consumeRedirectResult).mockResolvedValue({
      user: { uid: 'alice' } as User,
      operation: 'reauthenticate',
    });

    await loadProfile();

    expect(openDialog()?.textContent).toContain('Confirmed. Now type DELETE.');
    expect(wordField().disabled).toBe(false);
  });

  it('a re-authentication of another uid opens nothing', async () => {
    vi.mocked(consumeRedirectResult).mockResolvedValue({
      user: { uid: 'mallory' } as User,
      operation: 'reauthenticate',
    });

    await loadProfile();

    expect(openDialog()).toBeNull();
  });

  it('a sign-in outcome opens nothing', async () => {
    vi.mocked(consumeRedirectResult).mockResolvedValue({
      user: { uid: 'alice' } as User,
      operation: 'signIn',
    });

    await loadProfile();

    expect(openDialog()).toBeNull();
  });

  it('auth/user-mismatch opens the dialog unconfirmed, saying it was another account', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(consumeRedirectResult).mockRejectedValue(firebaseError('auth/user-mismatch'));

    await loadProfile();

    expect(openDialog()?.textContent).toContain(
      "That Google account isn't the one you're signed in with.",
    );
    expect(openDialog()?.textContent).not.toContain('Confirmed. Now type DELETE.');
    expect(wordField().disabled).toBe(true);
    expect(warn).toHaveBeenCalledWith(
      '[profile] Google re-confirmation failed:',
      'auth/user-mismatch',
    );
  });

  it('another redirect error opens the dialog with that code’s translated message', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(consumeRedirectResult).mockRejectedValue(
      firebaseError('auth/network-request-failed'),
    );

    await loadProfile();

    expect(openDialog()?.textContent).toContain(
      "Couldn't reach the server. Check your connection and try again.",
    );
    expect(openDialog()?.textContent).not.toContain('internal detail');
    expect(wordField().disabled).toBe(true);
  });

  it('no redirect (null) opens no dialog', async () => {
    await loadProfile();

    expect(consumeRedirectResult).toHaveBeenCalledTimes(1);
    expect(openDialog()).toBeNull();
  });

  it('a second load after a pickup, whose result is now null, opens no dialog', async () => {
    vi.mocked(consumeRedirectResult).mockResolvedValueOnce({
      user: { uid: 'alice' } as User,
      operation: 'reauthenticate',
    });
    await loadProfile();
    expect(openDialog()).not.toBeNull();
    unmountProfile();

    await loadProfile();

    expect(openDialog()).toBeNull();
  });
});
