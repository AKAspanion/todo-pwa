/**
 * The visual references: captures of the old app (`b8af93e^`, the Vue 2 build live before the
 * rewrite) for each screen state in restore-original-design spec §5, written to
 * `design/modernize/<screen>/refs/<state>-<width>.png` (spec §4.2).
 *
 * The old app is built and served by `node e2e/support/old-app.mjs`, pointed at the same emulators
 * and seeded in its own shape (`type` references, 'NA' dates: §8). This spec skips without
 * `OLD_APP_URL` (the script prints it) or where visuals can't be compared (CI). A state the old app
 * can't show isn't captured: it is listed in `design/modernize/old-app-states.md`, with its reason.
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { createUser, readDoc, resetEmulators, seedDoc } from './support/emulator';
import {
  DENY_ALL_RULES,
  FIRESTORE_LISTEN_CHANNEL,
  HOME_USER,
  freshHomeUser,
  restoreFirestoreRules,
  seedLabel,
  seedLegacyHomeBoard,
  seedLegacyBoardTask,
  setFirestoreRules,
} from './fixtures/home';
import {
  VISUAL_CLOCK,
  VISUAL_SKIP_REASON,
  VISUAL_WIDTHS,
  canCompareVisuals,
  prepareVisualPage,
  settleVisualPage,
  visualContextOptions,
} from './support/visual';

const OLD_APP_URL = process.env.OLD_APP_URL;
const TODAY = VISUAL_CLOCK.slice(0, 10);
const PASSWORD = 'abc-def_9';
const DESIGN_DIR = fileURLToPath(new URL('../design/modernize/', import.meta.url));

type Field = Record<string, unknown>;
const stringOf = (field: unknown): unknown => (field as Field | undefined)?.stringValue;
const referencesOf = (field: unknown): string[] =>
  (
    ((field as Field | undefined)?.arrayValue as { values?: Field[] } | undefined)?.values ?? []
  ).map((v) => String(v.referenceValue).split('/documents/')[1] ?? '');

test.describe('legacy board', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'a data check, run once');

  test('seedLegacyHomeBoard writes the home board in the old app’s shape', async () => {
    const user = await freshHomeUser();

    await seedLegacyHomeBoard(user.uid, TODAY);

    const expected = [
      {
        id: 'milk',
        title: 'Buy milk',
        status: 'todo',
        date: TODAY,
        time: '09:30',
        types: ['home'],
      },
      {
        id: 'report',
        title: 'Send the quarterly report',
        status: 'todo',
        date: TODAY,
        time: '14:00',
        types: ['work'],
      },
      {
        id: 'trip',
        title: 'Plan the winter trip',
        status: 'todo',
        date: 'NA',
        time: 'NA',
        types: [],
      },
      {
        id: 'rent',
        title: 'Pay rent',
        status: 'done',
        date: TODAY,
        time: '08:00',
        types: ['home', 'work'],
      },
    ];
    for (const task of expected) {
      const doc = await readDoc(`tasks/${task.id}`);
      expect(doc, task.id).not.toBeNull();
      expect(stringOf(doc?.uid), task.id).toBe(user.uid);
      expect(stringOf(doc?.title), task.id).toBe(task.title);
      expect(stringOf(doc?.status), task.id).toBe(task.status);
      expect(stringOf(doc?.date), `${task.id} date`).toBe(task.date);
      expect(stringOf(doc?.time), `${task.id} time`).toBe(task.time);
      expect(referencesOf(doc?.type), `${task.id} labels`).toEqual(
        task.types.map((id) => `types/${id}`),
      );
      expect(doc?.indefinite, `${task.id} indefinite`).toEqual({
        booleanValue: task.date === 'NA',
      });
      for (const absent of ['labelIds', 'timeZone', 'remindAt', 'reminded']) {
        expect(Object.keys(doc ?? {}), `${task.id} has no ${absent}`).not.toContain(absent);
      }
    }
    expect(stringOf((await readDoc('tasks/milk'))?.description)).toBe('From the corner shop');
    expect(stringOf((await readDoc('types/work'))?.label)).toBe('Work');
    expect(stringOf((await readDoc('types/home'))?.color)).toBe('#F8BBD0');
  });
});

/** The account a state signs in as, with the data it is seeded with. */
interface OldUser {
  email: string;
  displayName: string;
  /** Written after the account exists. */
  seed?: (uid: string) => Promise<void>;
}

