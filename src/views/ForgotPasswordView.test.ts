/**
 * The forgot-password screen with the auth service mocked: it validates the address before asking,
 * answers every address alike, asks once per press, and shows a failure in sign-in's snackbar
 * without logging the address (decisions/password-reset).
 */
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import { createMemoryHistory, createRouter, type HistoryState, type Router } from 'vue-router';
import { i18n } from '@/plugins/i18n';
import { vuetify } from '@/plugins/vuetify';
import { requestPasswordReset } from '@/services/auth';
import ForgotPasswordView from './ForgotPasswordView.vue';

vi.mock('@/services/auth', () => ({
  requestPasswordReset: vi.fn(),
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

const ANN = 'ann@example.com';
const SENT = 'If an account exists for that email, a reset link is on its way.';
const Blank = { render: () => h('div') };

let wrapper: VueWrapper | null = null;

async function mountAt(path: string, state?: HistoryState): Promise<Router> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ['/signin', '/forgot-password', '/home', '/privacy'].map((p) => ({
      path: p,
      component: Blank,
    })),
  });
  await router.push(state ? { path, state } : path);
  await router.isReady();
  const pinia = createPinia();
  setActivePinia(pinia);
  wrapper = mount(ForgotPasswordView, {
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

function emailInput(): HTMLInputElement {
  return mounted().get<HTMLInputElement>('input[name="email"]').element;
}

function sendButton() {
  const button = mounted()
    .findAll('button')
    .find((b) => b.text().includes('Send reset link'));
  if (!button) throw new Error('no "Send reset link" button');
  return button;
}

async function typeEmail(value: string): Promise<void> {
  await mounted().get('input[name="email"]').setValue(value);
}

async function send(): Promise<void> {
  // A submit button: jsdom submits its form on click, as the browser does.
  await sendButton().trigger('click');
  await flushPromises();
}

function failure(code: string): Error {
  return Object.assign(new Error(`Firebase: secret detail for ${ANN}`), { code });
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  vi.stubGlobal('visualViewport', visualViewportStub);
  i18n.global.locale.value = 'en';
  vi.mocked(requestPasswordReset).mockReset();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
  localStorage.clear();
  i18n.global.locale.value = 'en';
  vi.restoreAllMocks();
});

describe('ForgotPasswordView', () => {
  it('opened directly, the email field is empty and focused', async () => {
    await mountAt('/forgot-password');

    expect(emailInput().value).toBe('');
    expect(document.activeElement).toBe(emailInput());
  });

  it('shows the email sign-in carried in history state, with none in the URL', async () => {
    const router = await mountAt('/forgot-password', { email: ANN });

    expect(emailInput().value).toBe(ANN);
    expect(router.currentRoute.value.fullPath).toBe('/forgot-password');
  });

  it.each([
    ['a number', 42],
    ['an object', { toString: 'ann@example.com' }],
    ['an address longer than the field allows', `${'a'.repeat(250)}@example.com`],
  ])('ignores %s in history state', async (_, email) => {
    await mountAt('/forgot-password', { email });

    expect(emailInput().value).toBe('');
  });

  it('shows the logo, the title, the subtitle, the language toggle and the privacy link', async () => {
    await mountAt('/forgot-password');

    expect(mounted().find('svg[aria-hidden="true"]').exists()).toBe(true);
    expect(mounted().get('h1').text()).toBe('Task Manager');
    expect(mounted().text()).toContain('Reset your password');
    expect(mounted().find('[role="group"][aria-label="Language"]').exists()).toBe(true);
    expect(mounted().get('a[href="/privacy"]').text()).toBe('Privacy policy');
  });

  it('links "Back to sign in" to /signin, keeping the page to return to', async () => {
    await mountAt('/forgot-password?redirect=/calendar');

    const link = mounted()
      .findAll('a')
      .find((a) => a.text() === 'Back to sign in');
    expect(link).toBeDefined();
    const href = new URL(link!.attributes('href') ?? '', 'http://x');
    expect(href.pathname).toBe('/signin');
    expect(href.searchParams.get('redirect')).toBe('/calendar');
  });

  it('links "Back to sign in" to plain /signin when there is no page to return to', async () => {
    await mountAt('/forgot-password');

    const link = mounted()
      .findAll('a')
      .find((a) => a.text() === 'Back to sign in');
    expect(link?.attributes('href')).toBe('/signin');
  });

  it('asks for an address before sending, and sends nothing', async () => {
    await mountAt('/forgot-password');

    await send();

    expect(mounted().text()).toContain('Enter your email address');
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });

  it('asks for a valid address before sending, and sends nothing', async () => {
    await mountAt('/forgot-password');
    await typeEmail('ann@example');

    await send();

    expect(mounted().text()).toContain('Enter a valid email address');
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });

  it('sends the trimmed address and replaces the form with the confirmation', async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue();
    await mountAt('/forgot-password');
    await typeEmail(`  ${ANN} `);

    await send();

    expect(requestPasswordReset).toHaveBeenCalledWith(ANN);
    expect(mounted().text()).toContain(SENT);
    expect(mounted().find('input[name="email"]').exists()).toBe(false);
    expect(
      mounted()
        .findAll('a')
        .some((a) => a.text() === 'Back to sign in'),
    ).toBe(true);
  });

  it('asks once when "Send reset link" is pressed twice before the first call settles', async () => {
    let settle: () => void = () => {};
    vi.mocked(requestPasswordReset).mockReturnValue(
      new Promise<void>((resolve) => {
        settle = resolve;
      }),
    );
    await mountAt('/forgot-password');
    await typeEmail(ANN);

    const button = sendButton();
    await Promise.all([button.trigger('click'), button.trigger('click')]);
    await flushPromises();
    await button.trigger('click');
    await flushPromises();
    settle();
    await flushPromises();

    expect(requestPasswordReset).toHaveBeenCalledTimes(1);
    expect(mounted().text()).toContain(SENT);
  });

  it.each([
    ['auth/too-many-requests', 'Too many attempts. Wait a moment and try again.'],
    [
      'auth/network-request-failed',
      "Couldn't reach the server. Check your connection and try again.",
    ],
  ])('on %s, shows the snackbar, keeps the email and the button usable', async (code, text) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(requestPasswordReset).mockRejectedValue(failure(code));
    await mountAt('/forgot-password');
    await typeEmail(ANN);

    await send();

    const snackbar = document.querySelector('[data-testid="auth-error"]');
    expect(snackbar?.textContent).toContain(text);
    expect(snackbar?.getAttribute('role')).toBe('alert');
    expect(emailInput().value).toBe(ANN);
    expect(sendButton().classes()).not.toContain('v-btn--loading');
    expect(sendButton().attributes('disabled')).toBeUndefined();
    expect(mounted().text()).not.toContain(SENT);
    expect(warn).toHaveBeenCalledWith('[auth] password reset request failed:', code);
  });

  it('logs a failure by its code only, never the email or the message', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(requestPasswordReset).mockRejectedValue(failure('auth/too-many-requests'));
    await mountAt('/forgot-password');
    await typeEmail(ANN);

    await send();

    expect(warn).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).not.toContain(ANN);
    expect(logged).not.toContain('secret detail');
  });

  it('a failure with no code shows the general error and logs "unknown"', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(requestPasswordReset).mockRejectedValue(new Error(`boom ${ANN}`));
    await mountAt('/forgot-password');
    await typeEmail(ANN);

    await send();

    expect(document.querySelector('[data-testid="auth-error"]')?.textContent).toContain(
      'Something went wrong. Try again.',
    );
    expect(warn).toHaveBeenCalledWith('[auth] password reset request failed:', 'unknown');
  });

  it('switching to Hindi while the confirmation shows keeps it, in Hindi', async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue();
    await mountAt('/forgot-password');
    await typeEmail(ANN);
    await send();

    const hindi = mounted().get('button[lang="hi"]');
    await hindi.trigger('click');
    await flushPromises();

    expect(mounted().text()).toContain(
      'अगर इस ईमेल से कोई खाता है, तो रीसेट लिंक भेज दिया गया है।',
    );
    expect(mounted().text()).not.toContain(SENT);
    expect(mounted().find('input[name="email"]').exists()).toBe(false);
  });
});
