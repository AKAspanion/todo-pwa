/**
 * The add-task screen (/add): local dates (D1), the stored reminder fields (P6), validation, saves
 * that fail or never get an answer (Review Focus 1, and the save ruling: no timeout or retry, the
 * form stays filled), Hindi labels (D18) and the screen's visual states.
 */
import { expect, test, type Page, type Route } from '@playwright/test';
import {
  FIRESTORE_EMULATOR_HOST,
  PROJECT_ID,
  createUser,
  resetEmulators,
  seedDoc,
  signInAs,
  type TestUser,
} from './support/emulator';
import { compareScreen, type VisualState } from './support/visual';

const TIME_ZONE = 'America/New_York';
const PASSWORD = 'abc-def_9';
const LABEL_A = { id: 'label-a', label: 'a', color: '#E91E63' };
/** Firestore's write stream, through which every save goes. */
const WRITE_CHANNEL = '**/google.firestore.v1.Firestore/Write/**';
/** The save ruling: after this long without an answer the screen says it is still saving. */
const STILL_SAVING_AFTER_MS = 15_000;

type RestValue = Record<string, unknown>;
interface StoredTask {
  id: string;
  fields: Record<string, RestValue>;
}

/** Every document in `tasks`, past the security rules, as raw Firestore REST fields. */
async function listStoredTasks(): Promise<StoredTask[]> {
  const url = `http://${FIRESTORE_EMULATOR_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents/tasks`;
  const response = await fetch(url, {
    headers: { Authorization: 'Bearer owner' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`listing tasks failed: ${response.status}`);
  const body = (await response.json()) as {
    documents?: { name: string; fields?: Record<string, RestValue> }[];
  };
  return (body.documents ?? []).map((d) => ({
    id: d.name.split('/').pop() ?? '',
    fields: d.fields ?? {},
  }));
}

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

/** 'Monday, 2 November 2026': the screen's long English date. */
function longDate(ymd: string): string {
  const [y, m, d] = ymdParts(ymd);
  const day = new Date(Date.UTC(y, m - 1, d));
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(day);
  return `${part({ weekday: 'long' })}, ${d} ${part({ month: 'long' })} ${y}`;
}

/** How far `timeZone`'s wall clock is ahead of UTC at the instant `utcMs`. */
function zoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts: Record<string, number> = {};
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  });
  for (const part of formatter.formatToParts(new Date(utcMs))) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
  }
  const wall = Date.UTC(
    parts.year ?? 0,
    (parts.month ?? 1) - 1,
    parts.day ?? 1,
    parts.hour ?? 0,
    parts.minute ?? 0,
    parts.second ?? 0,
  );
  return wall - utcMs;
}

/** The instant at which `timeZone`'s wall clock shows `ymd` at `hour`:`minute`. */
function zonedToUtc(ymd: string, hour: number, minute: number, timeZone: string): Date {
  const [y, m, d] = ymdParts(ymd);
  const wall = Date.UTC(y, m - 1, d, hour, minute);
  const first = wall - zoneOffsetMs(wall, timeZone);
  return new Date(wall - zoneOffsetMs(first, timeZone));
}

async function seedLabelA(user: TestUser): Promise<void> {
  await seedDoc(`types/${LABEL_A.id}`, {
    uid: user.uid,
    label: LABEL_A.label,
    color: LABEL_A.color,
  });
}

const titleField = (page: Page) => page.getByLabel('Title', { exact: true });
const descriptionField = (page: Page) => page.getByLabel('Description', { exact: true });
const submitButton = (page: Page) => page.getByRole('button', { name: 'Add task', exact: true });

/** Picks a day in the date picker, moving to the next month when the day is in it. */
async function pickDate(page: Page, ymd: string): Promise<void> {
  await page.getByLabel('Select date', { exact: true }).click();
  await expect(page.locator('.v-date-picker')).toBeVisible();
  // Vuetify puts data-v-date on each day's button itself.
  const day = page.locator(`.v-date-picker button[data-v-date="${ymd}"]`);
  if ((await day.count()) === 0) {
    await page.getByRole('button', { name: 'Next month' }).click();
  }
  await day.click();
  await expect(page.locator('.v-date-picker')).toBeHidden();
}

