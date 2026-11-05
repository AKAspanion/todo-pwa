/**
 * The delete-account dialog with the account service mocked: it confirms the user by the providers
 * they have (D2), by password in place (D3) or by Google's redirect (D4), asks for the typed word,
 * and deletes through the session store (D5).
 */
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import { i18n } from '@/plugins/i18n';
import { vuetify } from '@/plugins/vuetify';
import {
  accountProviders,
  confirmWithGoogle,
  confirmWithPassword,
  deleteCurrentUser,
} from '@/services/account';
import { useSessionStore } from '@/stores/session';
import { useUiStore } from '@/stores/ui';
import DeleteAccountDialog from './DeleteAccountDialog.vue';

vi.mock('@/services/account', () => ({
  accountProviders: vi.fn(),
  confirmWithPassword: vi.fn(),
  confirmWithGoogle: vi.fn(),
  deleteCurrentUser: vi.fn(),
}));
vi.mock('@/services/auth', () => ({ onUserChanged: vi.fn(), signOutUser: vi.fn() }));
vi.mock('@/services/tasks', () => ({
  listTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}));
vi.mock('@/services/labels', () => ({ listLabels: vi.fn(), createLabel: vi.fn() }));
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

function firebaseError(code: string): Error {
  return Object.assign(new Error(`Firebase: internal detail (${code}).`), { code });
}

let wrapper: VueWrapper | null = null;
let router: Router;

async function mountDialog(props: { confirmed?: boolean; message?: string | null } = {}) {
  router = createRouter({
    history: createMemoryHistory(),
    routes: ['/profile', '/signin', '/delete-account', '/privacy'].map((path) => ({
      path,
      component: Blank,
    })),
  });
  await router.push('/profile');
  await router.isReady();
  const pinia = createPinia();
  setActivePinia(pinia);
  wrapper = mount(DeleteAccountDialog, {
    props: { open: true, confirmed: props.confirmed ?? false, message: props.message ?? null },
    global: { plugins: [router, vuetify, i18n, pinia] },
    attachTo: document.body,
  });
  await flushPromises();
  return wrapper;
}

function dialog(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[data-testid="delete-account-dialog"]');
  if (!el) throw new Error('the dialog is not open');
  return el;
}

function findButton(text: string): HTMLButtonElement | undefined {
  return [...dialog().querySelectorAll('button')].find((b) => b.textContent?.trim() === text);
}

function button(text: string): HTMLButtonElement {
  const found = findButton(text);
  if (!found) throw new Error(`no "${text}" button`);
  return found;
}

/** The input a visible label names, as a person finds it (Vuetify adds an unlinked twin). */
function findInput(label: string): HTMLInputElement | null {
  const labelEl = [...dialog().querySelectorAll('label[for]')].find(
    (l) => l.textContent?.trim() === label,
  );
  const id = labelEl?.getAttribute('for');
  return id ? document.querySelector<HTMLInputElement>(`#${CSS.escape(id)}`) : null;
}

function input(label: string): HTMLInputElement {
  const found = findInput(label);
  if (!found) throw new Error(`no "${label}" field`);
  return found;
}

async function type(el: HTMLInputElement, value: string): Promise<void> {
  el.value = value;
  el.dispatchEvent(new Event('input'));
  await flushPromises();
}

async function click(el: HTMLElement): Promise<void> {
  el.click();
  await flushPromises();
}

/** Vuetify's open dialog holds each navigation for a timer tick (its back-button guard). */
async function expectRoute(path: string): Promise<void> {
  await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe(path));
}

