/**
 * The verify-email reminder with the session's actions mocked: it always shows on Profile, shows on
 * Home until dismissed and again 7 days later, resends with a cooldown, and goes away once Firebase
 * says the email is verified (decisions/email-verification-reminder).
 */
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { DISMISS_DAYS } from '@/lib/verifyReminder';
import { i18n } from '@/plugins/i18n';
import { vuetify } from '@/plugins/vuetify';
import { useSessionStore } from '@/stores/session';
import { useUiStore } from '@/stores/ui';
import type { SessionUser } from '@/types/models';
import VerifyEmailBanner from './VerifyEmailBanner.vue';

vi.mock('@/services/auth', () => ({
  onUserChanged: vi.fn(() => () => {}),
  signOutUser: vi.fn(),
  reloadEmailVerified: vi.fn(),
  sendVerificationEmail: vi.fn(),
}));
vi.mock('@/services/account', () => ({ deleteCurrentUser: vi.fn() }));

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

const Blank = { render: () => h('div') };
const ANN: SessionUser = {
  uid: 'ann',
  email: 'ann@example.com',
  displayName: null,
  photoURL: null,
  emailVerified: false,
};
const TEXT = 'Verify your email address. We sent a link to ann@example.com.';
const DAY_MS = 24 * 60 * 60 * 1000;

let wrapper: VueWrapper | null = null;

/**
 * Mounts the banner on `path` for `user`. The quiet check on show answers `verified` (not yet, by
 * default), so a test sees the banner as a fresh page load would.
 */
async function mountAt(
  path: string,
  user: SessionUser | null,
  verified: boolean | Error = false,
): Promise<VueWrapper> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', component: Blank, meta: { requireAuth: true, verifyBanner: 'dismissible' } },
      { path: '/profile', component: Blank, meta: { requireAuth: true, verifyBanner: 'always' } },
      { path: '/calendar', component: Blank, meta: { requireAuth: true } },
      { path: '/privacy', component: Blank },
    ],
  });
  await router.push(path);
  await router.isReady();
  const pinia = createPinia();
  setActivePinia(pinia);
  const session = useSessionStore();
  session.user = user;
  vi.spyOn(session, 'checkEmailVerified').mockImplementation(async () => {
    if (verified instanceof Error) throw verified;
    if (verified && session.user) session.user = { ...session.user, emailVerified: true };
    return verified;
  });
  wrapper = mount(VerifyEmailBanner, {
    global: { plugins: [router, vuetify, i18n, pinia] },
    attachTo: document.body,
  });
  await flushPromises();
  return wrapper;
}

function findButton(w: VueWrapper, label: string) {
  return w.findAll('button').find((b) => b.text().startsWith(label));
}

function button(w: VueWrapper, label: string) {
  const found = findButton(w, label);
  if (!found) throw new Error(`no "${label}" button`);
  return found;
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  i18n.global.locale.value = 'en';
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  localStorage.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('VerifyEmailBanner', () => {
  it('reminds an unverified user on Home, naming their email, with Resend and Dismiss', async () => {
    const w = await mountAt('/home', ANN);

    expect(w.text()).toContain(TEXT);
    expect(findButton(w, 'Resend email')).toBeDefined();
    expect(findButton(w, 'Dismiss')).toBeDefined();
    expect(findButton(w, "I've verified")).toBeUndefined();
  });

  it.each([
    ['a verified user', '/home', { ...ANN, emailVerified: true }],
    ['nobody signed in', '/home', null],
    ['a public page', '/privacy', ANN],
    ['a screen that isn’t Home or Profile', '/calendar', ANN],
  ])('stays hidden for %s', async (_, path, user) => {
    const w = await mountAt(path, user);

    expect(w.text()).toBe('');
  });

  it('dismissed on Home, stays away for 7 days, then comes back', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.parse('2026-11-06T10:00:00Z'));
    const w = await mountAt('/home', ANN);

    await button(w, 'Dismiss').trigger('click');
    await flushPromises();
    expect(w.text()).toBe('');

    wrapper?.unmount();
    vi.setSystemTime(Date.now() + DISMISS_DAYS * DAY_MS - 60_000);
    expect((await mountAt('/home', ANN)).text()).toBe('');

    wrapper?.unmount();
    vi.setSystemTime(Date.now() + 60_000);
    expect((await mountAt('/home', ANN)).text()).toContain(TEXT);
  });

  it('always shows on Profile, dismissed or not, with no Dismiss there', async () => {
    const home = await mountAt('/home', ANN);
    await button(home, 'Dismiss').trigger('click');
    home.unmount();

    const w = await mountAt('/profile', ANN);

    expect(w.text()).toContain(TEXT);
    expect(findButton(w, 'Dismiss')).toBeUndefined();
  });

  it('goes away without a word when the quiet check finds the email verified', async () => {
    const w = await mountAt('/profile', ANN, true);

    expect(useSessionStore().checkEmailVerified).toHaveBeenCalledTimes(1);
    expect(w.text()).toBe('');
    expect(useUiStore().snack).toBeNull();
  });

  it('stays, without a word, when the quiet check fails', async () => {
    const w = await mountAt(
      '/profile',
      ANN,
      Object.assign(new Error('x'), { code: 'auth/network-request-failed' }),
    );

    expect(w.text()).toContain(TEXT);
    expect(useUiStore().snack).toBeNull();
  });

  it('resends, says so, and waits a minute before the next resend', async () => {
    const w = await mountAt('/home', ANN);
    const session = useSessionStore();
    vi.spyOn(session, 'resendVerification').mockResolvedValue();

    await button(w, 'Resend email').trigger('click');
    await flushPromises();

    expect(session.resendVerification).toHaveBeenCalledTimes(1);
    expect(useUiStore().snack?.text).toBe('Verification email sent. Check your inbox.');
    expect(button(w, 'Resend email').attributes('disabled')).toBeDefined();
    expect(button(w, 'Resend email').text()).toMatch(/\(\d+\)/);
  });

  it('shows why a resend failed, by its translated code', async () => {
    const w = await mountAt('/profile', ANN);
    const session = useSessionStore();
    vi.spyOn(session, 'resendVerification').mockRejectedValue(
      Object.assign(new Error('secret ann@example.com'), { code: 'auth/too-many-requests' }),
    );

    await button(w, 'Resend email').trigger('click');
    await flushPromises();

    expect(useUiStore().snack?.text).toBe('Too many attempts. Wait a moment and try again.');
    expect(button(w, 'Resend email').attributes('disabled')).toBeUndefined();
  });
});