/** One state of the old app: what to seed, how to reach it, and what shows it is ready. */
interface OldState {
  screen: string;
  /** Names the images: `<name>-<width>.png`. */
  name: string;
  /** Where the state starts, such as `/signin`. */
  path: string;
  locale?: 'en' | 'hi';
  theme?: 'light' | 'dark';
  /** Signed-out states have no user. */
  user?: OldUser;
  /** Runs after signing in and before the page opens: hold a request, change the rules. */
  beforeOpen?: (page: Page) => Promise<void>;
  /** Waits on what shows the state is ready. */
  ready: (page: Page) => Promise<void>;
  /** Sets the state up once it is ready: open a form, type, submit. */
  act?: (page: Page) => Promise<void>;
  /** Runs once both widths are captured, pass or fail. */
  after?: () => Promise<void>;
  /** Makes Math.random a fixed sequence, where the old app picks a random colour. */
  fixedRandom?: boolean;
}

/** Signs in through the old sign-in form (email and password), as a person would. */
async function signInThroughOldForm(page: Page, user: OldUser): Promise<void> {
  await page.goto('/signin', { waitUntil: 'load' });
  await page.locator('.signin-container button:has(.mdi-email)').click();
  await page.locator('.signin-container input[type="text"]').fill(user.email);
  await page.locator('.signin-container input[type="password"]').fill(PASSWORD);
  await page.locator('.signin-container button.primary').click();
  await expect(page).toHaveURL(/\/home$/);
}

/** Captures the state at each width into `design/modernize/<screen>/refs/`. */
async function captureOldState(browser: Browser, state: OldState): Promise<void> {
  mkdirSync(`${DESIGN_DIR}${state.screen}/refs`, { recursive: true });
  try {
    for (const width of VISUAL_WIDTHS) {
      await resetEmulators();
      if (state.user) {
        const created = await createUser(state.user.email, PASSWORD, state.user.displayName);
        await state.user.seed?.(created.uid);
      }
      const context = await browser.newContext(visualContextOptions(width, OLD_APP_URL));
      try {
        const page = await context.newPage();
        await prepareVisualPage(page);
        const saved = { lang: state.locale ?? 'en', dark: String(state.theme === 'dark') };
        await page.addInitScript((prefs) => {
          localStorage.setItem('lang', prefs.lang);
          localStorage.setItem('dark', prefs.dark);
        }, saved);
        if (state.fixedRandom) {
          await page.addInitScript(() => {
            let seed = 12345;
            Math.random = () => {
              seed = (seed * 16807) % 2147483647;
              return (seed - 1) / 2147483646;
            };
          });
        }
        if (state.user) await signInThroughOldForm(page, state.user);
        await state.beforeOpen?.(page);
        await page.goto(state.path, { waitUntil: 'load' });
        await state.ready(page);
        await state.act?.(page);
        await settleVisualPage(page);
        await page.screenshot({
          path: `${DESIGN_DIR}${state.screen}/refs/${state.name}-${width}.png`,
          animations: 'disabled',
          caret: 'hide',
        });
      } finally {
        await context.close();
      }
    }
  } finally {
    await state.after?.();
  }
}

/** The old app's cards: a task card is a left-aligned card with the task's title in it. */
const taskCard = (page: Page, title: string) =>
  page.locator('.v-card.text-left').filter({ hasText: title });

/** The old app's snackbar, once it shows `text`. */
const snackbar = (page: Page, text: string | RegExp) =>
  page.locator('.v-snack--active').filter({ hasText: text });

const shimmerGone = (page: Page) => expect(page.locator('.shimmer, .animate')).toHaveCount(0);

