/**
 * The notifications screen (/notification): the push toggle where push is unsupported (P1), the
 * list newest first in the browser's time zone (D5), deleting (and a delete the server rejects),
 * and the screen's visual states.
 */
import { expect, test, type Page, type Route } from '@playwright/test';
import {
  createUser,
  readDoc,
  resetEmulators,
  seedDoc,
  signInAs,
  type TestUser,
} from './support/emulator';
import {
  VISUAL_SKIP_REASON,
  canCompareVisuals,
  compareScreen,
  type VisualState,
} from './support/visual';

const TIME_ZONE = 'Asia/Tokyo';
const PASSWORD = 'abc-def_9';
/** Firestore's write stream, through which every delete goes. */
const WRITE_CHANNEL = '**/google.firestore.v1.Firestore/Write/**';
const UNSUPPORTED = "Notifications aren't supported on this browser.";

/** Three reminders, seeded oldest first so the screen's order is its own. */
const NOTES = [
  { id: 'note-old', title: 'Reminder', body: 'Water the plants', at: '2026-10-30T23:45:00Z' },
  { id: 'note-new', title: 'Reminder', body: 'Buy milk', at: '2026-11-02T08:30:00Z' },
  { id: 'note-mid', title: 'Reminder', body: 'Call the bank', at: '2026-11-01T12:05:00Z' },
] as const;
/** Newest first. */
const ORDER = ['note-new', 'note-mid', 'note-old'];

async function seedNotes(user: TestUser): Promise<void> {
  for (const note of NOTES) {
    await seedDoc(`notifications/${note.id}`, {
      uid: user.uid,
      title: note.title,
      body: note.body,
      taskId: 'task-1',
      createdAt: new Date(note.at),
    });
  }
}

const SHOWN_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' };

/** The time as Node formats it in `timeZone`, with every kind of space made one space. */
function shownIn(timeZone: string, iso: string): string {
  return new Intl.DateTimeFormat('en-US', { ...SHOWN_FORMAT, timeZone })
    .format(new Date(iso))
    .replace(/\s+/g, ' ');
}

/**
 * The time as the browser formats it in `timeZone`: each engine's ICU words it its own way
 * (WebKit writes "Oct 31, 2026 at 8:45 AM", Chromium "Oct 31, 2026, 8:45 AM").
 */
function shownInBrowser(page: Page, timeZone: string, iso: string): Promise<string> {
  return page.evaluate(
    ([options, zone, at]) =>
      new Intl.DateTimeFormat('en-US', { ...options, timeZone: zone })
        .format(new Date(at))
        .replace(/\s+/g, ' '),
    [SHOWN_FORMAT, timeZone, iso] as const,
  );
}

const cards = (page: Page) => page.getByTestId('notification');
const card = (page: Page, id: string) => page.locator(`[data-notification-id="${id}"]`);
const pushToggle = (page: Page) =>
  page
    .getByRole('switch', { name: 'Notification permission' })
    .or(page.getByRole('checkbox', { name: 'Notification permission' }));

/** Removes window.Notification before the app loads, as on iOS Safari. */
async function withoutNotificationApi(page: Page): Promise<void> {
  await page.addInitScript(() => {
    delete (window as { Notification?: unknown }).Notification;
  });
}

/** Removes the Push API before the app loads, so Firebase's isSupported() is false. */
async function withoutPushApi(page: Page): Promise<void> {
  await page.addInitScript(() => {
    delete (window as { PushManager?: unknown }).PushManager;
  });
}

