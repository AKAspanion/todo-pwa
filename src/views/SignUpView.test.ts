/**
 * The sign-up screen with the auth service mocked: it picks up Google's redirect result on load,
 * as sign-in does (G2), Google always leaves by redirect (G1), and it links the privacy policy
 * (W2).
 */
import type { User } from 'firebase/auth';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import { i18n } from '@/plugins/i18n';
import { vuetify } from '@/plugins/vuetify';
import { consumeRedirectResult, signInWithGoogle } from '@/services/auth';
import SignUpView from './SignUpView.vue';

vi.mock('@/services/auth', () => ({
  consumeRedirectResult: vi.fn(),
  signUpEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

/** Vuetify's inputs measure themselves; jsdom has no ResizeObserver. */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

/** Vuetify's snackbar places itself in the visual viewport; jsdom has none. */
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

const alice = { uid: 'alice' } as User;
const Blank = { render: () => h('div') };
const ACCOUNT_EXISTS = 'An account already exists with the same email address';

let wrapper: VueWrapper | null = null;

async function mountAt(path: string): Promise<Router> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ['/signin', '/signup', '/home', '/calendar', '/privacy'].map((p) => ({
      path: p,
      component: Blank,
    })),
  });
  await router.push(path);
  await router.isReady();
  const pinia = createPinia();
  setActivePinia(pinia);
  wrapper = mount(SignUpView, {
    global: { plugins: [router, vuetify, i18n, pinia] },
    attachTo: document.body,
  });
  await flushPromises();
  return router;
}

function googleButton() {
  return wrapper!.get('button[aria-label="Continue with Google"]');
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  vi.stubGlobal('visualViewport', visualViewportStub);
  i18n.global.locale.value = 'en';
  vi.mocked(consumeRedirectResult).mockReset();
  vi.mocked(consumeRedirectResult).mockResolvedValue(null);
  vi.mocked(signInWithGoogle).mockReset();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
});

describe('SignUpView', () => {
  it('reads the redirect result on load: a signIn outcome goes to the redirect query (G2)', async () => {
    vi.mocked(consumeRedirectResult).mockResolvedValue({ user: alice, operation: 'signIn' });

    const router = await mountAt('/signup?redirect=/calendar');

    expect(consumeRedirectResult).toHaveBeenCalledTimes(1);
    expect(router.currentRoute.value.fullPath).toBe('/calendar');
  });

  it('a signIn outcome with an off-app redirect goes to /home (G2)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(consumeRedirectResult).mockResolvedValue({ user: alice, operation: 'signIn' });

    const router = await mountAt('/signup?redirect=//evil.example');

    expect(router.currentRoute.value.fullPath).toBe('/home');
    expect(warn).toHaveBeenCalledWith('[auth] ignored an unsafe redirect');
  });

  it('a rejected redirect result shows its translated error and stays (G2)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(consumeRedirectResult).mockRejectedValue(
      Object.assign(new Error('internal detail'), {
        code: 'auth/account-exists-with-different-credential',
      }),
    );

    const router = await mountAt('/signup');

    expect(router.currentRoute.value.path).toBe('/signup');
    expect(document.body.textContent).toContain(ACCOUNT_EXISTS);
    expect(document.body.textContent).not.toContain('internal detail');
    expect(warn).toHaveBeenCalledWith(
      '[auth] Google redirect sign-up failed:',
      'auth/account-exists-with-different-credential',
    );
  });

  it('with no redirect result, stays on sign-up and shows no error', async () => {
    const router = await mountAt('/signup');

    expect(router.currentRoute.value.path).toBe('/signup');
    expect(document.querySelector('.v-snackbar')).toBeNull();
    expect(document.body.textContent).not.toContain('Something went wrong');
  });

  it('"Continue with Google" leaves by redirect and keeps its button busy (G1)', async () => {
    // The redirect has started; the page is on its way out.
    vi.mocked(signInWithGoogle).mockResolvedValue();
    const router = await mountAt('/signup?redirect=/calendar');

    await googleButton().trigger('click');
    await flushPromises();

    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
    expect(router.currentRoute.value.fullPath).toBe('/signup?redirect=/calendar');
    expect(googleButton().classes()).toContain('v-btn--loading');
  });

  it('links "Privacy policy" to /privacy (W2)', async () => {
    await mountAt('/signup');

    const link = wrapper!.get('a[href="/privacy"]');
    expect(link.text()).toBe('Privacy policy');
  });
});