/** The same state again, dark, named `<screen>-dark`. */
function withDark(screen: string, state: OldState): OldState {
  return { ...state, name: `${screen}-dark`, theme: 'dark' };
}

const signinFields = (page: Page) => ({
  email: page.locator('.signin-container input[type="text"]'),
  password: page.locator('.signin-container input[type="password"]'),
  submit: page.locator('.signin-container button.primary'),
});

const authStates = (): OldState[] => {
  const heading = async (page: Page) => {
    await expect(page.locator('.signin-container .headline')).toBeVisible();
  };
  const openEmail = async (page: Page) => {
    await page.locator('.signin-container button:has(.mdi-email)').click();
    await expect(signinFields(page).email).toBeVisible();
  };
  const states = (['en', 'hi'] as const).flatMap((locale): OldState[] => [
    { screen: 'auth', name: `signin-${locale}`, path: '/signin', locale, ready: heading },
    {
      screen: 'auth',
      name: `signin-email-open-${locale}`,
      path: '/signin',
      locale,
      ready: heading,
      act: openEmail,
    },
    {
      screen: 'auth',
      name: `signin-error-${locale}`,
      path: '/signin',
      locale,
      beforeOpen: async (page) => {
        await page.route('**/identitytoolkit**', (route) => route.abort('internetdisconnected'));
      },
      ready: heading,
      act: async (page) => {
        await openEmail(page);
        const fields = signinFields(page);
        await fields.email.fill('ada@user.info');
        await fields.password.fill(PASSWORD);
        await fields.submit.click();
        await expect(page.locator('.v-snack--active')).toBeVisible();
      },
    },
    {
      screen: 'auth',
      name: `signup-${locale}`,
      path: '/signup',
      locale,
      ready: async (page) => {
        await expect(page.locator('.signup-container .headline')).toBeVisible();
      },
    },
  ]);
  // The old sign-in page never applies the saved theme (only the signed-in pages' menu does), so a
  // fresh load of it is always light. Dark shows after signing out of a dark page, which keeps
  // the theme: that is the state captured.
  const dark: OldState = {
    screen: 'auth',
    name: 'auth-dark',
    path: '/home',
    theme: 'dark',
    user: { email: HOME_USER.email, displayName: HOME_USER.displayName },
    ready: async (page) => {
      await expect(page.getByText('No task todo', { exact: true })).toBeVisible();
    },
    act: async (page) => {
      await page.locator('button:has(.mdi-dots-horizontal)').click();
      await page.locator('.v-list-item', { hasText: 'Sign out' }).click();
      await expect(page).toHaveURL(/\/signin$/);
      await heading(page);
      // The sign-out toast closes on its own; the capture is of the page.
      await expect(page.locator('.v-snack--active')).toHaveCount(0, { timeout: 10_000 });
    },
  };
  return [...states, dark];
};

const homeUser: OldUser = {
  email: HOME_USER.email,
  displayName: HOME_USER.displayName,
  seed: (uid) => seedLegacyHomeBoard(uid, TODAY),
};

const boardReady = async (page: Page) => {
  await expect(taskCard(page, 'Buy milk').locator('.v-chip', { hasText: 'Home' })).toBeVisible();
  await shimmerGone(page);
};