/** Confirms by password, which the mock accepts. */
async function confirmByPassword(): Promise<void> {
  vi.mocked(confirmWithPassword).mockResolvedValue();
  await type(input('Password'), 'right-password-1');
  await click(button('Confirm'));
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  vi.stubGlobal('visualViewport', visualViewportStub);
  i18n.global.locale.value = 'en';
  vi.mocked(accountProviders).mockReset().mockReturnValue(['password']);
  vi.mocked(confirmWithPassword).mockReset();
  vi.mocked(confirmWithGoogle).mockReset();
  vi.mocked(deleteCurrentUser).mockReset();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('DeleteAccountDialog: confirming who it is (D2, D3, D4)', () => {
  it('says what is deleted and links "How deletion works" to /delete-account', async () => {
    await mountDialog();

    expect(dialog().textContent).toContain('Delete your account?');
    expect(dialog().textContent).toContain(
      "Every task, label, reminder and push device of this account will be deleted. This can't be undone.",
    );
    const link = dialog().querySelector('a[href="/delete-account"]');
    expect(link?.textContent?.trim()).toBe('How deletion works');
  });

  it('a password account shows the password field and Confirm, and no Google button', async () => {
    vi.mocked(accountProviders).mockReturnValue(['password']);
    await mountDialog();

    expect(findInput('Password')).not.toBeNull();
    expect(findButton('Confirm')).toBeDefined();
    expect(findButton('Continue with Google')).toBeUndefined();
  });

  it('a Google account shows "Continue with Google" and no password field', async () => {
    vi.mocked(accountProviders).mockReturnValue(['google.com']);
    await mountDialog();

    expect(findButton('Continue with Google')).toBeDefined();
    expect(findInput('Password')).toBeNull();
    expect(findButton('Confirm')).toBeUndefined();
  });

  it('an account with both providers shows both', async () => {
    vi.mocked(accountProviders).mockReturnValue(['password', 'google.com']);
    await mountDialog();

    expect(findInput('Password')).not.toBeNull();
    expect(findButton('Confirm')).toBeDefined();
    expect(findButton('Continue with Google')).toBeDefined();
  });

  it('before confirming, the DELETE field and Delete are disabled', async () => {
    await mountDialog();

    expect(input('Type DELETE to confirm').disabled).toBe(true);
    expect(button('Delete account').disabled).toBe(true);
  });

  it.each(['auth/invalid-credential', 'auth/wrong-password'])(
    'a wrong password (%s) says so, and the dialog stays open and unconfirmed',
    async (code) => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.mocked(confirmWithPassword).mockRejectedValue(firebaseError(code));
      await mountDialog();

      await type(input('Password'), 'wrong-password-1');
      await click(button('Confirm'));

      expect(confirmWithPassword).toHaveBeenCalledWith('wrong-password-1');
      expect(dialog().textContent).toContain('That password is wrong.');
      expect(dialog().textContent).not.toContain('internal detail');
      expect(dialog().textContent).not.toContain('Confirmed. Now type DELETE.');
      expect(input('Type DELETE to confirm').disabled).toBe(true);
      expect(button('Delete account').disabled).toBe(true);
      expect(warn).toHaveBeenCalledWith('[profile] password confirmation failed:', code);
    },
  );

  it('another password failure shows its translated message, unconfirmed', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(confirmWithPassword).mockRejectedValue(firebaseError('auth/too-many-requests'));
    await mountDialog();

    await type(input('Password'), 'right-password-1');
    await click(button('Confirm'));

    expect(dialog().textContent).toContain('Too many attempts');
    expect(input('Type DELETE to confirm').disabled).toBe(true);
  });

  it('after confirming, only exactly DELETE enables Delete', async () => {
    await mountDialog();
    await confirmByPassword();

    expect(dialog().textContent).toContain('Confirmed. Now type DELETE.');
    const word = input('Type DELETE to confirm');
    expect(word.disabled).toBe(false);
    for (const attempt of ['delete', ' DELETE', 'DELET', 'DELETE ']) {
      await type(word, attempt);
      expect(button('Delete account').disabled, attempt).toBe(true);
    }
    await type(word, 'DELETE');
    expect(button('Delete account').disabled).toBe(false);
  });

  it('"Continue with Google" calls confirmWithGoogle and stays busy while the page leaves', async () => {
    vi.mocked(accountProviders).mockReturnValue(['google.com']);
    vi.mocked(confirmWithGoogle).mockResolvedValue();
    await mountDialog();

    await click(button('Continue with Google'));

    expect(confirmWithGoogle).toHaveBeenCalledTimes(1);
    expect(button('Continue with Google').classList).toContain('v-btn--loading');
  });

  it('a Google redirect that cannot start shows its translated message and logs its code', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(accountProviders).mockReturnValue(['google.com']);
    vi.mocked(confirmWithGoogle).mockRejectedValue(firebaseError('auth/network-request-failed'));
    await mountDialog();

    await click(button('Continue with Google'));

    expect(dialog().textContent).toContain("Couldn't reach the server.");
    expect(button('Continue with Google').classList).not.toContain('v-btn--loading');
    expect(warn).toHaveBeenCalledWith(
      '[profile] Google confirmation failed:',
      'auth/network-request-failed',
    );
  });

  it('opened confirmed, it waits for DELETE; opened with a message, it shows it', async () => {
    await mountDialog({ confirmed: true, message: 'profile.delete.userMismatch' });

    expect(dialog().textContent).toContain('Confirmed. Now type DELETE.');
    expect(dialog().textContent).toContain(
      "That Google account isn't the one you're signed in with.",
    );
    expect(input('Type DELETE to confirm').disabled).toBe(false);
  });

  it('with nobody signed in, it offers no way to confirm and logs why', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(accountProviders).mockImplementation(() => {
      throw firebaseError('auth/not-signed-in');
    });
    await mountDialog();

    expect(findInput('Password')).toBeNull();
    expect(findButton('Continue with Google')).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      '[profile] could not read the account providers:',
      'auth/not-signed-in',
    );
  });
});

