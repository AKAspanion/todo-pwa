import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';
import {
  DENY_ALL_RULES,
  freshHomeUser,
  restoreFirestoreRules,
  seedLabel,
  seedTask,
  setFirestoreRules,
} from './fixtures/home';
import { signInAs, type TestUser } from './support/emulator';
import {
  VISUAL_WIDTHS,
  prepareVisualPage,
  runVisualCompare,
  settleVisualPage,
  visualContextOptions,
  writeComparePairs,
  type VisualState,
} from './support/visual';

const LOAD_ERROR = "Couldn't load your data. Try again.";
/**
 * Every test runs at this instant: Monday 2 November 2026 in New York (10:00), Kolkata (20:30)
 * and UTC alike, so "today" and the month shown are the same wherever the browser is.
 */
const NOW = new Date('2026-11-02T15:00:00Z');
/** An English ordinal after a number: "2nd", "1st", "23rd", "4th". */
const ENGLISH_ORDINAL = /\d\s*(st|nd|rd|th)\b/i;

/** Starts the page's clock at NOW, signs in and opens the calendar. */
async function openCalendar(page: Page, user: TestUser): Promise<void> {
  await page.clock.setFixedTime(NOW);
  await signInAs(page, user.email, user.password);
  await page.goto('/calendar');
  await expect(page.getByTestId('calendar-title')).toBeVisible();
}

/** The events (task buttons) shown on the calendar. */
function events(page: Page): Locator {
  return page.getByTestId('calendar-event');
}

/** The event whose task title is `title`. */
function eventByTitle(page: Page, title: string): Locator {
  return events(page).filter({ hasText: title });
}

/** The month view's cell for a day, found by its date button's long-date name. */
function monthCell(page: Page, longDate: string): Locator {
  return page
    .getByRole('cell')
    .filter({ has: page.getByRole('button', { name: longDate, exact: true }) });
}

/** Seeds the month the time-zone tests look at: dated tasks at the edges of days, one indefinite. */
async function seedMonth(uid: string): Promise<void> {
  await seedTask(uid, {
    id: 'first',
    title: 'Just after midnight',
    date: '2026-11-01',
    time: '00:15',
  });
  await seedTask(uid, { id: 'mid', title: 'Dentist', date: '2026-11-05', time: '10:00' });
  await seedTask(uid, {
    id: 'last',
    title: 'Late on the last day',
    date: '2026-11-30',
    time: '23:45',
  });
  await seedTask(uid, {
    id: 'done',
    title: 'Paid the rent',
    status: 'done',
    date: '2026-11-18',
    time: '09:00',
  });
  await seedTask(uid, { id: 'someday', title: 'Someday task', date: null });
}

for (const timezoneId of ['America/New_York', 'Asia/Kolkata']) {
  test.describe(`calendar month in ${timezoneId}`, () => {
    test.use({ timezoneId });

    test('shows each dated task on its own local date, and no indefinite task (D1)', async ({
      page,
    }) => {
      const user = await freshHomeUser();
      await seedMonth(user.uid);
      await openCalendar(page, user);

      await expect(page.getByTestId('calendar-title')).toHaveText('November 2026');
      await expect(events(page)).toHaveCount(4);
      await expect(
        monthCell(page, 'Sunday, 1 November 2026').getByTestId('calendar-event'),
      ).toContainText('Just after midnight');
      await expect(
        monthCell(page, 'Thursday, 5 November 2026').getByTestId('calendar-event'),
      ).toContainText('Dentist');
      await expect(
        monthCell(page, 'Wednesday, 18 November 2026').getByTestId('calendar-event'),
      ).toContainText('Paid the rent');
      await expect(
        monthCell(page, 'Monday, 30 November 2026').getByTestId('calendar-event'),
      ).toContainText('Late on the last day');
      await expect(eventByTitle(page, 'Someday task')).toHaveCount(0);
    });
  });
}