const homeStates = (): OldState[] => {
  const tasks: OldState = {
    screen: 'home',
    name: 'home-tasks',
    path: '/home',
    user: homeUser,
    ready: boardReady,
  };
  return [
    {
      screen: 'home',
      name: 'home-empty',
      path: '/home',
      user: { email: HOME_USER.email, displayName: HOME_USER.displayName },
      ready: async (page) => {
        await expect(page.getByText('No task todo', { exact: true })).toBeVisible();
        await shimmerGone(page);
      },
    },
    {
      screen: 'home',
      name: 'home-loading',
      path: '/home',
      user: homeUser,
      // The query never gets an answer, so the board stays on its shimmers.
      beforeOpen: async (page) => {
        await page.route(FIRESTORE_LISTEN_CHANNEL, () => {});
      },
      ready: async (page) => {
        await expect(page.locator('.title-shimmer').first()).toBeVisible();
      },
    },
    tasks,
    {
      ...tasks,
      name: 'home-editing',
      act: async (page) => {
        const card = taskCard(page, 'Buy milk');
        await card.hover();
        await card.locator('button:has(.mdi-pencil)').click();
        // The title is a field now, so the card no longer has the title as text.
        await expect(page.locator('.v-card.text-left input[type="text"]').first()).toHaveValue(
          'Buy milk',
        );
      },
    },
    {
      screen: 'home',
      name: 'home-load-error',
      path: '/home',
      user: homeUser,
      beforeOpen: () => setFirestoreRules(DENY_ALL_RULES),
      ready: async (page) => {
        await expect(snackbar(page, 'Error getting tasks')).toBeVisible();
      },
      after: restoreFirestoreRules,
    },
    { ...tasks, name: 'home-hi', locale: 'hi' },
    withDark('home', tasks),
  ];
};

const ADD_LABEL = { id: 'label-a', label: 'a', color: '#E91E63' };
const addUser: OldUser = {
  email: 'ada@example.info',
  displayName: 'Ada',
  seed: (uid) => seedLabel(uid, ADD_LABEL),
};

const addStates = (): OldState[] => {
  const labelChip = (page: Page) =>
    page.locator('.label-container .v-chip', { hasText: ADD_LABEL.label });
  const empty: OldState = {
    screen: 'add',
    name: 'add-empty',
    path: '/add',
    user: addUser,
    ready: async (page) => {
      await expect(labelChip(page)).toBeVisible();
      await shimmerGone(page);
    },
  };
  return [
    empty,
    {
      ...empty,
      name: 'add-filled',
      act: async (page) => {
        await page.getByPlaceholder('Name your task').fill('Buy milk');
        await page
          .getByPlaceholder('A detailed description of the task')
          .fill('Two litres, **semi-skimmed**');
        await labelChip(page).click();
      },
    },
    {
      ...empty,
      name: 'add-error',
      act: async (page) => {
        await page.locator('button[type="submit"]').click();
        await expect(page.locator('.v-messages__message').first()).toBeVisible();
      },
    },
    { ...empty, name: 'add-hi', locale: 'hi' },
    withDark('add', empty),
  ];
};

const profileUser: OldUser = {
  email: 'visual@example.info',
  displayName: 'Ankit Pandit',
  seed: async (uid) => {
    await seedDoc('types/visual-work', { uid, label: 'Work', color: '#E91E63' });
    await seedDoc('types/visual-home', { uid, label: 'Home', color: '#3F51B5' });
  },
};

const profileStates = (): OldState[] => {
  const main: OldState = {
    screen: 'profile',
    name: 'profile',
    path: '/profile',
    user: profileUser,
    fixedRandom: true,
    ready: async (page) => {
      await expect(page.getByText('Work', { exact: true })).toBeVisible();
      await expect(page.getByText('Home', { exact: true })).toBeVisible();
      await shimmerGone(page);
    },
  };
  return [
    main,
    {
      ...main,
      name: 'profile-editing',
      act: async (page) => {
        await page.locator('.editable-item').hover();
        // The pencil is `display: contents` while hovered, which has no box to click.
        await page
          .locator('.editable-item .edit-icon')
          .evaluate((icon) => (icon as HTMLElement).click());
        await expect(page.locator('.editable-item input')).toHaveValue('Ankit Pandit');
      },
    },
    { ...main, name: 'profile-hi', locale: 'hi' },
    withDark('profile', main),
  ];
};

