import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
  createUser,
  listUserEmails,
  resetEmulators,
  seedDoc,
  setPhotoUrl,
} from './support/emulator';
import {
  VISUAL_SKIP_REASON,
  canCompareVisuals,
  compareScreen,
  type VisualState,
} from './support/visual';

/** The strings these tests look for, read from the app's own locale files. */
interface AuthStrings {
  signIn: { title: string; google: string; email: string; submit: string; signUpLink: string };
  signUp: { title: string; google: string; submit: string };
  fields: { email: string; password: string; confirmPassword: string; showPassword: string };
  rules: { passwordsMatch: string };
  language: { label: string; en: string; hi: string };
  menu: { label: string; open: string; darkMode: string; author: string; signOut: string };
}
type Lang = 'en' | 'hi';

function readAuthStrings(lang: Lang): AuthStrings {
  const file = new URL(`../src/i18n/locales/${lang}/auth.json`, import.meta.url);
  return JSON.parse(readFileSync(file, 'utf8')) as AuthStrings;
}
const STRINGS: Record<Lang, AuthStrings> = { en: readAuthStrings('en'), hi: readAuthStrings('hi') };
const EN = STRINGS.en;

const PASSWORD = 'abc-def_9';
/** The old app printed Firebase's raw error here; the app keeps its own text, shown in the old snackbar. */
const NETWORK_ERROR = "Couldn't reach the server. Check your connection and try again.";
/** The emulator reports a wrong password as wrong-password, or invalid-credential with email enumeration protection on. */
const WRONG_PASSWORD_ERROR =
  /The password is invalid or the user does not have a password\.|The email address or password is incorrect\./;

/** Name rules axe checks: every button, link and field has an accessible name (W5). */
const NAME_RULES = [
  'button-name',
  'link-name',
  'label',
  'input-button-name',
  'aria-command-name',
  'aria-toggle-field-name',
  'aria-input-field-name',
];

async function openEmailForm(page: Page, s: AuthStrings = EN): Promise<void> {
  await page.getByRole('button', { name: s.signIn.email }).click();
  await expect(page.getByLabel(s.fields.email, { exact: true })).toBeVisible();
}

/** Fills and submits the sign-in form; the page must be on /signin. */
async function signInWithForm(page: Page, email: string, password: string): Promise<void> {
  await openEmailForm(page);
  await page.getByLabel(EN.fields.email, { exact: true }).fill(email);
  await page.getByLabel(EN.fields.password, { exact: true }).fill(password);
  await page.getByRole('button', { name: EN.signIn.submit, exact: true }).click();
}

/** Fills and submits the sign-up form; the page must be on /signup. */
async function signUpWithForm(page: Page, email: string, password: string): Promise<void> {
  await page.getByLabel(EN.fields.email, { exact: true }).fill(email);
  await page.getByLabel(EN.fields.password, { exact: true }).fill(password);
  await page.getByLabel(EN.fields.confirmPassword, { exact: true }).fill(password);
  await page.getByRole('button', { name: EN.signUp.submit, exact: true }).click();
}

async function abortAuthRequests(page: Page): Promise<void> {
  await page.route('**/identitytoolkit**', (route) => route.abort('internetdisconnected'));
}

/**
 * The page's markup, lower-cased, without the text of its stylesheets: the icon font's CSS
 * (`@mdi/font`, which the spec names) lists every icon, `mdi-facebook` among them.
 */
async function markupWithoutStyles(page: Page): Promise<string> {
  return page.evaluate(() => {
    const copy = document.documentElement.cloneNode(true) as HTMLElement;
    copy.querySelectorAll('style').forEach((style) => style.remove());
    return copy.outerHTML.toLowerCase();
  });
}

async function openMenu(page: Page, s: AuthStrings = EN): Promise<void> {
  await page.getByRole('button', { name: s.menu.open }).click();
  await expect(page.getByRole('button', { name: s.menu.signOut })).toBeVisible();
}

interface PerUserState {
  tasks: string[];
  labels: string[];
  notifications: string[];
}

/**
 * The ids in the app's tasks, labels and notifications stores, read from the running app (the
 * same modules it uses, served by the dev server). With `load`, each store loads first, as the
 * screens do, for whoever is signed in.
 */