/** Types a 24-hour time into the time picker's hour and minute fields. */
async function pickTime(page: Page, hour: string, minute: string): Promise<void> {
  await page.getByLabel('Select time', { exact: true }).click();
  const picker = page.locator('.v-time-picker');
  await expect(picker).toBeVisible();
  await picker.getByRole('textbox', { name: 'Hour' }).fill(hour);
  await picker.getByRole('textbox', { name: 'Minute' }).fill(minute);
  await picker.getByRole('button', { name: 'Done' }).click();
  await expect(picker).toBeHidden();
}

async function fillBuyMilk(page: Page): Promise<void> {
  await titleField(page).fill('Buy milk');
  await descriptionField(page).fill('Two litres, **semi-skimmed**');
}

async function expectFormStillFilled(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/add$/);
  await expect(titleField(page)).toHaveValue('Buy milk');
  await expect(descriptionField(page)).toHaveValue('Two litres, **semi-skimmed**');
}

test.describe('add task', () => {
  test.use({ timezoneId: TIME_ZONE });

  let user: TestUser;

  test.beforeEach(async ({ page }) => {
    await resetEmulators();
    user = await createUser('ada@example.info', PASSWORD, 'Ada');
    await seedLabelA(user);
    await signInAs(page, user.email, user.password);
    await page.goto('/add');
    await expect(titleField(page)).toBeVisible();
  });

  test("the date field starts on today's local date, not yesterday's (D1)", async ({ page }) => {
    const today = ymdIn(TIME_ZONE, new Date());

    await expect(page.getByLabel('Select date', { exact: true })).toHaveValue(longDate(today));
  });

  test('a task for tomorrow at 09:00 with label a is saved in the device zone', async ({
    page,
  }) => {
    const tomorrow = addDays(ymdIn(TIME_ZONE, new Date()), 1);
    await fillBuyMilk(page);
    await pickDate(page, tomorrow);
    await pickTime(page, '09', '00');
    await expect(page.getByLabel('Select date', { exact: true })).toHaveValue(longDate(tomorrow));
    await expect(page.getByLabel('Select time', { exact: true })).toHaveValue('9:00 AM');
    await page.locator(`[data-label-id="${LABEL_A.id}"]`).click();

    await submitButton(page).click();

    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByText('Task added')).toBeVisible();
    await expect.poll(async () => (await listStoredTasks()).length).toBe(1);
    const [task] = await listStoredTasks();
    expect(task?.fields).toMatchObject({
      uid: { stringValue: user.uid },
      title: { stringValue: 'Buy milk' },
      description: { stringValue: 'Two litres, **semi-skimmed**' },
      status: { stringValue: 'todo' },
      indefinite: { booleanValue: false },
      date: { stringValue: tomorrow },
      time: { stringValue: '09:00' },
      timeZone: { stringValue: TIME_ZONE },
      reminded: { booleanValue: false },
      labelIds: { arrayValue: { values: [{ stringValue: LABEL_A.id }] } },
    });
    // remindAt is the task's due instant: 09:00 New York time, as UTC.
    const remindAt = (task?.fields.remindAt as { timestampValue?: string }).timestampValue;
    expect(new Date(remindAt ?? 'missing').toISOString()).toBe(
      zonedToUtc(tomorrow, 9, 0, TIME_ZONE).toISOString(),
    );
  });

  test('an indefinite task stores no date, time or reminder', async ({ page }) => {
    await titleField(page).fill('Someday');
    await page.getByLabel('Indefinite task?', { exact: true }).check();
    await expect(page.getByLabel('Select date', { exact: true })).toBeDisabled();
    await expect(page.getByLabel('Select time', { exact: true })).toBeDisabled();

    await submitButton(page).click();

    await expect(page).toHaveURL(/\/home$/);
    await expect.poll(async () => (await listStoredTasks()).length).toBe(1);
    const [task] = await listStoredTasks();
    expect(task?.fields).toMatchObject({
      title: { stringValue: 'Someday' },
      indefinite: { booleanValue: true },
      date: { nullValue: null },
      time: { nullValue: null },
      remindAt: { nullValue: null },
    });
  });

  test('an empty title blocks the save with "Title is required"', async ({ page }) => {
    await titleField(page).fill('   ');

    await submitButton(page).click();

    await expect(page.getByText('Title is required')).toBeVisible();
    await expect(page).toHaveURL(/\/add$/);
    expect(await listStoredTasks()).toEqual([]);
  });

  test('a 201-character title blocks the save', async ({ page }) => {
    await titleField(page).fill('x'.repeat(201));

    await submitButton(page).click();

    await expect(page.getByText('Keep the title under 200 characters')).toBeVisible();
    await expect(page).toHaveURL(/\/add$/);
    expect(await listStoredTasks()).toEqual([]);
  });

  test('a 200-character title is accepted', async ({ page }) => {
    await titleField(page).fill('x'.repeat(200));

    await submitButton(page).click();

    await expect(page).toHaveURL(/\/home$/);
    await expect.poll(async () => (await listStoredTasks()).length).toBe(1);
  });

  test('a save the server rejects keeps the form filled and says "Couldn\'t save. Try again."', async ({
    page,
  }) => {
    // The write reaches the server as someone else's task, so the security rules reject it.
    await page.route(WRITE_CHANNEL, async (route: Route) => {
      const body = route.request().postData();
      if (body?.includes(user.uid)) {
        await route.continue({ postData: body.split(user.uid).join('not-the-owner') });
      } else {
        await route.continue();
      }
    });
    await fillBuyMilk(page);

    await submitButton(page).click();

    await expect(page.getByText("Couldn't save. Try again.")).toBeVisible({ timeout: 15_000 });
    await expectFormStillFilled(page);
    expect(await listStoredTasks()).toEqual([]);
  });

  test('a save the network never answers keeps the form filled, says it is still saving, and lands once the network is back', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.route(WRITE_CHANNEL, (route) => route.abort());
    await fillBuyMilk(page);

    await submitButton(page).click();

    // No timeout and no retry of our own (the save ruling): the form waits with its input.
    await expectFormStillFilled(page);
    await expect(page.getByText("Couldn't save. Try again.")).toHaveCount(0);
    await expect(page.getByText('Still saving. Check your connection.')).toBeVisible({
      timeout: STILL_SAVING_AFTER_MS + 10_000,
    });
    await expectFormStillFilled(page);
    expect(await listStoredTasks()).toEqual([]);

    await page.unroute(WRITE_CHANNEL);

    await expect(page).toHaveURL(/\/home$/, { timeout: 60_000 });
    await expect(page.getByText('Task added')).toBeVisible();
    await expect.poll(async () => (await listStoredTasks()).length).toBe(1);
  });

  test('every label appears in Hindi when hi is on (D18)', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('lang', 'hi'));
    await page.reload();

    await expect(page.getByLabel('तारीख चुनें', { exact: true })).toBeVisible();
    await expect(page.getByLabel('समय चुनें', { exact: true })).toBeVisible();
    await expect(page.getByLabel('अनिश्चित टास्क?', { exact: true })).toBeVisible();
    await expect(page.getByLabel('शीर्षक', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'टास्क जोड़ें', exact: true })).toBeVisible();
    for (const english of ['Select date', 'Select time', 'Indefinite task?']) {
      await expect(page.getByText(english, { exact: true })).toHaveCount(0);
    }
  });
});

