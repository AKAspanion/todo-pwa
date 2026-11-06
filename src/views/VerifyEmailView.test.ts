/**
 * The verify-email screen with the auth service and the session's check mocked: it applies the
 * link's code once, re-checks whoever is signed in here, says why a link can't be used, and always
 * offers a way home (decisions/email-verification-reminder).
 */
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { i18n } from '@/plugins/i18n';
import { vuetify } from '@/plugins/vuetify';
import { applyVerificationCode } from '@/services/auth';
import { useSessionStore } from '@/stores/session';
import VerifyEmailView from './VerifyEmailView.vue';

vi.mock('@/services/auth', () => ({
  applyVerificationCode: vi.fn(),
  onUserChanged: vi.fn(() => () => {}),
  signOutUser: vi.fn(),
  reloadEmailVerified: vi.fn(),
  sendVerificationEmail: vi.fn(),
}));
vi.mock('@/services/account', () => ({ deleteCurrentUser: vi.fn() }));

/** Vuetify's inputs measure themselves; jsdom has no ResizeObserver. */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

const Blank = { render: () => h('div') };
const LINK = '/verify-email?mode=verifyEmail&oobCode=abc';

let wrapper: VueWrapper | null = null;

async function mountAt(path: string, signedIn = false): Promise<VueWrapper> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ['/verify-email', '/home', '/privacy'].map((p) => ({ path: p, component: Blank })),
  });
  await router.push(path);
  await router.isReady();
  const pinia = createPinia();
  setActivePinia(pinia);
  const session = useSessionStore();
  if (signedIn) {
    session.user = {
      uid: 'ann',
      email: 'ann@example.com',
      displayName: null,
      photoURL: null,
      emailVerified: false,
    };
  }
  vi.spyOn(session, 'checkEmailVerified').mockResolvedValue(true);
  wrapper = mount(VerifyEmailView, {
    global: { plugins: [router, vuetify, i18n, pinia] },
    attachTo: document.body,
  });
  await flushPromises();
  return wrapper;
}

function homeLink(w: VueWrapper) {
  return w.findAll('a').find((a) => a.text() === 'Go to home');
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  i18n.global.locale.value = 'en';
  vi.mocked(applyVerificationCode).mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('VerifyEmailView', () => {
  it('applies the code once and says the email is verified, with a way home', async () => {
    vi.mocked(applyVerificationCode).mockResolvedValue();

    const w = await mountAt(LINK);

    expect(applyVerificationCode).toHaveBeenCalledTimes(1);
    expect(applyVerificationCode).toHaveBeenCalledWith('abc');
    expect(w.text()).toContain('Your email address is verified.');
    expect(homeLink(w)?.attributes('href')).toBe('/home');
  });

  it('re-checks the user signed in here, so their banner goes away', async () => {
    vi.mocked(applyVerificationCode).mockResolvedValue();

    await mountAt(LINK, true);

    expect(useSessionStore().checkEmailVerified).toHaveBeenCalledTimes(1);
  });

  it('checks nobody when nobody is signed in here', async () => {
    vi.mocked(applyVerificationCode).mockResolvedValue();

    await mountAt(LINK);

    expect(useSessionStore().checkEmailVerified).not.toHaveBeenCalled();
  });

  it.each([
    ['/verify-email', 'no code'],
    ['/verify-email?mode=resetPassword&oobCode=abc', 'another kind of link'],
  ])('calls %s invalid without asking Firebase (%s)', async (path) => {
    const w = await mountAt(path);

    expect(applyVerificationCode).not.toHaveBeenCalled();
    expect(w.text()).toContain("This verification link isn't valid or has already been used.");
    expect(homeLink(w)).toBeDefined();
  });

  it.each([
    ['auth/invalid-action-code', "This verification link isn't valid or has already been used."],
    ['auth/expired-action-code', 'This verification link has expired.'],
  ])('explains %s, with a way home', async (code, text) => {
    vi.mocked(applyVerificationCode).mockRejectedValue(Object.assign(new Error('x'), { code }));

    const w = await mountAt(LINK);

    expect(w.text()).toContain(text);
    expect(homeLink(w)).toBeDefined();
  });

  it('offers Try again when the server could not be reached, and applies again', async () => {
    vi.mocked(applyVerificationCode)
      .mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'auth/network-request-failed' }))
      .mockResolvedValueOnce();
    const w = await mountAt(LINK);

    expect(w.text()).toContain("Couldn't reach the server.");
    const retry = w.findAll('button').find((b) => b.text() === 'Try again');
    await retry?.trigger('click');
    await flushPromises();

    expect(applyVerificationCode).toHaveBeenCalledTimes(2);
    expect(w.text()).toContain('Your email address is verified.');
  });
});
