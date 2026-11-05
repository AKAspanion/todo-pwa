import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { createUser, listOobCodes, resetEmulators } from './support/emulator';

/** The strings these tests look for, read from the app's own locale file. */
interface AuthStrings {
  signIn: { email: string; forgotLink: string };
  forgot: { subtitle: string; submit: string; sent: string; backToSignIn: string };
  fields: { email: string };
}
const EN = JSON.parse(
  readFileSync(new URL('../src/i18n/locales/en/auth.json', import.meta.url), 'utf8'),
) as AuthStrings;

const PASSWORD = 'abc-def_9';

/** From sign-in: opens the email form, types `email`, follows "Forgot password?" and sends. */
async function askForResetFromSignIn(page: Page, email: string): Promise<void> {
  await page.goto('/signin');
  await page.getByRole('button', { name: EN.signIn.email }).click();
  await page.getByLabel(EN.fields.email, { exact: true }).fill(email);
  await page.getByRole('link', { name: EN.signIn.forgotLink }).click();

  await expect(page).toHaveURL(/\/forgot-password$/);
  expect(page.url()).not.toContain(encodeURIComponent(email));
  await expect(page.getByRole('heading', { name: 'Task Manager' })).toBeVisible();
  await expect(page.getByText(EN.forgot.subtitle)).toBeVisible();
  await expect(page.getByLabel(EN.fields.email, { exact: true })).toHaveValue(email);

  await page.getByRole('button', { name: EN.forgot.submit }).click();
}

test.describe('forgot password', () => {
  test.beforeEach(async () => {
    await resetEmulators();
  });

  test('a known address gets a reset code and the neutral confirmation', async ({ page }) => {
    await createUser('ann@example.com', PASSWORD);

    await askForResetFromSignIn(page, 'ann@example.com');

    await expect(page.getByText(EN.forgot.sent)).toBeVisible();
    await expect(page.getByRole('link', { name: EN.forgot.backToSignIn })).toBeVisible();
    await expect
      .poll(async () =>
        (await listOobCodes()).filter(
          (c) => c.email === 'ann@example.com' && c.requestType === 'PASSWORD_RESET',
        ),
      )
      .toHaveLength(1);
  });

  test('an unknown address gets the same confirmation and no code', async ({ page }) => {
    await createUser('ann@example.com', PASSWORD);

    await askForResetFromSignIn(page, 'nobody@example.com');

    await expect(page.getByText(EN.forgot.sent)).toBeVisible();
    await expect(page.getByRole('link', { name: EN.forgot.backToSignIn })).toBeVisible();
    const codes = await listOobCodes();
    expect(codes.filter((c) => c.email === 'nobody@example.com')).toHaveLength(0);
  });
});