test.describe('notifications screen', () => {
  test.use({ timezoneId: TIME_ZONE });

  let user: TestUser;

  test.beforeEach(async ({ page }) => {
    await resetEmulators();
    user = await createUser('ada@example.info', PASSWORD, 'Ada');
    await seedNotes(user);
    await signInAs(page, user.email, user.password);
  });

  // Playwright's WebKit has the Push API, and Firebase's isSupported() is true there, as in Safari
  // 16.4 and later: a browser without it stands in for the browsers that have none.
  test("the toggle is disabled with the unsupported message where Firebase's isSupported() is false (P1)", async ({
    page,
  }) => {
    await withoutPushApi(page);

    await page.goto('/notification');

    await expect(pushToggle(page)).toBeDisabled();
    await expect(page.getByText(UNSUPPORTED)).toBeVisible();
  });

  test('the toggle is disabled with the unsupported message where window.Notification is missing (iOS Safari)', async ({
    page,
  }) => {
    await withoutNotificationApi(page);

    await page.goto('/notification');

    await expect(pushToggle(page)).toBeDisabled();
    await expect(page.getByText(UNSUPPORTED)).toBeVisible();
  });

  test('opening the screen never asks for notification permission (P1)', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as { Notification?: { requestPermission?: () => Promise<string> } };
      const api = w.Notification;
      if (api?.requestPermission) {
        api.requestPermission = () => {
          (window as { __permissionAsked?: boolean }).__permissionAsked = true;
          return Promise.resolve('default');
        };
      }
    });

    await page.goto('/notification');
    await expect(cards(page)).toHaveCount(3);

    expect(
      await page.evaluate(() => (window as { __permissionAsked?: boolean }).__permissionAsked),
    ).toBeUndefined();
  });

  test("lists the reminders newest first, with times in the browser's time zone (D5)", async ({
    page,
  }) => {
    await page.goto('/notification');

    await expect(cards(page)).toHaveCount(3);
    const ids = await cards(page).evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-notification-id')),
    );
    expect(ids).toEqual(ORDER);
    for (const note of NOTES) {
      const time = card(page, note.id).locator('time');
      await expect(card(page, note.id)).toContainText(note.body);
      await expect(time).toHaveAttribute('datetime', new Date(note.at).toISOString());
      const text = ((await time.textContent()) ?? '').replace(/\s+/g, ' ').trim();
      expect(text).toBe(await shownInBrowser(page, TIME_ZONE, note.at));
    }
    // 2026-10-30 23:45 UTC is already 31 Oct in Tokyo.
    expect(shownIn(TIME_ZONE, NOTES[0].at)).toContain('Oct 31, 2026');
  });

  for (const lang of ['en', 'hi'] as const) {
    test(`the delete button on a card is visible against the card's colour (${lang})`, async ({
      page,
    }) => {
      await page.evaluate((l) => localStorage.setItem('lang', l), lang);
      await page.goto('/notification');
      await expect(cards(page)).toHaveCount(3);

      const colours = await card(page, 'note-mid').evaluate((el) => {
        const button = el.querySelector('button[aria-label]') as HTMLElement;
        const icon = button.querySelector('.v-icon') as HTMLElement;
        return {
          icon: getComputedStyle(icon).color,
          background: getComputedStyle(el).backgroundColor,
        };
      });

      expect(colours.icon).not.toBe(colours.background);
      expect(colours.icon).toBe('rgb(255, 255, 255)');
    });
  }

  test('deleting a reminder removes it, and it stays gone after reload', async ({ page }) => {
    await page.goto('/notification');
    await expect(cards(page)).toHaveCount(3);

    await card(page, 'note-mid').getByRole('button', { name: 'Delete notification' }).click();

    await expect(card(page, 'note-mid')).toHaveCount(0);
    await expect(cards(page)).toHaveCount(2);
    await expect.poll(() => readDoc('notifications/note-mid')).toBeNull();

    await page.reload();

    await expect(cards(page)).toHaveCount(2);
    await expect(card(page, 'note-mid')).toHaveCount(0);
  });

  test('a delete the server rejects keeps the reminder and says "Error deleting notification"', async ({
    page,
  }) => {
    // Someone else's notification: the security rules reject any delete of it.
    await seedDoc('notifications/note-xyz', {
      uid: 'someone-else',
      title: 'Reminder',
      body: 'Not yours',
      taskId: null,
      createdAt: new Date('2026-11-01T00:00:00Z'),
    });
    // The delete reaches the server aimed at that document, so the rules reject it.
    await page.route(WRITE_CHANNEL, async (route: Route) => {
      const body = route.request().postData();
      if (body?.includes('note-mid')) {
        await route.continue({ postData: body.split('note-mid').join('note-xyz') });
      } else {
        await route.continue();
      }
    });
    await page.goto('/notification');
    await expect(cards(page)).toHaveCount(3);

    await card(page, 'note-mid').getByRole('button', { name: 'Delete notification' }).click();

    await expect(page.getByText('Error deleting notification')).toBeVisible({ timeout: 15_000 });
    await expect(card(page, 'note-mid')).toBeVisible();
    await expect(cards(page)).toHaveCount(3);
    expect(await readDoc('notifications/note-mid')).not.toBeNull();
    expect(await readDoc('notifications/note-xyz')).not.toBeNull();
  });

  test('an account with no reminders sees the empty state', async ({ page }) => {
    await resetEmulators();
    const other = await createUser('grace@example.info', PASSWORD, 'Grace');
    await signInAs(page, other.email, other.password);

    await page.goto('/notification');

    await expect(page.getByText('No notifications', { exact: true })).toBeVisible();
    await expect(cards(page)).toHaveCount(0);
  });

  test('every label appears in Hindi when hi is on (D18)', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('lang', 'hi'));

    await page.goto('/notification');

    await expect(page.getByText('अधिसूचना अनुमति')).toBeVisible();
    await expect(cards(page)).toHaveCount(3);
    await expect(page.getByRole('button', { name: 'अधिसूचना हटाएं' })).toHaveCount(3);
    for (const english of ['Notification permission', 'Delete notification']) {
      await expect(page.getByText(english, { exact: true })).toHaveCount(0);
    }
  });
});

