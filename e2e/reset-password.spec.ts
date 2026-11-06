import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { createUser, listOobCodes, newResetCodes, resetEmulators } from './support/emulator';

/** The strings these tests look for, read from the app's own locale file. */
interface AuthStrings {
  signIn: { email: string; submit: string };
  forgot: { subtitle: string; submit: string; sent: string };
  reset: { forEmail: string; submit: string; done: string; signIn: string; requestNew: string };
  fields: { email: string; password: string; newPassword: string; confirmPassword: string };
  errors: { resetLinkInvalid: string };
}
const EN = JSON.parse(
  readFileSync(new URL('../src/i18n/locales/en/auth.json', import.meta.url), 'utf8'),
) as AuthStrings;

const ANN = 'ann@example.com';
const OLD_PASSWORD = 'abc-def_9';
const NEW_PASSWORD = 'newpass12';
/** A wrong password and an unknown email share one message (questions/sign-in-error-enumeration). */
const WRONG_PASSWORD_ERROR = /Incorrect email or password\./;

/** Asks for a reset through /forgot-password and returns the code the Auth emulator recorded. */
async function askForReset(page: Page, email: string): Promise<string> {
  const before = await listOobCodes();
  await page.goto('/forgot-password');
  await page.getByLabel(EN.fields.email, { exact: true }).fill(email);
  await page.getByRole('button', { name: EN.forgot.submit }).click();
  await expect(page.getByText(EN.forgot.sent)).toBeVisible();

  let code = '';
  await expect
    .poll(async () => {
      const [found] = await newResetCodes(email, before);
      code = found?.oobCode ?? '';
      return code;
    })
    .not.toBe('');
  return code;
}

/** The link the reset email carries, on this app. */
function resetLink(code: string): string {
  return `/reset-password?mode=resetPassword&oobCode=${encodeURIComponent(code)}`;
}

/** Fills and submits the sign-in form; the page must be on /signin. */
async function signInWithForm(page: Page, email: string, password: string): Promise<void> {
  await page.getByRole('button', { name: EN.signIn.email }).click();
  await page.getByLabel(EN.fields.email, { exact: true }).fill(email);
  await page.getByLabel(EN.fields.password, { exact: true }).fill(password);
  await page.getByRole('button', { name: EN.signIn.submit, exact: true }).click();
}

test.describe('reset password', () => {
  test.beforeEach(async () => {
    await resetEmulators();
  });

  test('the email link sets a new password once, and the old one stops working', async ({
    page,
  }) => {
    await createUser(ANN, OLD_PASSWORD);
    const code = await askForReset(page, ANN);

    await page.goto(resetLink(code));
    await expect(page.getByText(EN.reset.forEmail.replace('{email}', ANN))).toBeVisible();

    await page.getByLabel(EN.fields.newPassword, { exact: true }).fill(NEW_PASSWORD);
    await page.getByLabel(EN.fields.confirmPassword, { exact: true }).fill(NEW_PASSWORD);
    await page.getByRole('button', { name: EN.reset.submit }).click();
    await expect(page.getByText(EN.reset.done)).toBeVisible();

    // The old password no longer signs in.
    await page.getByRole('link', { name: EN.reset.signIn, exact: true }).click();
    await expect(page).toHaveURL(/\/signin$/);
    await signInWithForm(page, ANN, OLD_PASSWORD);
    await expect(page.getByTestId('auth-error')).toContainText(WRONG_PASSWORD_ERROR);

    // The new one does.
    await page.goto('/signin');
    await signInWithForm(page, ANN, NEW_PASSWORD);
    await expect(page).toHaveURL(/\/home$/);

    // The used link, opened again (here on a signed-in device), offers a new one, and the
    // forgot-password screen opens for a signed-in visitor.
    await page.goto(resetLink(code));
    await expect(page.getByText(EN.errors.resetLinkInvalid)).toBeVisible();
    await page.getByRole('link', { name: EN.reset.requestNew }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);
    await expect(page.getByText(EN.forgot.subtitle)).toBeVisible();
    await expect(page.getByRole('button', { name: EN.forgot.submit })).toBeVisible();
  });
});