function perUserState(page: Page, load: boolean): Promise<PerUserState> {
  return page.evaluate(async (shouldLoad) => {
    type Ids<K extends string> = { load(): Promise<void> } & Record<K, { id: string }[]>;
    // Paths the dev server resolves, kept in variables so the e2e type-check doesn't follow them.
    const paths = ['/src/stores/tasks.ts', '/src/stores/labels.ts', '/src/stores/notifications.ts'];
    const [tasksModule, labelsModule, notificationsModule] = (await Promise.all(
      paths.map((path) => import(path)),
    )) as [
      { useTasksStore(): Ids<'tasks'> },
      { useLabelsStore(): Ids<'labels'> },
      { useNotificationsStore(): Ids<'items'> },
    ];
    const tasks = tasksModule.useTasksStore();
    const labels = labelsModule.useLabelsStore();
    const notifications = notificationsModule.useNotificationsStore();
    if (shouldLoad) await Promise.all([tasks.load(), labels.load(), notifications.load()]);
    return {
      tasks: tasks.tasks.map((t) => t.id),
      labels: labels.labels.map((l) => l.id),
      notifications: notifications.items.map((n) => n.id),
    };
  }, load);
}

test.describe('sign-in and sign-up', () => {
  test.beforeEach(async () => {
    await resetEmulators();
  });

  test('neither screen offers Facebook sign-in (§11.1)', async ({ page }) => {
    await page.goto('/signin');
    await expect(page.getByRole('heading', { name: EN.signIn.title })).toBeVisible();
    await expect(page.getByRole('button', { name: EN.signIn.google })).toBeVisible();
    await expect(page.getByText(/facebook/i)).toHaveCount(0);
    expect(await markupWithoutStyles(page)).not.toContain('facebook');

    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: EN.signUp.title })).toBeVisible();
    await expect(page.getByText(/facebook/i)).toHaveCount(0);
    expect(await markupWithoutStyles(page)).not.toContain('facebook');
  });

  test("both screens carry the old app's words, not the rewrite's", async ({ page }) => {
    await page.goto('/signin');
    await expect(page.getByRole('heading', { name: 'Task Manager' })).toBeVisible();
    await expect(page.getByText('Sign in to application')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in with Email' })).toBeVisible();

    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: 'Task Manager' })).toBeVisible();
    await expect(page.getByText('Create an account')).toBeVisible();
    await expect(page.getByText('OR', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Confirm', { exact: true })).toBeVisible();

    await page.addInitScript(() => localStorage.setItem('lang', 'hi'));
    await page.goto('/signin');
    await expect(page.getByRole('heading', { name: 'टास्क मैनेजर' })).toBeVisible();
    await expect(page.getByText('एप्लीकेशन में साइन इन करें')).toBeVisible();
    await expect(page.getByRole('button', { name: 'गूगल से साइन इन करें' })).toBeVisible();
  });

  test('no file under src mentions Facebook (§11.1)', ({ browserName }) => {
    test.skip(browserName !== 'chromium', 'checks files, not a browser');
    const root = new URL('../src/', import.meta.url).pathname;
    const mentions = readdirSync(root, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => join(entry.parentPath, entry.name))
      .filter((file) => /facebook/i.test(readFileSync(file, 'latin1')));

    expect(mentions).toEqual([]);
  });

  test('signs up new@user.info with password abc-def_9 and lands on /home (D14)', async ({
    page,
  }) => {
    await page.goto('/signup');

    await signUpWithForm(page, 'new@user.info', PASSWORD);

    await expect(page).toHaveURL(/\/home$/);
    expect(await listUserEmails()).toEqual(['new@user.info']);
  });

  test('refuses the password abcdefgh, with the rule, before anything is sent (D14)', async ({
    page,
  }) => {
    await page.goto('/signup');

    await signUpWithForm(page, 'new@user.info', 'abcdefgh');

    await expect(
      page.getByText('Use at least 8 characters with a letter and a number.'),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/signup$/);
    expect(await listUserEmails()).toEqual([]);
  });

  test('signing up an email already in use shows the Firebase message and keeps the email', async ({
    page,
  }) => {
    await createUser('taken@user.info', PASSWORD);
    await page.goto('/signup');

    await signUpWithForm(page, 'taken@user.info', PASSWORD);

    await expect(page.getByTestId('auth-error')).toContainText(
      'The email address is already in use by another account.',
    );
    await expect(page.getByLabel(EN.fields.email, { exact: true })).toHaveValue('taken@user.info');
    await expect(page).toHaveURL(/\/signup$/);
  });

  test('a signed-out visit to /calendar signs in and lands back on /calendar (§3.1)', async ({
    page,
  }) => {
    await createUser('ada@user.info', PASSWORD);

    await page.goto('/calendar');
    await expect(page).toHaveURL(
      (url) => url.pathname === '/signin' && url.searchParams.get('redirect') === '/calendar',
    );
    await signInWithForm(page, 'ada@user.info', PASSWORD);

    await expect(page).toHaveURL(/\/calendar$/);
  });

  test('a redirect off the app is ignored: signing in lands on /home', async ({ page }) => {
    await createUser('ada@user.info', PASSWORD);

    await page.goto('/signin?redirect=https://evil.example/home');
    await signInWithForm(page, 'ada@user.info', PASSWORD);

    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/home$/);
  });

  test('a wrong password shows the Firebase error, stops loading and leaves the form usable', async ({
    page,
  }) => {
    await createUser('ada@user.info', PASSWORD);
    await page.goto('/signin');

    await signInWithForm(page, 'ada@user.info', 'wrong-pass-1');

    // As in the old app, the failure is in the bottom snackbar, and the fields keep their values.
    const error = page.getByTestId('auth-error');
    await expect(error).toContainText(WRONG_PASSWORD_ERROR);
    await expect(error.locator('.v-snackbar__wrapper')).toBeVisible();
    await expect(page.getByLabel(EN.fields.email, { exact: true })).toHaveValue('ada@user.info');
    await expect(page.getByLabel(EN.fields.password, { exact: true })).toHaveValue('wrong-pass-1');
    const submit = page.getByRole('button', { name: EN.signIn.submit, exact: true });
    await expect(submit).not.toHaveClass(/v-btn--loading/);
    await expect(submit).toBeEnabled();
    const password = page.getByLabel(EN.fields.password, { exact: true });
    await password.focus();
    await expect(password).toBeFocused();
    await expect(page).toHaveURL(/\/signin$/);
  });

  test('with the auth server unreachable, sign-in says so', async ({ page }) => {
    await createUser('ada@user.info', PASSWORD);
    await abortAuthRequests(page);
    await page.goto('/signin');

    await signInWithForm(page, 'ada@user.info', PASSWORD);

    await expect(page.getByTestId('auth-error')).toContainText(NETWORK_ERROR);
    await expect(page.getByRole('button', { name: EN.signIn.submit, exact: true })).not.toHaveClass(
      /v-btn--loading/,
    );
  });

  test('with the auth server unreachable, sign-up says so', async ({ page }) => {
    await abortAuthRequests(page);
    await page.goto('/signup');

    await signUpWithForm(page, 'new@user.info', PASSWORD);

    await expect(page.getByTestId('auth-error')).toContainText(NETWORK_ERROR);
    await expect(page.getByLabel(EN.fields.email, { exact: true })).toHaveValue('new@user.info');
  });

  test('the sign-in link to sign-up keeps the page to return to', async ({ page }) => {
    await page.goto('/calendar');

    await page.getByRole('link', { name: EN.signIn.signUpLink }).click();

    await expect(page).toHaveURL(
      (url) => url.pathname === '/signup' && url.searchParams.get('redirect') === '/calendar',
    );
  });

  test('a signed-in visit to /signin goes to /home', async ({ page }) => {
    await createUser('ada@user.info', PASSWORD);
    await page.goto('/signin');
    await signInWithForm(page, 'ada@user.info', PASSWORD);
    await expect(page).toHaveURL(/\/home$/);

    await page.goto('/signin');

    await expect(page).toHaveURL(/\/home$/);
  });
});