test.describe('notifications visuals', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'one capture per state');
  test.skip(!canCompareVisuals(), VISUAL_SKIP_REASON);
  test.describe.configure({ timeout: 300_000 });

  test('notifications-empty, -list, -unsupported, -dark and -hi match their references at 390 and 1280', async ({
    browser,
    baseURL,
  }) => {
    await resetEmulators();
    const user = await createUser('ada@example.info', PASSWORD, 'Ada');
    const empty = await createUser('grace@example.info', PASSWORD, 'Grace');
    await seedNotes(user);
    const signIn = (u: TestUser) => (page: Page) => signInAs(page, u.email, u.password);
    const listShown = (page: Page) => expect(cards(page)).toHaveCount(3);

    const states: VisualState[] = [
      {
        name: 'notifications-empty',
        path: '/notification',
        before: signIn(empty),
        act: (page) => expect(page.getByText('No notifications', { exact: true })).toBeVisible(),
      },
      { name: 'notifications-list', path: '/notification', before: signIn(user), act: listShown },
      {
        name: 'notifications-unsupported',
        path: '/notification',
        before: async (page) => {
          await withoutNotificationApi(page);
          await signIn(user)(page);
        },
        act: async (page) => {
          await listShown(page);
          await expect(page.getByText(UNSUPPORTED)).toBeVisible();
        },
      },
      {
        name: 'notifications-dark',
        path: '/notification',
        theme: 'dark',
        before: signIn(user),
        act: listShown,
      },
      {
        name: 'notifications-hi',
        path: '/notification',
        locale: 'hi',
        before: signIn(user),
        act: listShown,
      },
    ];

    const result = await compareScreen(browser, baseURL ?? '', 'notifications', states);

    if (result.newReferences.length > 0) {
      test.info().annotations.push({
        type: 'new references (need approval)',
        description: result.newReferences.join(', '),
      });
    }
    expect(result.status, result.output).toBe(0);
  });
});