/** The month the visual states show, in the old app's shape (the same as the calendar spec's). */
async function seedLegacyVisualMonth(uid: string): Promise<void> {
  await seedLabel(uid, { id: 'work', label: 'Work', color: '#1976D2' });
  const tasks = [
    {
      id: 'standup',
      title: 'Team stand-up',
      description: 'Daily sync with the **design** team',
      date: '2026-11-02',
      time: '09:30',
      labelIds: ['work'],
    },
    { id: 'milk', title: 'Buy milk', date: '2026-11-02', time: '18:00' },
    { id: 'dentist', title: 'Dentist', date: '2026-11-04', time: '11:00' },
    {
      id: 'report',
      title: 'Send the quarterly report',
      date: '2026-11-13',
      time: '14:00',
      labelIds: ['work'],
    },
    { id: 'rent', title: 'Pay rent', status: 'done' as const, date: '2026-11-01', time: '08:00' },
    { id: 'trip', title: 'Plan the winter trip', date: null },
  ];
  for (const task of tasks) await seedLegacyBoardTask(uid, task);
}

const calendarStates = (): OldState[] => {
  const standUp = (page: Page) =>
    page.locator('.v-event, .v-event-timed', { hasText: 'Team stand-up' }).first();
  const month: OldState = {
    screen: 'calendar',
    name: 'calendar-month',
    path: '/calendar',
    user: {
      email: HOME_USER.email,
      displayName: HOME_USER.displayName,
      seed: seedLegacyVisualMonth,
    },
    ready: async (page) => {
      await expect(standUp(page)).toBeVisible();
    },
  };
  const showView = (view: 'Day' | 'Week') => async (page: Page) => {
    await page.locator('button:has(.mdi-menu-down)').click();
    await page.locator('.v-list-item', { hasText: view }).click();
    await expect(standUp(page)).toBeVisible();
  };
  return [
    month,
    { ...month, name: 'calendar-week', act: showView('Week') },
    { ...month, name: 'calendar-day', act: showView('Day') },
    { ...month, name: 'calendar-hi', locale: 'hi' },
    withDark('calendar', month),
  ];
};

const NOTES = [
  { id: 'note-old', title: 'Reminder', body: 'Water the plants', at: '2026-10-30T23:45:00Z' },
  { id: 'note-new', title: 'Reminder', body: 'Buy milk', at: '2026-11-02T08:30:00Z' },
  { id: 'note-mid', title: 'Reminder', body: 'Call the bank', at: '2026-11-01T12:05:00Z' },
];

const notificationStates = (): OldState[] => {
  const list: OldState = {
    screen: 'notifications',
    name: 'notifications-list',
    path: '/notification',
    user: {
      email: 'ada@example.info',
      displayName: 'Ada',
      seed: async (uid) => {
        for (const note of NOTES) {
          await seedDoc(`notifications/${note.id}`, {
            uid,
            title: note.title,
            body: note.body,
            taskId: 'task-1',
            createdAt: new Date(note.at),
          });
        }
      },
    },
    ready: async (page) => {
      await expect(page.locator('.v-card.primary')).toHaveCount(NOTES.length);
      await shimmerGone(page);
    },
  };
  return [
    {
      screen: 'notifications',
      name: 'notifications-empty',
      path: '/notification',
      user: { email: 'grace@example.info', displayName: 'Grace' },
      ready: async (page) => {
        await expect(page.getByText('No notifications', { exact: true })).toBeVisible();
        await shimmerGone(page);
      },
    },
    list,
    { ...list, name: 'notifications-hi', locale: 'hi' },
    withDark('notifications', list),
  ];
};

const SCREENS: Record<string, () => OldState[]> = {
  auth: authStates,
  home: homeStates,
  add: addStates,
  profile: profileStates,
  calendar: calendarStates,
  notifications: notificationStates,
};

test.describe('old app references', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'one browser captures the references');
  test.skip(!canCompareVisuals(), VISUAL_SKIP_REASON);
  test.skip(
    !OLD_APP_URL,
    'OLD_APP_URL is not set: start the old app with node e2e/support/old-app.mjs',
  );
  test.describe.configure({ timeout: 900_000 });

  for (const [screen, states] of Object.entries(SCREENS)) {
    test(`${screen}: each state is captured from the old app at 390 and 1280`, async ({
      browser,
    }) => {
      for (const state of states()) await captureOldState(browser, state);
    });
  }
});