test.describe('add task visuals', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'one capture per state');
  test.describe.configure({ timeout: 300_000 });

  test('add-empty, add-filled, add-error and add-hi match their references at 390 and 1280', async ({
    browser,
    baseURL,
  }) => {
    await resetEmulators();
    const user = await createUser('ada@example.info', PASSWORD, 'Ada');
    await seedLabelA(user);
    const signIn = (page: Page) => signInAs(page, user.email, user.password);
    const labelsShown = (page: Page) =>
      expect(page.locator(`[data-label-id="${LABEL_A.id}"]`)).toBeVisible();

    const states: VisualState[] = [
      { name: 'add-empty', path: '/add', before: signIn, act: labelsShown },
      {
        name: 'add-filled',
        path: '/add',
        before: signIn,
        act: async (page) => {
          await labelsShown(page);
          await fillBuyMilk(page);
          await page.locator(`[data-label-id="${LABEL_A.id}"]`).click();
        },
      },
      {
        name: 'add-error',
        path: '/add',
        before: signIn,
        act: async (page) => {
          await labelsShown(page);
          await submitButton(page).click();
          await expect(page.getByText('Title is required')).toBeVisible();
        },
      },
      { name: 'add-hi', path: '/add', locale: 'hi', before: signIn, act: labelsShown },
    ];

    const result = await compareScreen(browser, baseURL ?? '', 'add', states);

    if (result.newReferences.length > 0) {
      test.info().annotations.push({
        type: 'new references (need approval)',
        description: result.newReferences.join(', '),
      });
    }
    expect(result.status, result.output).toBe(0);
  });
});
