import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';
import {
  DENY_ALL_RULES,
  FIRESTORE_LISTEN_CHANNEL,
  FIRESTORE_WRITE_CHANNEL,
  HOME_TIME_ZONE,
  freshHomeUser,
  restoreFirestoreRules,
  seedHomeBoard,
  seedLabel,
  seedLegacyTask,
  seedTask,
  setFirestoreRules,
  todayUtc,
} from './fixtures/home';
import { dragCard } from './support/drag';
import { readDoc, signInAs, type TestUser } from './support/emulator';
import {
  VISUAL_CLOCK,
  VISUAL_SKIP_REASON,
  VISUAL_WIDTHS,
  canCompareVisuals,
  prepareVisualPage,
  runVisualCompare,
  settleVisualPage,
  visualContextOptions,
  writeComparePairs,
  type VisualState,
} from './support/visual';

const SAVE_ERROR = "Couldn't save. Try again.";
const SLOW_SAVE = 'Still saving. Check your connection.';
const LOAD_ERROR = "Couldn't load your data. Try again.";

test.use({ timezoneId: HOME_TIME_ZONE });

/** Signs in and opens Home, waiting until the tasks have loaded. */
async function openHome(page: Page, user: TestUser): Promise<void> {
  await signInAs(page, user.email, user.password);
  await page.goto('/home');
  await expect(page.getByTestId('task-list-todo')).toBeVisible();
}

/** Matches exactly `text`, give or take surrounding white space. */
function exactly(text: string): RegExp {
  return new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
}

/** The card whose title is exactly `title` ("Tagged a" is not "Tagged ab"), within `scope`. */
function cardByTitle(page: Page, title: string, scope: Page | Locator = page): Locator {
  return scope
    .getByTestId('task-card')
    .filter({ has: page.getByTestId('task-title').filter({ hasText: exactly(title) }) });
}

/** The titles in a list, top to bottom. */
function titlesIn(page: Page, status: 'todo' | 'done'): Locator {
  return page.getByTestId(`task-list-${status}`).getByTestId('task-title');
}