test.describe('app menu', () => {
  test.beforeEach(async () => {
    await resetEmulators();
  });

  test("user A signs out from the menu, and user B gets none of A's data (D13, Review Focus 4)", async ({
    page,
  }) => {
    const a = await createUser('a@user.info', PASSWORD, 'User A');
    await createUser('b@user.info', PASSWORD, 'User B');
    await seedDoc('tasks/a-task', {
      uid: a.uid,
      title: 'A secret task',
      description: '',
      status: 'todo',
      date: 'NA',
      time: 'NA',
      type: [],
    });
    await seedDoc('types/a-label', { uid: a.uid, label: 'A label', color: '#f00' });
    await seedDoc('notifications/a-note', {
      uid: a.uid,
      title: 'A reminder',
      body: 'For A',
      taskId: 'a-task',
      createdAt: new Date('2026-11-02T08:00:00Z'),
    });

    await page.goto('/signin');
    await signInWithForm(page, 'a@user.info', PASSWORD);
    await expect(page).toHaveURL(/\/home$/);
    await expect
      .poll(() => perUserState(page, true))
      .toEqual({ tasks: ['a-task'], labels: ['a-label'], notifications: ['a-note'] });

    await openMenu(page);
    await expect(page.getByText('User A')).toBeVisible();
    await page.getByRole('button', { name: EN.menu.signOut }).click();

    await expect(page).toHaveURL(/\/signin$/);
    expect(await perUserState(page, false)).toEqual({ tasks: [], labels: [], notifications: [] });

    await signInWithForm(page, 'b@user.info', PASSWORD);
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByText('A secret task')).toHaveCount(0);
    expect(await perUserState(page, true)).toEqual({ tasks: [], labels: [], notifications: [] });
    await openMenu(page);
    await expect(page.getByText('User B')).toBeVisible();
    await expect(page.getByText('User A')).toHaveCount(0);
  });

  test('the language toggle switches to Hindi, and it stays after a reload', async ({ page }) => {
    await createUser('ada@user.info', PASSWORD, 'Ada');
    await page.goto('/signin');
    await signInWithForm(page, 'ada@user.info', PASSWORD);
    await expect(page).toHaveURL(/\/home$/);

    await openMenu(page);
    await page
      .getByRole('group', { name: EN.language.label })
      .getByRole('button', { name: EN.language.hi })
      .click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
    await expect(page.getByRole('button', { name: STRINGS.hi.menu.signOut })).toBeVisible();

    await page.reload();

    await expect(page).toHaveURL(/\/home$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
    expect(await page.evaluate(() => localStorage.getItem('lang'))).toBe('hi');
    await openMenu(page, STRINGS.hi);
  });

  test('the theme toggle switches to light, and it stays after a reload', async ({ page }) => {
    await createUser('ada@user.info', PASSWORD, 'Ada');
    await page.goto('/signin');
    await signInWithForm(page, 'ada@user.info', PASSWORD);
    await expect(page).toHaveURL(/\/home$/);
    // A device that never chose gets dark, as in the old app.
    await expect(page.locator('.v-application')).toHaveClass(/v-theme--dark/);

    await openMenu(page);
    const dark = page.getByLabel(EN.menu.darkMode);
    await expect(dark).toBeChecked();
    await dark.uncheck();

    await expect(page.locator('.v-application')).toHaveClass(/v-theme--light/);

    await page.reload();

    await expect(page.locator('.v-application')).toHaveClass(/v-theme--light/);
    expect(await page.evaluate(() => localStorage.getItem('dark'))).toBe('false');
    await openMenu(page);
    await expect(page.getByLabel(EN.menu.darkMode)).not.toBeChecked();
  });

  test('the author link opens in a new tab with rel="noopener noreferrer" (S6)', async ({
    page,
  }) => {
    await createUser('ada@user.info', PASSWORD, 'Ada');
    await page.goto('/signin');
    await signInWithForm(page, 'ada@user.info', PASSWORD);
    await expect(page).toHaveURL(/\/home$/);

    await openMenu(page);
    const author = page.getByRole('link', { name: EN.menu.author });

    await expect(author).toHaveAttribute('href', 'https://spanion.in');
    await expect(author).toHaveAttribute('target', '_blank');
    await expect(author).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('the menu shows an https profile photo, and no other kind of URL', async ({ page }) => {
    await createUser('ada@user.info', PASSWORD, 'Ada');
    await setPhotoUrl('ada@user.info', PASSWORD, 'javascript:alert(1)');
    await page.goto('/signin');
    await signInWithForm(page, 'ada@user.info', PASSWORD);
    await expect(page).toHaveURL(/\/home$/);

    // The menu's own avatar, in its first row: the bar shows only the three dots.
    const avatar = page.getByRole('list', { name: EN.menu.label }).locator('.v-avatar').first();
    await openMenu(page);
    await expect(avatar).toContainText('A');
    await expect(avatar.locator('img')).toHaveCount(0);

    await setPhotoUrl('ada@user.info', PASSWORD, 'https://photos.example/ada.png');
    await page.route('https://photos.example/**', (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.alloc(0) }),
    );
    // The app reads the photo when it signs in, so sign in again.
    await page.getByRole('button', { name: EN.menu.signOut }).click();
    await expect(page).toHaveURL(/\/signin$/);
    await signInWithForm(page, 'ada@user.info', PASSWORD);
    await expect(page).toHaveURL(/\/home$/);
    await openMenu(page);

    await expect(avatar.locator('img')).toHaveAttribute('src', 'https://photos.example/ada.png');
  });

  test('an email user with no display name sees their email once in the menu', async ({ page }) => {
    await createUser('nameless@user.info', PASSWORD);
    await page.goto('/signin');
    await signInWithForm(page, 'nameless@user.info', PASSWORD);
    await expect(page).toHaveURL(/\/home$/);
    await openMenu(page);

    const firstRow = page
      .getByRole('list', { name: EN.menu.label })
      .locator('.v-list-item')
      .first();
    await expect(firstRow).toContainText('nameless@user.info');
    const text = (await firstRow.textContent()) ?? '';
    expect(text.split('nameless@user.info').length - 1).toBe(1);
  });

  test('the open menu sits above the app bar: nothing covers its first row', async ({ page }) => {
    await createUser('ada@user.info', PASSWORD, 'Ada');
    await page.goto('/signin');
    await signInWithForm(page, 'ada@user.info', PASSWORD);
    await expect(page).toHaveURL(/\/home$/);
    await openMenu(page);

    const avatar = page.getByRole('list', { name: EN.menu.label }).locator('.v-avatar').first();
    await expect(avatar).toBeVisible();
    // The avatar's top edge is where the app bar overlapped the menu.
    const covered = await avatar.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + 1);
      return hit === null || !el.contains(hit);
    });
    expect(covered).toBe(false);
  });

  test('the menu is not shown on the sign-in screen', async ({ page }) => {
    await page.goto('/signin');

    await expect(page.getByRole('heading', { name: EN.signIn.title })).toBeVisible();
    await expect(page.getByRole('button', { name: EN.menu.open })).toHaveCount(0);
  });
});

