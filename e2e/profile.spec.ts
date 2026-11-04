import { expect, test, type Page } from '@playwright/test';
import {
  createUser,
  resetEmulators,
  seedDoc,
  setPhotoUrl,
  signInAs,
  type TestUser,
} from './support/emulator';
import {
  VISUAL_SKIP_REASON,
  canCompareVisuals,
  compareScreen,
  type VisualState,
} from './support/visual';

const PASSWORD = 'abc-def_9';

/** Signs in as `user` with the app in `lang`, then opens /profile and waits for the user to show. */
async function openProfile(page: Page, user: TestUser, lang: 'en' | 'hi' = 'en'): Promise<void> {
  await page.addInitScript((saved) => localStorage.setItem('lang', saved), lang);
  await signInAs(page, user.email, user.password);
  await page.goto('/profile');
  await expect(page.getByText(user.email, { exact: true })).toBeVisible();
}

/** The profile's name heading (the page's own, not one the app bar may add). */
function nameHeading(page: Page) {
  return page.getByRole('main').getByRole('heading', { level: 1 });
}

/** Makes every display-name update (Auth `accounts:update`) fail as a dropped connection would. */
async function failNameUpdates(page: Page): Promise<void> {
  await page.route(
    (url) => url.pathname.endsWith('/accounts:update'),
    (route) => route.abort('internetdisconnected'),
  );
}

test.describe('profile', () => {
  let user: TestUser;

  test.beforeEach(async () => {
    await resetEmulators();
    user = await createUser('ankit@example.info', PASSWORD, 'Ankit');
  });

  test('the name-edit button is visible without hover, reachable by Tab, and labelled (D11)', async ({
    page,
    browserName,
  }) => {
    await openProfile(page, user);
    const edit = page.getByRole('button', { name: 'Edit name' });

    await expect(edit).toBeVisible();
    await expect(edit).toHaveAttribute('aria-label', 'Edit name');

    // WebKit on macOS moves focus only between form fields on Tab; Alt+Tab reaches buttons too.
    const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    for (let i = 0; i < 40; i += 1) {
      if (await edit.evaluate((el) => el === document.activeElement)) break;
      await page.keyboard.press(tab);
    }
    await expect(edit).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page.getByLabel('Your name')).toBeFocused();
  });

  test('renaming to "Ankit P" shows it in the header and keeps it after reload', async ({
    page,
  }) => {
    await openProfile(page, user);
    await expect(nameHeading(page)).toHaveText('Ankit');

    await page.getByRole('button', { name: 'Edit name' }).click();
    const field = page.getByLabel('Your name');
    await expect(field).toHaveValue('Ankit');
    await field.fill('Ankit P');
    await field.press('Enter');

    await expect(nameHeading(page)).toHaveText('Ankit P');
    await expect(field).toBeHidden();

    await page.reload();

    await expect(nameHeading(page)).toHaveText('Ankit P');
  });

  test('a failed rename keeps the typed name and shows the old error, not a raw key (D18)', async ({
    page,
  }) => {
    await openProfile(page, user, 'hi');
    await failNameUpdates(page);

    await page.getByRole('button', { name: 'नाम बदलें' }).click();
    const field = page.getByLabel('आपका नाम');
    await field.fill('Ankit P');
    await page.getByRole('button', { name: 'नाम सहेजें' }).click();

    const error = page.getByText('Error updating name');
    await expect(error).toBeVisible();
    await expect(field).toBeVisible();
    await expect(field).toHaveValue('Ankit P');
    await expect(nameHeading(page)).toHaveText('Ankit');
    await expect(page.locator('body')).not.toContainText('profile.');

    // The kept input can be saved again once the connection is back.
    await page.unrouteAll();
    await page.getByRole('button', { name: 'नाम सहेजें' }).click();

    await expect(nameHeading(page)).toHaveText('Ankit P');
    await expect(error).toHaveCount(0);
  });

  test('a label name must be 1–30 characters after trimming; "Work" with a colour is kept (D15)', async ({
    page,
  }) => {
    await openProfile(page, user);
    const name = page.getByLabel('Create a new label');
    const add = page.getByRole('button', { name: 'Add label' });
    const items = page.getByRole('list', { name: 'LABELS' }).getByRole('listitem');

    await name.fill('   ');
    await add.click();
    await expect(page.getByText('Enter a label name')).toBeVisible();

    await name.fill('x'.repeat(31));
    await name.press('Enter');
    await expect(page.getByText('Keep it under 30 characters')).toBeVisible();
    await expect(name).toHaveValue('x'.repeat(31));
    await expect(items).toHaveCount(0);

    await name.fill('Work');
    await expect(page.getByText('Keep it under 30 characters')).toHaveCount(0);
    await page.getByLabel('Label colour').fill('#e91e63');
    await add.click();

    const work = items.filter({ hasText: 'Work' });
    await expect(work).toBeVisible();
    await expect(work.locator('.v-icon')).toHaveCSS('color', 'rgb(233, 30, 99)');
    await expect(name).toHaveValue('');

    await page.reload();

    await expect(items).toHaveCount(1);
    await expect(work).toBeVisible();
    await expect(work.locator('.v-icon')).toHaveCSS('color', 'rgb(233, 30, 99)');
  });

  test('the LABELS heading and the NA placeholder come from the locale files in both languages', async ({
    page,
  }) => {
    const nameless = await createUser('nameless@example.info', PASSWORD);

    await openProfile(page, nameless);
    await expect(page.getByRole('heading', { name: 'LABELS' })).toBeVisible();
    await expect(nameHeading(page)).toHaveText('NA');

    // Init scripts run in the order they were added, so the saved language is now Hindi.
    await openProfile(page, nameless, 'hi');
    // The old app wrote both in English in every language.
    await expect(page.getByRole('heading', { name: 'LABELS' })).toBeVisible();
    await expect(nameHeading(page)).toHaveText('NA');
    await expect(page.getByRole('button', { name: 'नाम बदलें' })).toBeVisible();
    await expect(page.locator('body')).not.toContainText('profile.');
  });

  test('the avatar shows mdi-face-man without a name or photo, and the photo for an https one', async ({
    page,
  }) => {
    const nameless = await createUser('plain@example.info', PASSWORD);
    await openProfile(page, nameless);
    const avatar = page.getByRole('main').locator('.v-avatar');
    await expect(avatar.locator('.mdi-face-man')).toHaveCount(1);
    await expect(avatar.locator('img')).toHaveCount(0);

    await page.route('https://photos.example/**', (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.alloc(0) }),
    );
    await setPhotoUrl(nameless.email, nameless.password, 'https://photos.example/me.png');
    // The app reads the photo when it signs in, so sign in again.
    await page.reload();
    await signInAs(page, nameless.email, nameless.password);
    await page.goto('/profile');

    await expect(avatar.locator('img')).toHaveAttribute('src', 'https://photos.example/me.png');
    await expect(avatar.locator('.mdi-face-man')).toHaveCount(0);
  });
});

