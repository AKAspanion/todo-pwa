import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { listOobCodes, newOobCodes, resetEmulators, type OobCode } from './support/emulator';

/** The strings these tests look for, read from the app's own locale files. */
interface AuthStrings {
  signUp: { submit: string };
  fields: { email: string; password: string; confirmPassword: string };
}
interface VerifyStrings {
  banner: { text: string; resend: string; check: string };
  screen: { done: string; invalid: string; home: string };
}
const locale = <T>(name: string): T =>
  JSON.parse(
    readFileSync(new URL(`../src/i18n/locales/en/${name}.json`, import.meta.url), 'utf8'),
  ) as T;
const AUTH = locale<AuthStrings>('auth');
const VERIFY = locale<VerifyStrings>('verify');

const ANN = 'ann@example.com';
const PASSWORD = 'abc-def_9';
const BANNER = VERIFY.banner.text.replace('{email}', ANN);

/** Signs up through the form and returns the verification code the Auth emulator recorded. */
async function signUp(page: Page): Promise<OobCode> {
  const before = await listOobCodes();
  await page.goto('/signup');
  await page.getByLabel(AUTH.fields.email, { exact: true }).fill(ANN);
  await page.getByLabel(AUTH.fields.password, { exact: true }).fill(PASSWORD);
  await page.getByLabel(AUTH.fields.confirmPassword, { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: AUTH.signUp.submit, exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);

  let found: OobCode | undefined;
  await expect
    .poll(async () => {
      [found] = await newOobCodes(ANN, before, 'VERIFY_EMAIL');
      return found?.oobCode ?? '';
    })
    .not.toBe('');
  if (!found) throw new Error('no verification code');
  return found;
}

/**
 * The link as the console's action URL delivers it: one URL for every Auth email, so the
 * verification link arrives at /reset-password with mode=verifyEmail.
 */
function actionLink(code: string): string {
  return `/reset-password?mode=verifyEmail&oobCode=${encodeURIComponent(code)}`;
}

test.describe('email verification', () => {
  test.beforeEach(async () => {
    await resetEmulators();
  });

  test('sign-up sends the email, the banner reminds, and the link verifies and leads home', async ({
    page,
  }) => {
    const code = await signUp(page);

    // The email continues home on this origin, for Firebase's own page.
    expect(new URL(code.oobLink).searchParams.get('continueUrl')).toMatch(/\/home$/);
    const banner = page.getByRole('region', { name: BANNER });
    await expect(banner).toBeVisible();
    await expect(banner.getByRole('button', { name: VERIFY.banner.resend })).toBeVisible();

    await page.goto(actionLink(code.oobCode));
    await expect(page).toHaveURL(/\/verify-email\?/);
    await expect(page.getByText(VERIFY.screen.done)).toBeVisible();

    await page.getByRole('link', { name: VERIFY.screen.home }).click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByRole('region', { name: BANNER })).toHaveCount(0);
  });

  test('a used link says so, and still leads home', async ({ page }) => {
    const code = await signUp(page);
    await page.goto(actionLink(code.oobCode));
    await expect(page.getByText(VERIFY.screen.done)).toBeVisible();

    await page.goto(actionLink(code.oobCode));

    await expect(page.getByText(VERIFY.screen.invalid)).toBeVisible();
    await expect(page.getByRole('link', { name: VERIFY.screen.home })).toHaveAttribute(
      'href',
      '/home',
    );
  });
});