test.describe('accessibility and layout', () => {
  test.beforeEach(async () => {
    await resetEmulators();
  });

  /** Every icon-only button (no visible text) carries an aria-label. */
  async function unlabelledIconButtons(page: Page): Promise<string[]> {
    return page
      .locator('button, a.v-btn')
      .evaluateAll((buttons) =>
        buttons
          .filter((b) => (b.textContent ?? '').trim() === '' && !b.getAttribute('aria-label'))
          .map((b) => b.outerHTML.slice(0, 120)),
      );
  }

  async function nameViolations(page: Page): Promise<string[]> {
    const { violations } = await new AxeBuilder({ page }).withRules(NAME_RULES).analyze();
    return violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  }

  test('every button, link and field on sign-in, sign-up and the menu has a name (W5)', async ({
    page,
  }) => {
    await page.goto('/signin');
    await openEmailForm(page);
    await expect(page.getByRole('button', { name: EN.fields.showPassword })).toBeVisible();
    expect(await nameViolations(page)).toEqual([]);
    expect(await unlabelledIconButtons(page)).toEqual([]);

    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: EN.signUp.title })).toBeVisible();
    // The old sign-up has an eye on each password field, both labelled.
    await expect(page.getByRole('button', { name: EN.fields.showPassword })).toHaveCount(2);
    await expect(page.getByRole('button', { name: EN.signUp.google })).toBeVisible();
    expect(await nameViolations(page)).toEqual([]);
    expect(await unlabelledIconButtons(page)).toEqual([]);

    await createUser('ada@user.info', PASSWORD, 'Ada');
    await page.goto('/signin');
    await signInWithForm(page, 'ada@user.info', PASSWORD);
    await expect(page).toHaveURL(/\/home$/);
    expect(await unlabelledIconButtons(page)).toEqual([]);
    await openMenu(page);
    expect(await nameViolations(page)).toEqual([]);
    expect(await unlabelledIconButtons(page)).toEqual([]);
  });

  test('the sign-up card keeps its width when a field shows its message', async ({ page }) => {
    // Wide enough for the card to grow: at 390 px it already fills the page, and can't.
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/signup');
    const card = page.locator('.auth-card');
    await expect(card).toBeVisible();
    const before = (await card.boundingBox())?.width;

    await page.getByLabel(EN.fields.email, { exact: true }).fill('new@user.info');
    await page.getByLabel(EN.fields.password, { exact: true }).fill(PASSWORD);
    await page.getByLabel(EN.fields.confirmPassword, { exact: true }).fill('not-the-same-1');
    await page.getByRole('button', { name: EN.signUp.submit, exact: true }).click();
    await expect(page.getByText(EN.rules.passwordsMatch)).toBeVisible();

    expect((await card.boundingBox())?.width).toBe(before);
  });

  test("Hindi buttons don't overflow at 390 px (Review Focus 5)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.addInitScript(() => localStorage.setItem('lang', 'hi'));
    const hi = STRINGS.hi;

    const overflowing = () =>
      page.locator('.v-btn').evaluateAll((buttons) =>
        buttons
          .filter((b) => {
            const content = b.querySelector('.v-btn__content');
            return (
              b.scrollWidth > b.clientWidth ||
              (content !== null && content.scrollWidth > content.clientWidth)
            );
          })
          .map((b) => (b.textContent ?? '').trim()),
      );
    const pageWidth = () => page.evaluate(() => document.documentElement.scrollWidth);

    await page.goto('/signin');
    await expect(page.getByRole('heading', { name: hi.signIn.title })).toBeVisible();
    expect(await overflowing()).toEqual([]);
    expect(await pageWidth()).toBeLessThanOrEqual(390);

    await openEmailForm(page, hi);
    expect(await overflowing()).toEqual([]);
    expect(await pageWidth()).toBeLessThanOrEqual(390);

    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: hi.signUp.title })).toBeVisible();
    expect(await overflowing()).toEqual([]);
    expect(await pageWidth()).toBeLessThanOrEqual(390);
  });
});

