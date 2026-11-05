/**
 * The reset-password screen with the auth service mocked: it checks the link's code before
 * showing the form, tells an expired or used link from a network failure, sets the password once
 * under sign-up's rule, and logs a failure by its code alone (decisions/password-reset).
 */
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import { i18n } from '@/plugins/i18n';
import { vuetify } from '@/plugins/vuetify';
import { checkResetCode, resetPassword } from '@/services/auth';
import ResetPasswordView from './ResetPasswordView.vue';

vi.mock('@/services/auth', () => ({
  checkResetCode: vi.fn(),
  resetPassword: vi.fn(),
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
const LINK = '/reset-password?mode=resetPassword&oobCode=abc';
const CHECKING = 'Checking your link…';
const INVALID = "This reset link isn't valid or has already been used. Ask for a new one.";
const EXPIRED = 'This reset link has expired. Ask for a new one.';
const DONE = 'Your password has been changed.';
const NETWORK = "Couldn't reach the server. Check your connection and try again.";
const STRENGTH = 'Use at least 8 characters with a letter and a number.';
const MATCH = 'Password must match';
/** The checking spinner; the card's own loader is a progress bar too, always there and idle. */
const SPINNER = '.v-progress-circular[role="progressbar"]';
const Blank = { render: () => h('div') };

let wrapper: VueWrapper | null = null;

async function mountAt(path: string): Promise<Router> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ['/signin', '/forgot-password', '/reset-password', '/home', '/privacy'].map((p) => ({
      path: p,
      component: Blank,
    })),
  });
  await router.push(path);
  await router.isReady();
  const pinia = createPinia();
  setActivePinia(pinia);
  wrapper = mount(ResetPasswordView, {
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

function button(label: string) {
  const found = mounted()
    .findAll('button')
    .find((b) => b.text() === label);
  if (!found) throw new Error(`no "${label}" button`);
  return found;
}

function link(label: string) {
  return mounted()
    .findAll('a')
    .find((a) => a.text() === label);
}

function newPasswordInput(): HTMLInputElement {
  return mounted().get<HTMLInputElement>('input[name="new-password"]').element;
}

function confirmInput(): HTMLInputElement {
  return mounted().get<HTMLInputElement>('input[name="confirm-password"]').element;
}

function snackbarText(): string {
  return document.querySelector('[data-testid="auth-error"]')?.textContent ?? '';
}

async function typePasswords(password: string, confirm = password): Promise<void> {
  await mounted().get('input[name="new-password"]').setValue(password);
  await mounted().get('input[name="confirm-password"]').setValue(confirm);
}

async function changePassword(): Promise<void> {
  // A submit button: jsdom submits its form on click, as the browser does.
  await button('Change password').trigger('click');
  await flushPromises();
}

/** A Firebase-like error whose message carries what must never reach a log. */
function failure(code: string, secret = ''): Error {
  return Object.assign(new Error(`Firebase: ${secret} for ${ANN}`), { code });
}

/** Mounts on the link with the check passed, so the form shows. */
async function openForm(path = LINK): Promise<void> {
  vi.mocked(checkResetCode).mockResolvedValue(ANN);
  await mountAt(path);
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  vi.stubGlobal('visualViewport', visualViewportStub);
  i18n.global.locale.value = 'en';
  vi.mocked(checkResetCode).mockReset();
  vi.mocked(resetPassword).mockReset();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = '';
  localStorage.clear();
  i18n.global.locale.value = 'en';
  vi.restoreAllMocks();
});

describe('ResetPasswordView', () => {
  it('shows "Checking your link…" with a progress indicator, and no form, while the code is checked', async () => {
    vi.mocked(checkResetCode).mockReturnValue(new Promise<string>(() => {}));

    await mountAt(LINK);

    expect(checkResetCode).toHaveBeenCalledWith('abc');
    expect(mounted().text()).toContain(CHECKING);
    expect(mounted().find(SPINNER).exists()).toBe(true);
    expect(mounted().find('input[name="new-password"]').exists()).toBe(false);
  });

  it('once the code checks out, shows the account and the form, with the show-password eye on both fields', async () => {
    await openForm();

    expect(mounted().text()).toContain(`For ${ANN}`);
    expect(mounted().text()).not.toContain(CHECKING);
    expect(mounted().find(SPINNER).exists()).toBe(false);
    expect(
      mounted()
        .get('label[for="' + newPasswordInput().id + '"]')
        .text(),
    ).toBe('New password');
    expect(
      mounted()
        .get('label[for="' + confirmInput().id + '"]')
        .text(),
    ).toBe('Confirm');
    expect(newPasswordInput().type).toBe('password');
    expect(confirmInput().type).toBe('password');
    expect(mounted().findAll('button[aria-label="Show password"]')).toHaveLength(2);
    expect(button('Change password').exists()).toBe(true);
  });

  it('the eye shows and hides what was typed', async () => {
    await openForm();

    await mounted().get('button[aria-label="Show password"]').trigger('click');

    expect(newPasswordInput().type).toBe('text');
    expect(confirmInput().type).toBe('text');
    expect(mounted().findAll('button[aria-label="Hide password"]')).toHaveLength(2);
  });

  it.each([
    ['no oobCode', '/reset-password?mode=resetPassword'],
    ['no query at all', '/reset-password'],
    ['an empty oobCode', '/reset-password?mode=resetPassword&oobCode='],
    ['an oobCode with no value', '/reset-password?mode=resetPassword&oobCode'],
    ['no mode', '/reset-password?oobCode=abc'],
    ['another mode', '/reset-password?mode=verifyEmail&oobCode=abc'],
    ['oobCode given twice', '/reset-password?mode=resetPassword&oobCode=a&oobCode=b'],
    ['mode given twice', '/reset-password?mode=resetPassword&mode=resetPassword&oobCode=abc'],
  ])(
    'given %s, shows the invalid-link copy and a new-link link, and checks nothing',
    async (_, path) => {
      await mountAt(path);

      expect(mounted().text()).toContain(INVALID);
      expect(link('Ask for a new link')?.attributes('href')).toBe('/forgot-password');
      expect(mounted().text()).not.toContain(CHECKING);
      expect(mounted().find('input[name="new-password"]').exists()).toBe(false);
      expect(checkResetCode).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['auth/expired-action-code', EXPIRED],
    ['auth/invalid-action-code', INVALID],
  ])('when the check rejects with %s, shows that copy and a new-link link', async (code, text) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(checkResetCode).mockRejectedValue(failure(code));

    await mountAt(LINK);

    expect(mounted().text()).toContain(text);
    expect(link('Ask for a new link')?.attributes('href')).toBe('/forgot-password');
    expect(mounted().find('input[name="new-password"]').exists()).toBe(false);
    expect(mounted().find(SPINNER).exists()).toBe(false);
    expect(snackbarText()).toBe('');
  });

  it('when the check fails on the network, shows the error and offers the check again, without calling the link invalid', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(checkResetCode).mockRejectedValueOnce(failure('auth/network-request-failed'));

    await mountAt(LINK);

    expect(snackbarText()).toContain(NETWORK);
    expect(document.querySelector('[data-testid="auth-error"]')?.getAttribute('role')).toBe(
      'alert',
    );
    expect(mounted().text()).not.toContain(INVALID);
    expect(mounted().text()).not.toContain(EXPIRED);
    expect(link('Ask for a new link')).toBeUndefined();
    expect(mounted().find('input[name="new-password"]').exists()).toBe(false);

    vi.mocked(checkResetCode).mockResolvedValueOnce(ANN);
    await button('Try again').trigger('click');
    await flushPromises();

    expect(checkResetCode).toHaveBeenCalledTimes(2);
    expect(checkResetCode).toHaveBeenLastCalledWith('abc');
    expect(mounted().text()).toContain(`For ${ANN}`);
    expect(mounted().find('input[name="new-password"]').exists()).toBe(true);
  });

  it('after a failed check, keeps the reason beside "Try again" once the snackbar is closed, in the current language', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(checkResetCode).mockRejectedValue(failure('auth/network-request-failed'));
    await mountAt(LINK);

    const close = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[data-testid="auth-error"] button'),
    ).find((b) => b.textContent?.trim() === 'Close');
    if (!close) throw new Error('no snackbar Close button');
    close.click();
    await flushPromises();

    expect(snackbarText()).not.toContain(NETWORK);
    const retryState = mounted().get('.auth-message');
    expect(retryState.text()).toContain(NETWORK);
    expect(retryState.text()).toContain('Try again');

    await mounted().get('button[lang="hi"]').trigger('click');
    await flushPromises();

    expect(mounted().get('.auth-message').text()).not.toContain(NETWORK);
    expect(mounted().get('.auth-message').text()).toContain(i18n.global.t('auth.errors.network'));
  });

  it('a password with no digit is refused under the field, and nothing is sent', async () => {
    await openForm();
    await typePasswords('abcdefgh');

    await changePassword();

    expect(mounted().text()).toContain(STRENGTH);
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('a confirmation that differs is refused, and nothing is sent', async () => {
    await openForm();
    await typePasswords('newpass12', 'newpass13');

    await changePassword();

    expect(mounted().text()).toContain(MATCH);
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("sets the password with the link's code, then says so and offers sign-in", async () => {
    vi.mocked(resetPassword).mockResolvedValue();
    await openForm();
    await typePasswords('newpass12');

    await changePassword();

    expect(resetPassword).toHaveBeenCalledExactlyOnceWith('abc', 'newpass12');
    expect(mounted().text()).toContain(DONE);
    expect(link('Sign in')?.attributes('href')).toBe('/signin');
    expect(mounted().find('input[name="new-password"]').exists()).toBe(false);
  });

  it('sets the password once when "Change password" is pressed twice before the first call settles', async () => {
    let settle: () => void = () => {};
    vi.mocked(resetPassword).mockReturnValue(
      new Promise<void>((resolve) => {
        settle = resolve;
      }),
    );
    await openForm();
    await typePasswords('newpass12');

    const submit = button('Change password');
    await Promise.all([submit.trigger('click'), submit.trigger('click')]);
    await flushPromises();
    await submit.trigger('click');
    await flushPromises();
    settle();
    await flushPromises();

    expect(resetPassword).toHaveBeenCalledTimes(1);
    expect(mounted().text()).toContain(DONE);
  });

  it('on a network failure, shows the error and keeps both fields as typed, with the button usable', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(resetPassword).mockRejectedValue(failure('auth/network-request-failed'));
    await openForm();
    await typePasswords('newpass12');

    await changePassword();

    expect(snackbarText()).toContain(NETWORK);
    expect(newPasswordInput().value).toBe('newpass12');
    expect(confirmInput().value).toBe('newpass12');
    expect(button('Change password').classes()).not.toContain('v-btn--loading');
    expect(button('Change password').attributes('disabled')).toBeUndefined();
    expect(mounted().text()).not.toContain(DONE);
  });

  it('when the link expires before the password is set, shows the expired-link state', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(resetPassword).mockRejectedValue(failure('auth/expired-action-code'));
    await openForm();
    await typePasswords('newpass12');

    await changePassword();

    expect(mounted().text()).toContain(EXPIRED);
    expect(link('Ask for a new link')?.attributes('href')).toBe('/forgot-password');
    expect(mounted().find('input[name="new-password"]').exists()).toBe(false);
    expect(mounted().text()).not.toContain(DONE);
  });

  it("logs a failed check by its code only, never the link's code, the email or the message", async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(checkResetCode).mockRejectedValue(
      failure('auth/network-request-failed', 'oob-SECRET-42'),
    );

    await mountAt('/reset-password?mode=resetPassword&oobCode=oob-SECRET-42');

    expect(warn).toHaveBeenCalledExactlyOnceWith(
      '[auth] reset link check failed:',
      'auth/network-request-failed',
    );
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).not.toContain('oob-SECRET-42');
    expect(logged).not.toContain(ANN);
  });

  it("logs a failed reset by its code only, never the link's code, the email or the password", async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(resetPassword).mockRejectedValue(
      failure('auth/expired-action-code', 'oob-SECRET-42 newpass12'),
    );
    await openForm('/reset-password?mode=resetPassword&oobCode=oob-SECRET-42');
    await typePasswords('newpass12');

    await changePassword();

    expect(warn).toHaveBeenCalledExactlyOnceWith(
      '[auth] password reset failed:',
      'auth/expired-action-code',
    );
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).not.toContain('oob-SECRET-42');
    expect(logged).not.toContain(ANN);
    expect(logged).not.toContain('newpass12');
  });

  it('a failure with no code shows the general error and logs "unknown"', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(resetPassword).mockRejectedValue(new Error(`boom ${ANN}`));
    await openForm();
    await typePasswords('newpass12');

    await changePassword();

    expect(snackbarText()).toContain('Something went wrong. Try again.');
    expect(warn).toHaveBeenCalledExactlyOnceWith('[auth] password reset failed:', 'unknown');
    expect(newPasswordInput().value).toBe('newpass12');
  });

  it('shows the logo, the title, the subtitle, the language toggle and the privacy link', async () => {
    await openForm();

    expect(mounted().find('svg[aria-hidden="true"]').exists()).toBe(true);
    expect(mounted().get('h1').text()).toBe('Task Manager');
    expect(mounted().text()).toContain('Set a new password');
    expect(mounted().find('[role="group"][aria-label="Language"]').exists()).toBe(true);
    expect(link('Privacy policy')?.attributes('href')).toBe('/privacy');
  });

  it('switching to Hindi on the invalid-link state keeps that state, in Hindi', async () => {
    await mountAt('/reset-password');

    await mounted().get('button[lang="hi"]').trigger('click');
    await flushPromises();

    expect(mounted().text()).toContain(
      'यह रीसेट लिंक मान्य नहीं है, या पहले ही इस्तेमाल हो चुका है। नया लिंक माँगें।',
    );
    expect(mounted().text()).toContain('नया लिंक माँगें');
    expect(mounted().text()).not.toContain(INVALID);
    expect(checkResetCode).not.toHaveBeenCalled();
  });

  it("a new link opened on the same screen is checked again, and the old check's answer is dropped", async () => {
    let answerOld: (email: string) => void = () => {};
    vi.mocked(checkResetCode)
      .mockReturnValueOnce(
        new Promise<string>((resolve) => {
          answerOld = resolve;
        }),
      )
      .mockResolvedValueOnce('bob@example.com');
    vi.mocked(resetPassword).mockResolvedValue();
    const router = await mountAt('/reset-password?mode=resetPassword&oobCode=old');

    await router.push('/reset-password?mode=resetPassword&oobCode=new');
    await flushPromises();
    answerOld(ANN);
    await flushPromises();

    expect(checkResetCode).toHaveBeenLastCalledWith('new');
    expect(mounted().text()).toContain('For bob@example.com');
    expect(mounted().text()).not.toContain(ANN);

    await typePasswords('newpass12');
    await changePassword();
    expect(resetPassword).toHaveBeenCalledExactlyOnceWith('new', 'newpass12');
  });
});