test.describe('home board', () => {
  let user: TestUser;
  let today: string;

  test.beforeEach(async () => {
    user = await freshHomeUser();
    today = todayUtc();
  });

  test.afterEach(async () => {
    await restoreFirestoreRules();
  });

  test('a task dragged into the empty Done list moves there, and is still done after reload (D9)', async ({
    page,
  }) => {
    await seedTask(user.uid, { id: 'drag', title: 'Water the plants', date: today, time: '10:00' });
    await seedTask(user.uid, { id: 'stay', title: 'Stay in todo', date: today, time: '11:00' });
    await openHome(page, user);
    const done = page.getByTestId('task-list-done');
    await expect(page.getByTestId('task-empty-done')).toBeVisible();

    await dragCard(page, cardByTitle(page, 'Water the plants'), done);

    await expect(titlesIn(page, 'done')).toHaveText(['Water the plants']);
    await expect(titlesIn(page, 'todo')).toHaveText(['Stay in todo']);
    await expect
      .poll(async () => (await readDoc('tasks/drag'))?.status)
      .toEqual({ stringValue: 'done' });

    await page.reload();

    await expect(titlesIn(page, 'done')).toHaveText(['Water the plants']);
    await expect(titlesIn(page, 'todo')).toHaveText(['Stay in todo']);
  });

  test('a drag within Todo keeps the date-then-time order (D9)', async ({ page }) => {
    await seedTask(user.uid, { id: 'a', title: 'First at eight', date: today, time: '08:00' });
    await seedTask(user.uid, { id: 'b', title: 'Second at ten', date: today, time: '10:00' });
    await seedTask(user.uid, { id: 'c', title: 'Third at noon', date: today, time: '12:00' });
    await openHome(page, user);
    const order = ['First at eight', 'Second at ten', 'Third at noon'];
    await expect(titlesIn(page, 'todo')).toHaveText(order);

    await dragCard(page, cardByTitle(page, 'Third at noon'), cardByTitle(page, 'First at eight'), {
      at: 'top',
      into: page.getByTestId('task-list-todo'),
    });

    await expect(titlesIn(page, 'todo')).toHaveText(order);
    await expect(titlesIn(page, 'done')).toHaveCount(0);
    for (const id of ['a', 'b', 'c']) {
      expect((await readDoc(`tasks/${id}`))?.status, id).toEqual({ stringValue: 'todo' });
    }
  });

  test('an edit saved while Firestore writes are cut keeps the form and its input, says it is still saving after 15 s, and changes nothing (D7)', async ({
    page,
  }) => {
    // A Firestore write that never gets an answer stays queued: the app waits rather than time
    // out (the save ruling for Task 5), so this case shows the "still saving" notice.
    await page.clock.install();
    await seedTask(user.uid, { id: 'edit', title: 'Old title', date: today, time: '10:00' });
    await openHome(page, user);
    await cardByTitle(page, 'Old title').getByRole('button', { name: 'Edit task' }).click();
    const form = page.getByRole('form', { name: 'Edit task' });
    const title = form.locator('input[name="title"]');
    await title.fill('New title');
    await page.route(FIRESTORE_WRITE_CHANNEL, (route) => route.abort());

    await form.getByRole('button', { name: 'Save' }).click();

    await expect(form).toHaveAttribute('aria-busy', 'true');
    await expect(title).toHaveValue('New title');
    await expect(page.getByText(SLOW_SAVE)).toHaveCount(0);

    await page.clock.fastForward('00:16');

    await expect(page.getByText(SLOW_SAVE)).toBeVisible();
    await expect(form).toBeVisible();
    await expect(title).toHaveValue('New title');
    expect((await readDoc('tasks/edit'))?.title).toEqual({ stringValue: 'Old title' });

    await page.reload();

    await expect(cardByTitle(page, 'Old title')).toBeVisible();
    await expect(cardByTitle(page, 'New title')).toHaveCount(0);
  });

  test(`a rejected edit keeps the form open with "${SAVE_ERROR}" and the typed title, and changes nothing (D7)`, async ({
    page,
  }) => {
    await seedTask(user.uid, { id: 'edit', title: 'Old title', date: today, time: '10:00' });
    await openHome(page, user);
    await cardByTitle(page, 'Old title').getByRole('button', { name: 'Edit task' }).click();
    const form = page.getByRole('form', { name: 'Edit task' });
    const title = form.locator('input[name="title"]');
    await title.fill('New title');
    await setFirestoreRules(DENY_ALL_RULES);

    await form.getByRole('button', { name: 'Save' }).click();

    await expect(form.getByText(SAVE_ERROR)).toBeVisible();
    await expect(title).toHaveValue('New title');
    await restoreFirestoreRules();
    expect((await readDoc('tasks/edit'))?.title).toEqual({ stringValue: 'Old title' });

    await page.reload();

    await expect(cardByTitle(page, 'Old title')).toBeVisible();
    await expect(cardByTitle(page, 'New title')).toHaveCount(0);
  });

  test(`a failing tasks query shows "${LOAD_ERROR}" with Retry, and Retry loads the tasks (D12)`, async ({
    page,
  }) => {
    await seedTask(user.uid, { id: 'later', title: 'Visible after retry', date: today });
    await setFirestoreRules(DENY_ALL_RULES);
    await signInAs(page, user.email, user.password);
    await page.goto('/home');
    const alert = page.getByTestId('load-error');
    await expect(alert).toContainText(LOAD_ERROR);
    await expect(cardByTitle(page, 'Visible after retry')).toHaveCount(0);
    await restoreFirestoreRules();

    await alert.getByRole('button', { name: 'Retry' }).click();

    await expect(cardByTitle(page, 'Visible after retry')).toBeVisible();
    await expect(alert).toHaveCount(0);
  });

  test('search "milk" finds a task titled Milk, past a legacy task with no description (D8)', async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => {
      // The browser reports a resize it deferred to the next frame (WebKit raises it as a page
      // error): a notice from layout, not an error the search threw.
      if (!/ResizeObserver loop/.test(error.message)) pageErrors.push(error);
    });
    await seedTask(user.uid, {
      id: 'milk',
      title: 'Buy Milk',
      description: 'Semi-skimmed',
      date: today,
    });
    await seedTask(user.uid, {
      id: 'dog',
      title: 'Walk the dog',
      description: 'Around the park',
      date: today,
    });
    await seedLegacyTask(user.uid, { id: 'legacy', title: 'Legacy chore', typeIds: [] });
    await openHome(page, user);
    await expect(page.getByTestId('task-card')).toHaveCount(3);

    await page.getByLabel('Search tasks', { exact: true }).fill('milk');

    await expect(cardByTitle(page, 'Buy Milk')).toBeVisible();
    await expect(page.getByTestId('task-card')).toHaveCount(1);

    await page.getByLabel('Search tasks', { exact: true }).fill('park');

    await expect(cardByTitle(page, 'Walk the dog')).toBeVisible();
    await expect(page.getByTestId('task-card')).toHaveCount(1);
    expect(pageErrors).toEqual([]);
  });

  test('filtering by label "a" leaves out a task with label "ab" (D8)', async ({ page }) => {
    await seedLabel(user.uid, { id: 'a', label: 'a', color: '#4CAF50' });
    await seedLabel(user.uid, { id: 'ab', label: 'ab', color: '#FF9800' });
    await seedTask(user.uid, { id: 't-a', title: 'Tagged a', date: today, labelIds: ['a'] });
    await seedTask(user.uid, { id: 't-ab', title: 'Tagged ab', date: today, labelIds: ['ab'] });
    await openHome(page, user);
    await expect(page.getByTestId('task-card')).toHaveCount(2);

    await page.getByTestId('label-filter').getByText('a', { exact: true }).click();

    await expect(cardByTitle(page, 'Tagged a')).toBeVisible();
    await expect(cardByTitle(page, 'Tagged ab')).toHaveCount(0);
  });

  test('a legacy task (date "NA", type ref to a deleted label) shows in Todo as indefinite with no blank chip', async ({
    page,
  }) => {
    await seedLabel(user.uid, { id: 'kept', label: 'Errands', color: '#9C27B0' });
    await seedLegacyTask(user.uid, {
      id: 'legacy',
      title: 'Legacy chore',
      typeIds: ['deleted-label'],
    });
    await openHome(page, user);

    const legacy = cardByTitle(page, 'Legacy chore', page.getByTestId('task-list-todo'));
    await expect(legacy).toBeVisible();
    await expect(legacy.getByTestId('task-when')).toHaveText('No due date');
    await expect(legacy.getByTestId('label-chip')).toHaveCount(0);
    await expect(legacy.locator('.v-chip')).toHaveCount(0);
  });

  test('check, edit and delete show without hover at phone width (D11)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedTask(user.uid, { id: 'touch', title: 'Reachable by touch', date: today });
    await openHome(page, user);
    const card = cardByTitle(page, 'Reachable by touch');

    for (const name of ['Mark as done', 'Edit task', 'Delete task']) {
      await expect(card.getByRole('button', { name })).toBeVisible();
    }
  });

  test('a description with <img onerror> renders no image and runs no script (S3)', async ({
    page,
  }) => {
    const dialogs: string[] = [];
    page.on('dialog', (dialog) => {
      dialogs.push(dialog.message());
      void dialog.dismiss();
    });
    await seedTask(user.uid, {
      id: 'xss',
      title: 'Suspicious',
      description: '<img src=x onerror="window.xssRan = true; alert(1)"> and **bold**',
      date: today,
    });
    await openHome(page, user);
    const card = cardByTitle(page, 'Suspicious');

    await expect(card).toContainText('<img src=x');
    await expect(card.locator('strong')).toHaveText('bold');
    await expect(card.locator('img')).toHaveCount(0);
    await expect(card.locator('[onerror]')).toHaveCount(0);
    expect(await page.evaluate(() => 'xssRan' in window)).toBe(false);
    expect(dialogs).toEqual([]);
  });
});