/** The auth screen's states, in English and Hindi: the harness captures each at 390 and 1280. */
function authStates(): VisualState[] {
  return (['en', 'hi'] as const).flatMap((locale): VisualState[] => {
    const s = STRINGS[locale];
    const openEmail = (page: Page) => openEmailForm(page, s);
    const heading = (title: string) => (page: Page) =>
      expect(page.getByRole('heading', { name: title })).toBeVisible();
    return [
      { name: `signin-${locale}`, path: '/signin', locale, act: heading(s.signIn.title) },
      { name: `signin-email-open-${locale}`, path: '/signin', locale, act: openEmail },
      {
        name: `signin-error-${locale}`,
        path: '/signin',
        locale,
        before: abortAuthRequests,
        act: async (page) => {
          await openEmail(page);
          await page.getByLabel(s.fields.email, { exact: true }).fill('ada@user.info');
          await page.getByLabel(s.fields.password, { exact: true }).fill(PASSWORD);
          await page.getByRole('button', { name: s.signIn.submit, exact: true }).click();
          await expect(page.getByTestId('auth-error')).toBeVisible();
        },
      },
      { name: `signup-${locale}`, path: '/signup', locale, act: heading(s.signUp.title) },
    ];
  });
}

/** The old app showed its sign-in dark after signing out of a dark page (old-app-states.md). */
const authDarkState = (): VisualState => ({
  name: 'auth-dark',
  path: '/signin',
  theme: 'dark',
  act: (page) => expect(page.getByRole('heading', { name: EN.signIn.title })).toBeVisible(),
});

test.describe('visual', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'captured once, in Chromium');
  test.skip(!canCompareVisuals(), VISUAL_SKIP_REASON);
  test.describe.configure({ timeout: 600_000 });

  test('sign-in and sign-up match the approved references at 390 and 1280', async ({
    browser,
    baseURL,
  }) => {
    await resetEmulators();

    const result = await compareScreen(browser, baseURL ?? '', 'auth', [
      ...authStates(),
      authDarkState(),
    ]);

    if (result.newReferences.length > 0) {
      test.info().annotations.push({
        type: 'new references: the developer approves them',
        description: result.newReferences.join(', '),
      });
    }
    expect(result.status, result.output).toBe(0);
  });
});
