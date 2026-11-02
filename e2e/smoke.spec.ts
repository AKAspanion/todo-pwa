/**
 * The final integration check (Task 11): one person's whole day in the app, through the screens
 * Tasks 4–9 built, against the emulators. Sign up, add a task for tomorrow at 09:00, find it on
 * Home, drag it to Done, find it on the Calendar, sign out. A second account then signs in and sees
 * none of it (the UI-level half of D13, moved here from Task 4 by the run's ruling).
 *
 * It runs in every project playwright.config.ts names: Chromium and WebKit.
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  FIRESTORE_EMULATOR_HOST,
  PROJECT_ID,
  createUser,
  resetEmulators,
} from './support/emulator';
import { dragCard } from './support/drag';

/** A zone east of UTC, so a date parsed as UTC midnight (D1) would land on the wrong day. */
const TIME_ZONE = 'Asia/Kolkata';
const PASSWORD = 'abc-def_9';
const TITLE = 'Smoke test: water the plants';

type Lang = 'en';
function readLocale<T>(lang: Lang, feature: string): T {
  const file = new URL(`../src/i18n/locales/${lang}/${feature}.json`, import.meta.url);
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

/** The strings the steps look for, read from the app's own English locale files. */
const AUTH = readLocale<{
  signIn: { title: string; email: string; submit: string };
  signUp: { submit: string };
  fields: { email: string; password: string; confirmPassword: string };
  menu: { open: string; signOut: string };
}>('en', 'auth');
const ADD = readLocale<{
  title: { label: string };
  submit: string;
  added: string;
}>('en', 'add');
/** The shared date and time fields' strings. */
const FIELDS = readLocale<{
  date: { label: string };
  time: { label: string; done: string };
}>('en', 'fields');
const CALENDAR = readLocale<{ next: { month: string } }>('en', 'calendar');

/** The calendar date ('YYYY-MM-DD') that `timeZone`'s wall clock shows at `at`. */
function ymdIn(timeZone: string, at: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

function ymdParts(ymd: string): [number, number, number] {
  const [y = 0, m = 1, d = 1] = ymd.split('-').map(Number);
  return [y, m, d];
}

function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymdParts(ymd);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** 'Tuesday, 3 November 2026': the app's long English date, as the date bar and calendar name days. */
function longDate(ymd: string): string {
  const [y, m, d] = ymdParts(ymd);
  const day = new Date(Date.UTC(y, m - 1, d));
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(day);
  return `${part({ weekday: 'long' })}, ${d} ${part({ month: 'long' })} ${y}`;
}

/** Every task document's status, past the security rules, from the Firestore emulator. */
async function storedStatuses(): Promise<string[]> {
  const url = `http://${FIRESTORE_EMULATOR_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents/tasks`;
  const response = await fetch(url, {
    headers: { Authorization: 'Bearer owner' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`listing tasks failed: ${response.status}`);
  const body = (await response.json()) as {
    documents?: { fields?: { status?: { stringValue?: string } } }[];
  };
  return (body.documents ?? []).map((d) => d.fields?.status?.stringValue ?? 'missing');
}

/** The card whose title is `title`, within `scope`. */
function card(scope: Page | Locator, title: string): Locator {
  return scope.getByTestId('task-card').filter({ hasText: title });
}

/** Picks a day in the add form's date picker, moving to the next month when the day is in it. */
async function pickDate(page: Page, ymd: string): Promise<void> {
  await page.getByLabel(FIELDS.date.label, { exact: true }).click();
  await expect(page.locator('.v-date-picker')).toBeVisible();
  // Vuetify puts data-v-date on each day's button itself.
  const day = page.locator(`.v-date-picker button[data-v-date="${ymd}"]`);
  if ((await day.count()) === 0) {
    await page.getByRole('button', { name: 'Next month' }).click();
  }
  await day.click();
  await expect(page.locator('.v-date-picker')).toBeHidden();
}

/** Types a 24-hour time into the add form's time picker. */
async function pickTime(page: Page, hour: string, minute: string): Promise<void> {
  await page.getByLabel(FIELDS.time.label, { exact: true }).click();
  const picker = page.locator('.v-time-picker');
  await expect(picker).toBeVisible();
  await picker.getByRole('textbox', { name: 'Hour' }).fill(hour);
  await picker.getByRole('textbox', { name: 'Minute' }).fill(minute);
  await picker.getByRole('button', { name: FIELDS.time.done }).click();
  await expect(picker).toBeHidden();
}

async function signOut(page: Page): Promise<void> {
  await page.getByRole('button', { name: AUTH.menu.open }).click();
  await page.getByRole('button', { name: AUTH.menu.signOut }).click();
  await expect(page).toHaveURL(/\/signin$/);
  await expect(page.getByRole('heading', { name: AUTH.signIn.title })).toBeVisible();
}

test.describe('smoke', () => {
  test.use({ timezoneId: TIME_ZONE });

  test.beforeEach(async () => {
    await resetEmulators();
  });

  test('sign up, add a task for tomorrow 09:00, see it on Home, drag it to Done, see it on the Calendar, sign out', async ({
    page,
  }) => {
    test.slow();
    const today = ymdIn(TIME_ZONE, new Date());
    const tomorrow = addDays(today, 1);

    await test.step('sign up', async () => {
      await page.goto('/signup');
      await page.getByLabel(AUTH.fields.email, { exact: true }).fill('smoke@user.info');
      await page.getByLabel(AUTH.fields.password, { exact: true }).fill(PASSWORD);
      await page.getByLabel(AUTH.fields.confirmPassword, { exact: true }).fill(PASSWORD);
      await page.getByRole('button', { name: AUTH.signUp.submit, exact: true }).click();
      await expect(page).toHaveURL(/\/home$/);
      await expect(page.getByTestId('task-list-todo')).toBeVisible();
    });

    await test.step('add a task for tomorrow at 09:00', async () => {
      await page.goto('/add');
      await page.getByLabel(ADD.title.label, { exact: true }).fill(TITLE);
      await pickDate(page, tomorrow);
      await pickTime(page, '09', '00');
      await expect(page.getByLabel(FIELDS.date.label, { exact: true })).toHaveValue(
        longDate(tomorrow),
      );
      await page.getByRole('button', { name: ADD.submit, exact: true }).click();
      await expect(page).toHaveURL(/\/home$/);
      await expect(page.getByText(ADD.added)).toBeVisible();
      await expect.poll(storedStatuses).toEqual(['todo']);
    });

    await test.step('see it on Home under tomorrow, in Todo', async () => {
      // Home opens on today; the task is due tomorrow, so it shows once tomorrow is picked.
      await expect(card(page, TITLE)).toHaveCount(0);
      await page.getByTestId('date-bar').locator(`[data-date="${tomorrow}"]`).click();
      await expect(page.getByTestId('home-date')).toHaveText(longDate(tomorrow));
      await expect(card(page.getByTestId('task-list-todo'), TITLE)).toBeVisible();
      await expect(card(page, TITLE)).toContainText('9:00');
      await expect(page.getByTestId('task-empty-done')).toBeVisible();
    });

    await test.step('mark it done by dragging it to Done', async () => {
      await dragCard(page, card(page, TITLE), page.getByTestId('task-list-done'));
      await expect(card(page.getByTestId('task-list-done'), TITLE)).toBeVisible();
      await expect(card(page.getByTestId('task-list-todo'), TITLE)).toHaveCount(0);
      await expect.poll(storedStatuses).toEqual(['done']);
    });

    await test.step('see it on the Calendar on tomorrow', async () => {
      await page.goto('/calendar');
      await expect(page.getByTestId('calendar-title')).toBeVisible();
      if (tomorrow.slice(0, 7) !== today.slice(0, 7)) {
        await page.getByRole('button', { name: CALENDAR.next.month }).click();
      }
      const cell = page
        .getByRole('cell')
        .filter({ has: page.getByRole('button', { name: longDate(tomorrow), exact: true }) });
      await expect(cell.getByTestId('calendar-event')).toContainText(TITLE);
    });

    await test.step('sign out', async () => {
      await signOut(page);
    });

    await test.step('another account signs in and sees none of it', async () => {
      await createUser('other@user.info', PASSWORD, 'Other');
      await page.getByRole('button', { name: AUTH.signIn.email }).click();
      await page.getByLabel(AUTH.fields.email, { exact: true }).fill('other@user.info');
      await page.getByLabel(AUTH.fields.password, { exact: true }).fill(PASSWORD);
      await page.getByRole('button', { name: AUTH.signIn.submit, exact: true }).click();
      await expect(page).toHaveURL(/\/home$/);
      await expect(page.getByTestId('task-list-todo')).toBeVisible();
      // Pressing the selected day clears it, so Home shows every day's tasks.
      await page.getByTestId('date-bar').locator('[aria-pressed="true"]').click();
      await expect(page.getByTestId('task-empty-todo')).toBeVisible();
      await expect(page.getByTestId('task-empty-done')).toBeVisible();
      await expect(card(page, TITLE)).toHaveCount(0);
    });
  });
});