describe('DeleteAccountDialog: deleting (D5)', () => {
  async function readyToDelete(): Promise<void> {
    await mountDialog();
    await confirmByPassword();
    await type(input('Type DELETE to confirm'), 'DELETE');
  }

  it('Delete calls the store’s deleteAccount, goes to /signin and says so', async () => {
    await readyToDelete();
    const deleteAccount = vi.spyOn(useSessionStore(), 'deleteAccount').mockResolvedValue();

    await click(button('Delete account'));

    expect(deleteAccount).toHaveBeenCalledTimes(1);
    await expectRoute('/signin');
    await vi.waitFor(() => expect(useUiStore().snack?.text).toBe('Your account was deleted.'));
  });

  it('a stale sign-in (auth/requires-recent-login) returns the dialog to unconfirmed', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await readyToDelete();
    vi.spyOn(useSessionStore(), 'deleteAccount').mockRejectedValue(
      firebaseError('auth/requires-recent-login'),
    );

    await click(button('Delete account'));

    expect(dialog().textContent).toContain("Please confirm it's you again.");
    expect(dialog().textContent).not.toContain('Confirmed. Now type DELETE.');
    expect(input('Type DELETE to confirm').disabled).toBe(true);
    expect(button('Delete account').disabled).toBe(true);
    expect(findInput('Password')).not.toBeNull();
    expect(router.currentRoute.value.path).toBe('/profile');
    expect(warn).toHaveBeenCalledWith(
      '[profile] account deletion failed:',
      'auth/requires-recent-login',
    );
  });

  it('any other failure says it couldn’t delete, and the dialog stays confirmed', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await readyToDelete();
    vi.spyOn(useSessionStore(), 'deleteAccount').mockRejectedValue(
      firebaseError('auth/network-request-failed'),
    );

    await click(button('Delete account'));

    expect(dialog().textContent).toContain("Couldn't delete your account. Try again.");
    expect(dialog().textContent).toContain('Confirmed. Now type DELETE.');
    expect(input('Type DELETE to confirm').disabled).toBe(false);
    expect(button('Delete account').disabled).toBe(false);
    expect(button('Cancel').disabled).toBe(false);
    expect(router.currentRoute.value.path).toBe('/profile');
    expect(useUiStore().snack).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      '[profile] account deletion failed:',
      'auth/network-request-failed',
    );
  });

  it('offline, with push on, a failed delete says so at once and leaves Delete and Cancel usable (I2)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await readyToDelete();
    // The real store: the device-document delete would never settle offline.
    const pushHook = vi.fn(() => new Promise<void>(() => {}));
    useSessionStore().onSignOut(pushHook);
    vi.mocked(deleteCurrentUser).mockRejectedValue(firebaseError('auth/network-request-failed'));

    await click(button('Delete account'));

    expect(dialog().textContent).toContain("Couldn't delete your account. Try again.");
    expect(dialog().textContent).toContain('Confirmed. Now type DELETE.');
    expect(button('Delete account').disabled).toBe(false);
    expect(button('Delete account').classList).not.toContain('v-btn--loading');
    expect(button('Cancel').disabled).toBe(false);
    expect(pushHook).not.toHaveBeenCalled();
    expect(router.currentRoute.value.path).toBe('/profile');
    expect(warn).toHaveBeenCalledWith(
      '[profile] account deletion failed:',
      'auth/network-request-failed',
    );
  });

  it('while deleting, Delete shows its loading state and a second click does nothing', async () => {
    await readyToDelete();
    let finish: () => void = () => {};
    const deleteAccount = vi.spyOn(useSessionStore(), 'deleteAccount').mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );

    await click(button('Delete account'));
    expect(button('Delete account').classList).toContain('v-btn--loading');
    await click(button('Delete account'));
    expect(deleteAccount).toHaveBeenCalledTimes(1);

    finish();
    await expectRoute('/signin');
  });
});