test.describe('profile visual', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'captured once, in Chromium');
  test.skip(!canCompareVisuals(), VISUAL_SKIP_REASON);
  test.describe.configure({ timeout: 600_000 });

  const email = 'visual@example.info';

  test.beforeAll(async () => {
    await resetEmulators();
    const owner = await createUser(email, PASSWORD, 'Ankit Pandit');
    await seedDoc('types/visual-work', { uid: owner.uid, label: 'Work', color: '#E91E63' });
    await seedDoc('types/visual-home', { uid: owner.uid, label: 'Home', color: '#3F51B5' });
  });

  const signIn = (page: Page) => signInAs(page, email, PASSWORD);
  const labelsShown = async (page: Page) => {
    const list = page.getByRole('list', { name: /^(LABELS|लेबल)$/ });
    await expect(list.getByRole('listitem')).toHaveCount(2);
  };

  const states: VisualState[] = [
    { name: 'profile', path: '/profile', before: signIn, act: labelsShown },
    {
      name: 'profile-editing',
      path: '/profile',
      before: signIn,
      act: async (page) => {
        await labelsShown(page);
        await page.getByRole('button', { name: 'Edit name' }).click();
        await expect(page.getByLabel('Your name')).toBeVisible();
      },
    },
    {
      name: 'profile-label-error',
      path: '/profile',
      before: signIn,
      act: async (page) => {
        await labelsShown(page);
        await page.getByRole('button', { name: 'Add label' }).click();
        await expect(page.getByText('Enter a label name')).toBeVisible();
      },
    },
    { name: 'profile-hi', path: '/profile', locale: 'hi', before: signIn, act: labelsShown },
    { name: 'profile-dark', path: '/profile', theme: 'dark', before: signIn, act: labelsShown },
  ];

  test('matches the approved references at 390 and 1280', async ({ browser, baseURL }) => {
    const result = await compareScreen(browser, baseURL ?? '', 'profile', states);

    for (const ref of result.newReferences) {
      test.info().annotations.push({ type: 'new reference, needs approval', description: ref });
    }
    expect(result.status, result.output).toBe(0);
  });
});
