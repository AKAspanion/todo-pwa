import { expect, test, type Page } from '@playwright/test';
import { createUser, resetEmulators, signInAs, type TestUser } from './support/emulator';

const PASSWORD = 'abc-def_9';

/** W1: the public pages show neither the app bar's menu nor the bottom navigation. */
async function expectNoAppChrome(page: Page): Promise<void> {
  await expect(page.getByTestId('app-menu')).toHaveCount(0);
  await expect(page.getByTestId('app-back')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);
}

test.describe('legal pages, signed out (W1, W3, W4)', () => {
  let user: TestUser;

  test.beforeEach(async () => {
    await resetEmulators();
    user = await createUser('ankit@example.info', PASSWORD, 'Ankit');
  });

  test('from sign-in, the privacy policy leads to account deletion and on to the profile', async ({
    page,
  }) => {
    await page.goto('/signin');

    await page.getByRole('link', { name: 'Privacy policy' }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Privacy policy' })).toBeVisible();
    await expect(page.getByText('Effective 4 November 2026')).toBeVisible();
    await expect(page.locator('[lang="en"]').first()).toBeVisible();
    await expectNoAppChrome(page);

    await page.getByRole('link', { name: /delete/i }).click();
    await expect(page).toHaveURL(/\/delete-account$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Delete your Task Manager account' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'panditankit1995@gmail.com' })).toHaveAttribute(
      'href',
      'mailto:panditankit1995@gmail.com?subject=Delete%20my%20Task%20Manager%20account',
    );
    await expectNoAppChrome(page);

    // Signed out, "Go to Profile" goes through sign-in, remembering the profile.
    await page.getByRole('link', { name: 'Go to Profile' }).click();
    await expect(page).toHaveURL(/\/signin\?redirect=(%2F|\/)profile$/);

    // signInAs signs in behind the screen's back; reloading lets the guard send the
    // signed-in visit on to the remembered /profile.
    await signInAs(page, user.email, user.password);
    await page.reload();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByText(user.email, { exact: true })).toBeVisible();
  });

  test('opened first, the back button goes to /home, through sign-in when signed out', async ({
    page,
  }) => {
    await page.goto('/privacy');

    await page.getByRole('button', { name: 'Back' }).click();

    await expect(page).toHaveURL(/\/signin\?redirect=(%2F|\/)home$/);
  });
});