test.describe('home across midnight', () => {
  test('just before midnight the header shows today, and past midnight it moves to the next day without a reload (D3)', async ({
    page,
  }) => {
    const user = await freshHomeUser();
    // Two minutes before midnight, so a slow first load still asserts before the day changes;
    // the clock then runs on past midnight, firing the timers due on the way.
    await page.clock.install({ time: new Date('2026-11-02T23:58:00Z') });
    await openHome(page, user);
    const header = page.getByTestId('home-header');
    const date = page.getByTestId('home-date');
    await expect(header).toContainText('today');
    await expect(date).toHaveText('Monday, 2 November 2026');

    await page.clock.runFor('02:30');

    await expect(date).toHaveText('Tuesday, 3 November 2026');
    await expect(header).toContainText('today');
    await expect(page.getByTestId('date-bar').locator('[aria-pressed="true"]')).toHaveAttribute(
      'aria-label',
      'Tuesday, 3 November 2026',
    );
  });
});

/** A visual state of Home: it waits on what the state shows, not on network idle. */
interface HomeVisualState extends VisualState {
  /** Resolves once the state is on screen. */
  ready: (page: Page) => Promise<void>;
  /** Runs after both widths' captures of the state, pass or fail. */
  after?: () => Promise<void>;
}

const VISUAL_DIR = fileURLToPath(new URL('../design/modernize/home/', import.meta.url));
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const VISUAL_TODAY = VISUAL_CLOCK.slice(0, 10);

