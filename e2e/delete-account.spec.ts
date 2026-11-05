import { expect, test } from '@playwright/test';
import {
  createUser,
  listUserEmails,
  resetEmulators,
  signInAs,
  type TestUser,
} from './support/emulator';

const PASSWORD = 'abc-def_9';

test.describe('delete account from Profile (D1–D5)', () => {
  let user: TestUser;

  test.beforeEach(async () => {
    await resetEmulators();
    user = await createUser('leaving@example.info', PASSWORD, 'Leaving');
  });

  test('confirms by password, takes DELETE, deletes, and the account no longer signs in', async ({
    page,
  }) => {
    await signInAs(page, user.email, user.password);
    await page.goto('/profile');
    await expect(page.getByText(user.email, { exact: true })).toBeVisible();

    await expect(page.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute(
      'href',
      '/privacy',
    );
    await page.getByRole('button', { name: 'Delete account', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Delete your account?')).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'How deletion works' })).toHaveAttribute(
      'href',
      '/delete-account',
    );
    const word = dialog.getByLabel('Type DELETE to confirm');
    const remove = dialog.getByRole('button', { name: 'Delete account' });
    await expect(word).toBeDisabled();
    await expect(remove).toBeDisabled();

    // D3: a wrong password says so and leaves the dialog unconfirmed.
    await dialog.getByLabel('Password', { exact: true }).fill('not-the-password-1');
    await dialog.getByRole('button', { name: 'Confirm' }).click();
    await expect(dialog.getByText('That password is wrong.')).toBeVisible();
    await expect(word).toBeDisabled();

    await dialog.getByLabel('Password', { exact: true }).fill(user.password);
    await dialog.getByRole('button', { name: 'Confirm' }).click();
    await expect(dialog.getByText('Confirmed. Now type DELETE.')).toBeVisible();

    await word.fill('delete');
    await expect(remove).toBeDisabled();
    await word.fill('DELETE');
    await expect(remove).toBeEnabled();
    await remove.click();

    // D5: off to sign-in, with the snackbar saying so.
    await expect(page).toHaveURL(/\/signin$/);
    await expect(page.getByText('Your account was deleted.')).toBeVisible();
    expect(await listUserEmails()).not.toContain(user.email);

    // The account is gone: signing in with it again fails.
    await page.getByRole('button', { name: 'Sign in with Email' }).click();
    await page.getByLabel('Email', { exact: true }).fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill(user.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByTestId('auth-error')).toBeVisible();
    await expect(page).toHaveURL(/\/signin$/);
  });
});