test.describe('calendar', () => {
  test.use({ timezoneId: 'Asia/Kolkata' });

  let user: TestUser;

  test.beforeEach(async () => {
    user = await freshHomeUser();
  });

  test.afterEach(async () => {
    await restoreFirestoreRules();
  });

  test('switching between day, week and month keeps the selected date, and Today returns to the current date', async ({
    page,
  }) => {
    await openCalendar(page, user);
    const title = page.getByTestId('calendar-title');
    const views = page.getByRole('group', { name: 'Calendar view' });
    await expect(title).toHaveText('November 2026');

    // A day's date in the month opens that day.
    await page.getByRole('button', { name: 'Wednesday, 18 November 2026', exact: true }).click();
    await expect(title).toHaveText('Wednesday, 18 November 2026');

    await views.getByRole('button', { name: 'Week' }).click();
    await expect(title).toHaveText('15 – 21 November 2026');

    await views.getByRole('button', { name: 'Month' }).click();
    await expect(title).toHaveText('November 2026');

    await views.getByRole('button', { name: 'Day' }).click();
    await expect(title).toHaveText('Wednesday, 18 November 2026');

    await page.getByRole('button', { name: 'Next day' }).click();
    await expect(title).toHaveText('Thursday, 19 November 2026');

    await page.getByRole('button', { name: 'Today' }).click();
    await expect(title).toHaveText('Monday, 2 November 2026');

    await views.getByRole('button', { name: 'Month' }).click();
    await page.getByRole('button', { name: 'Next month' }).click();
    await expect(title).toHaveText('December 2026');
    await page.getByRole('button', { name: 'Today' }).click();
    await expect(title).toHaveText('November 2026');
    await views.getByRole('button', { name: 'Week' }).click();
    await expect(title).toHaveText('1 – 7 November 2026');
  });

  test('clicking an event opens its details with the title and rendered description; Escape closes them (D16)', async ({
    page,
  }) => {
    await seedLabel(user.uid, { id: 'health', label: 'Health', color: '#4CAF50' });
    await seedTask(user.uid, {
      id: 'mid',
      title: 'Dentist',
      description: '**Bring** the insurance card\n\n- [map](https://example.com/map)',
      date: '2026-11-05',
      time: '10:00',
      labelIds: ['health'],
    });
    await openCalendar(page, user);

    await eventByTitle(page, 'Dentist').click();

    const dialog = page.getByRole('dialog', { name: 'Dentist' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId('task-details-when')).toHaveText(
      'Thursday, 5 November 2026, 10:00 AM',
    );
    const description = dialog.getByTestId('task-details-description');
    await expect(description.locator('strong')).toHaveText('Bring');
    await expect(description).toContainText('Bring the insurance card');
    await expect(description).not.toContainText('**');
    await expect(description.getByRole('link', { name: 'map' })).toBeVisible();
    await expect(dialog.getByTestId('label-chip')).toHaveText('Health');

    await page.keyboard.press('Escape');

    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('an event is reachable by keyboard and its details close with the Close button', async ({
    page,
  }) => {
    await seedTask(user.uid, { id: 'mid', title: 'Dentist', date: '2026-11-05', time: '10:00' });
    await openCalendar(page, user);

    await eventByTitle(page, 'Dentist').focus();
    await page.keyboard.press('Enter');

    const dialog = page.getByRole('dialog', { name: 'Dentist' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId('task-details-description')).toHaveText('No description');

    await dialog.getByRole('button', { name: 'Close' }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test(`a failing tasks query shows "${LOAD_ERROR}" with Retry and no events, and Retry loads them (D12)`, async ({
    page,
  }) => {
    await seedTask(user.uid, { id: 'mid', title: 'Dentist', date: '2026-11-05', time: '10:00' });
    await setFirestoreRules(DENY_ALL_RULES);
    await openCalendar(page, user);

    const alert = page.getByTestId('calendar-load-error');
    await expect(alert).toContainText(LOAD_ERROR);
    await expect(events(page)).toHaveCount(0);
    await restoreFirestoreRules();

    await alert.getByRole('button', { name: 'Retry' }).click();

    await expect(eventByTitle(page, 'Dentist')).toBeVisible();
    await expect(alert).toHaveCount(0);
  });

  test('in Hindi, the headings use Hindi month names and no English ordinals (D4)', async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.setItem('lang', 'hi'));
    await seedTask(user.uid, { id: 'mid', title: 'Dentist', date: '2026-11-05', time: '10:00' });
    await openCalendar(page, user);
    const title = page.getByTestId('calendar-title');
    const views = page.getByRole('group', { name: 'कैलेंडर दृश्य' });

    await expect(title).toHaveText('नवम्बर 2026');
    // The weekday headings come from Vuetify, which now follows the app's language.
    const weekdays = page.getByRole('columnheader');
    await expect(weekdays).toHaveCount(7);
    for (const weekday of await weekdays.allTextContents()) {
      expect(weekday, 'weekday heading').not.toMatch(/[A-Za-z]/);
    }

    await views.getByRole('button', { name: 'सप्ताह' }).click();
    await expect(title).toHaveText('1 – 7 नवम्बर 2026');
    await expect(title).not.toHaveText(ENGLISH_ORDINAL);

    await views.getByRole('button', { name: 'दिन' }).click();
    await expect(title).toHaveText('सोमवार, 2 नवम्बर 2026');
    await expect(title).not.toHaveText(ENGLISH_ORDINAL);
    await expect(page.getByRole('button', { name: 'आज' })).toBeVisible();
  });
});

/** A visual state of the calendar: it waits on what the state shows, not on network idle. */
interface CalendarVisualState extends VisualState {
  /** Resolves once the state is on screen. */
  ready: (page: Page) => Promise<void>;
}

const VISUAL_DIR = fileURLToPath(new URL('../design/modernize/calendar/', import.meta.url));
const ROOT = fileURLToPath(new URL('../', import.meta.url));

/** The month the visual states show, around the visual clock's day (VISUAL_CLOCK, 2 November 2026). */
async function seedVisualMonth(uid: string): Promise<void> {
  await seedLabel(uid, { id: 'work', label: 'Work', color: '#1976D2' });
  await seedTask(uid, {
    id: 'standup',
    title: 'Team stand-up',
    description: 'Daily sync with the **design** team',
    date: '2026-11-02',
    time: '09:30',
    labelIds: ['work'],
  });
  await seedTask(uid, { id: 'milk', title: 'Buy milk', date: '2026-11-02', time: '18:00' });
  await seedTask(uid, { id: 'dentist', title: 'Dentist', date: '2026-11-04', time: '11:00' });
  await seedTask(uid, {
    id: 'report',
    title: 'Send the quarterly report',
    date: '2026-11-13',
    time: '14:00',
    labelIds: ['work'],
  });
  await seedTask(uid, {
    id: 'rent',
    title: 'Pay rent',
    status: 'done',
    date: '2026-11-01',
    time: '08:00',
  });
  await seedTask(uid, { id: 'trip', title: 'Plan the winter trip', date: null });
}

async function signInFresh(page: Page): Promise<void> {
  const user = await freshHomeUser();
  await seedVisualMonth(user.uid);
  await signInAs(page, user.email, user.password);
}

const monthReady = async (page: Page): Promise<void> => {
  await expect(eventByTitle(page, 'Team stand-up')).toBeVisible();
  await expect(page.getByTestId('calendar-loading')).toHaveCount(0);
};

async function showView(page: Page, view: 'Day' | 'Week'): Promise<void> {
  await page
    .getByRole('group', { name: 'Calendar view' })
    .getByRole('button', { name: view })
    .click();
  await expect(eventByTitle(page, 'Team stand-up')).toBeVisible();
}

function calendarVisualStates(): CalendarVisualState[] {
  return [
    { name: 'calendar-month', path: '/calendar', before: signInFresh, ready: monthReady },
    {
      name: 'calendar-week',
      path: '/calendar',
      before: signInFresh,
      ready: monthReady,
      act: (page) => showView(page, 'Week'),
    },
    {
      name: 'calendar-day',
      path: '/calendar',
      before: signInFresh,
      ready: monthReady,
      act: (page) => showView(page, 'Day'),
    },
    {
      name: 'calendar-details',
      path: '/calendar',
      before: signInFresh,
      ready: monthReady,
      act: async (page) => {
        await eventByTitle(page, 'Team stand-up').click();
        await expect(page.getByRole('dialog', { name: 'Team stand-up' })).toBeVisible();
      },
    },
    {
      name: 'calendar-hi',
      path: '/calendar',
      locale: 'hi',
      before: signInFresh,
      ready: async (page) => {
        await monthReady(page);
        await expect(page.getByTestId('calendar-title')).toHaveText('नवम्बर 2026');
      },
    },
  ];
}

/**
 * Captures each state at each policy width into design/modernize/calendar/app/, keeping a first
 * capture as the state's reference, as the harness's captureScreen does. It waits on each state's
 * own `ready` instead of network idle: Firestore keeps a request open, so the network never idles.
 */
async function captureCalendarStates(
  browser: Browser,
  baseURL: string,
  states: CalendarVisualState[],
): Promise<string[]> {
  mkdirSync(join(VISUAL_DIR, 'app'), { recursive: true });
  mkdirSync(join(VISUAL_DIR, 'refs'), { recursive: true });
  const newReferences: string[] = [];
  for (const state of states) {
    for (const width of VISUAL_WIDTHS) {
      const context = await browser.newContext(visualContextOptions(width, baseURL));
      try {
        const page = await context.newPage();
        await prepareVisualPage(page);
        const saved = { lang: state.locale ?? 'en', dark: String(state.theme === 'dark') };
        await page.addInitScript((prefs) => {
          localStorage.setItem('lang', prefs.lang);
          localStorage.setItem('dark', prefs.dark);
        }, saved);
        await state.before?.(page);
        await page.goto(state.path, { waitUntil: 'load' });
        await state.ready(page);
        await state.act?.(page);
        await settleVisualPage(page);
        const file = `${state.name}-${width}.png`;
        await page.screenshot({
          path: join(VISUAL_DIR, 'app', file),
          fullPage: state.fullPage ?? false,
          animations: 'disabled',
          caret: 'hide',
        });
        if (!existsSync(join(VISUAL_DIR, 'refs', file))) {
          copyFileSync(join(VISUAL_DIR, 'app', file), join(VISUAL_DIR, 'refs', file));
          newReferences.push(relative(ROOT, join(VISUAL_DIR, 'refs', file)));
        }
      } finally {
        await context.close();
      }
    }
  }
  return newReferences;
}

test.describe('calendar visual states', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'one browser captures the references');
  test.describe.configure({ timeout: 600_000 });

  test('calendar-month, calendar-week, calendar-day, calendar-details and calendar-hi match their references at 390 and 1280', async ({
    browser,
    baseURL,
  }) => {
    const states = calendarVisualStates();

    const newReferences = await captureCalendarStates(browser, baseURL ?? '', states);
    writeComparePairs('calendar', states);
    const result = runVisualCompare('calendar');

    for (const reference of newReferences) {
      test.info().annotations.push({ type: 'new reference to approve', description: reference });
    }
    expect(result.status, result.output).toBe(0);
  });
});