async function signInFresh(page: Page, seed?: (uid: string) => Promise<void>): Promise<void> {
  const user = await freshHomeUser();
  await seed?.(user.uid);
  await signInAs(page, user.email, user.password);
}

const boardReady = async (page: Page): Promise<void> => {
  await expect(cardByTitle(page, 'Buy milk')).toBeVisible();
  await expect(page.getByTestId('task-skeleton')).toHaveCount(0);
};

function homeVisualStates(): HomeVisualState[] {
  return [
    {
      name: 'home-empty',
      path: '/home',
      before: (page) => signInFresh(page),
      ready: async (page) => {
        await expect(page.getByTestId('task-empty-todo')).toBeVisible();
      },
    },
    {
      name: 'home-loading',
      path: '/home',
      before: async (page) => {
        await signInFresh(page, (uid) => seedHomeBoard(uid, VISUAL_TODAY));
        // The query never gets an answer, so the board stays on its skeletons.
        await page.route(FIRESTORE_LISTEN_CHANNEL, () => {});
      },
      ready: async (page) => {
        await expect(page.getByTestId('task-skeleton')).toHaveCount(4);
      },
    },
    {
      name: 'home-tasks',
      path: '/home',
      before: (page) => signInFresh(page, (uid) => seedHomeBoard(uid, VISUAL_TODAY)),
      ready: boardReady,
    },
    {
      name: 'home-editing',
      path: '/home',
      before: (page) => signInFresh(page, (uid) => seedHomeBoard(uid, VISUAL_TODAY)),
      ready: boardReady,
      act: async (page) => {
        await cardByTitle(page, 'Buy milk').getByRole('button', { name: 'Edit task' }).click();
        await expect(page.getByRole('form', { name: 'Edit task' })).toBeVisible();
      },
    },
    {
      name: 'home-load-error',
      path: '/home',
      before: async (page) => {
        await signInFresh(page, (uid) => seedHomeBoard(uid, VISUAL_TODAY));
        await setFirestoreRules(DENY_ALL_RULES);
      },
      ready: async (page) => {
        await expect(page.getByTestId('load-error')).toBeVisible();
      },
      after: restoreFirestoreRules,
    },
    {
      name: 'home-hi',
      path: '/home',
      locale: 'hi',
      before: (page) => signInFresh(page, (uid) => seedHomeBoard(uid, VISUAL_TODAY)),
      ready: boardReady,
    },
  ];
}

/**
 * Captures each state at each policy width into design/modernize/home/app/, keeping a first
 * capture as the state's reference, as the harness's captureScreen does. It waits on each state's
 * own `ready` instead of network idle: Firestore keeps a request open, so the network never idles.
 */
async function captureHomeStates(
  browser: Browser,
  baseURL: string,
  states: HomeVisualState[],
): Promise<string[]> {
  mkdirSync(join(VISUAL_DIR, 'app'), { recursive: true });
  mkdirSync(join(VISUAL_DIR, 'refs'), { recursive: true });
  const newReferences: string[] = [];
  for (const state of states) {
    try {
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
    } finally {
      await state.after?.();
    }
  }
  return newReferences;
}

test.describe('home visual states', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'one browser captures the references');
  test.skip(!canCompareVisuals(), VISUAL_SKIP_REASON);
  test.describe.configure({ timeout: 600_000 });

  test('home-empty, home-loading, home-tasks, home-editing, home-load-error and home-hi match their references at 390 and 1280', async ({
    browser,
    baseURL,
  }) => {
    const states = homeVisualStates();

    const newReferences = await captureHomeStates(browser, baseURL ?? '', states);
    writeComparePairs('home', states);
    const result = runVisualCompare('home');

    for (const reference of newReferences) {
      test.info().annotations.push({ type: 'new reference to approve', description: reference });
    }
    expect(result.status, result.output).toBe(0);
  });
});
