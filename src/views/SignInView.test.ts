/**
 * The sign-in screen with the auth service mocked: back from Google's redirect it goes where
 * sign-in sends everyone (G2), Google always leaves by redirect (G1), and it links the privacy
 * policy (W2).
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
import SignInView from './SignInView.vue';

vi.mock('@/services/auth', () => ({
  consumeRedirectResult: vi.fn(),
  signInEmail: vi.fn(),
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

let wrapper: VueWrapper | null = null;

async function mountAt(path: string): Promise<Router> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ['/signin', '/signup', '/home', '/calendar', '/privacy', '/forgot-password'].map(
      (p) => ({ path: p, component: Blank }),
    ),
  });
  await router.push(path);
  await router.isReady();
  const pinia = createPinia();
  setActivePinia(pinia);
  wrapper = mount(SignInView, {
    global: { plugins: [router, vuetify, i18n, pinia] },
    attachTo: document.body,
  });
  await flushPromises();
  return router;
}

function mounted(): VueWrapper {
  if (!wrapper) throw new Error('mountAt() first');
  return wrapper;
}

function googleButton() {
  const buttons = mounted().findAll('button');
  const button = buttons.find((b) => b.text().includes('Sign in with Google'));
  if (!button) throw new Error('no "Sign in with Google" button');
  return button;
}

function emailButton() {
  const button = mounted()
    .findAll('button')
    .find((b) => b.text().includes('Sign in with Email'));
  if (!button) throw new Error('no "Sign in with Email" button');
  return button;
}

function forgotLink() {
  return mounted()
    .findAll('a')
    .find((a) => a.text() === 'Forgot password?');
}

async function openEmailForm(): Promise<void> {
  await emailButton().trigger('click');
  await flushPromises();
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

describe('SignInView', () => {
  it('back from Google on ?redirect=//evil.example, a sign-in goes to /home (G2)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(consumeRedirectResult).mockResolvedValue({ user: alice, operation: 'signIn' });

    const router = await mountAt('/signin?redirect=//evil.example');

    expect(router.currentRoute.value.fullPath).toBe('/home');
    expect(warn).toHaveBeenCalledWith('[auth] ignored an unsafe redirect');
  });

  it('back from Google with a signIn outcome, goes to the redirect query (G2)', async () => {
    vi.mocked(consumeRedirectResult).mockResolvedValue({ user: alice, operation: 'signIn' });

    const router = await mountAt('/signin?redirect=/calendar');

    expect(router.currentRoute.value.fullPath).toBe('/calendar');
  });

  it('a re-authentication outcome is not a sign-in: it stays on /signin', async () => {
    vi.mocked(consumeRedirectResult).mockResolvedValue({
      user: alice,
      operation: 'reauthenticate',
    });

    const router = await mountAt('/signin?redirect=/calendar');

    expect(router.currentRoute.value.path).toBe('/signin');
  });

  it('"Sign in with Google" leaves by redirect and keeps its button busy (G1)', async () => {
    // The redirect has started; the page is on its way out.
    vi.mocked(signInWithGoogle).mockResolvedValue();
    const router = await mountAt('/signin?redirect=/calendar');

    await googleButton().trigger('click');
    await flushPromises();

    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
    expect(router.currentRoute.value.fullPath).toBe('/signin?redirect=/calendar');
    expect(googleButton().classes()).toContain('v-btn--loading');
  });

  it('back from Google without finishing, a page restored from the cache is usable again (I4)', async () => {
    vi.mocked(signInWithGoogle).mockResolvedValue();
    await mountAt('/signin');
    await googleButton().trigger('click');
    await flushPromises();
    expect(emailButton().attributes('disabled')).toBeDefined();

    window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }));
    await flushPromises();

    expect(googleButton().classes()).not.toContain('v-btn--loading');
    expect(googleButton().attributes('disabled')).toBeUndefined();
    expect(emailButton().attributes('disabled')).toBeUndefined();
  });

  it('shows a failed Google redirect’s translated error', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(signInWithGoogle).mockRejectedValue(
      Object.assign(new Error('x'), { code: 'auth/network-request-failed' }),
    );
    await mountAt('/signin');

    await googleButton().trigger('click');
    await flushPromises();

    expect(document.body.textContent).toContain("Couldn't reach the server.");
    expect(warn).toHaveBeenCalledWith(
      '[auth] Google sign-in failed:',
      'auth/network-request-failed',
    );
    expect(googleButton().classes()).not.toContain('v-btn--loading');
  });

  it('shows no "Forgot password?" link while the email form is closed', async () => {
    await mountAt('/signin');

    expect(forgotLink()).toBeUndefined();
  });

  it('"Forgot password?" opens /forgot-password with the typed email in history state, not the URL', async () => {
    const router = await mountAt('/signin');
    await openEmailForm();
    await mounted().get('input[name="email"]').setValue('ann@example.com');
    const link = forgotLink();
    expect(link?.attributes('href')).toBe('/forgot-password');

    await link!.trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe('/forgot-password');
    expect(router.options.history.state.email).toBe('ann@example.com');
    expect(router.options.history.location).not.toContain('ann');
  });

  it('"Forgot password?" keeps the page to return to', async () => {
    const router = await mountAt('/signin?redirect=/calendar');
    await openEmailForm();

    await forgotLink()!.trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/forgot-password');
    expect(router.currentRoute.value.query.redirect).toBe('/calendar');
  });

  it('links "Privacy policy" to /privacy (W2)', async () => {
    await mountAt('/signin');

    const link = mounted().get('a[href="/privacy"]');
    expect(link.text()).toBe('Privacy policy');
  });
});
