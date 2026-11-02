import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { parseEnv } from 'node:util';
import { expect, test, type Page } from '@playwright/test';
import {
  AUTH_EMULATOR_HOST,
  FIRESTORE_EMULATOR_HOST,
  createUser,
  docRef,
  listUserEmails,
  readDoc,
  resetEmulators,
  seedDoc,
  signInAs,
} from './support/emulator';

const MAX_PRECACHE_BYTES = 2 * 1024 * 1024;

/**
 * Where a signed-out visit to a redirecting path ends up: the auth guard (Task 4) sends it to the
 * sign-in screen, with /home as the place to return to.
 */
async function expectRedirectToHome(page: Page): Promise<void> {
  await expect(page).toHaveURL(
    (url) => url.pathname === '/signin' && url.searchParams.get('redirect') === '/home',
  );
}

/** Signs in as a fresh user, so the guarded app screens open. */
async function signInFreshUser(page: Page): Promise<void> {
  await resetEmulators();
  const user = await createUser('shell@example.info', 'abc-def_9', 'Shell');
  await signInAs(page, user.email, user.password);
}

test.describe('app shell routes', () => {
  test('a signed-out visit to / goes to sign in, returning to /home', async ({ page }) => {
    await page.goto('/');

    await expectRedirectToHome(page);
  });

  for (const path of ['/index', '/nope', '/a/b/c']) {
    test(`a signed-out visit to ${path} goes to sign in, returning to /home`, async ({ page }) => {
      await page.goto(path);

      await expectRedirectToHome(page);
    });
  }

  test('the bottom nav marks the Home tab active on /home', async ({ page }) => {
    // The guard sends signed-out visitors to /signin: sign in first.
    await signInFreshUser(page);
    await page.goto('/home');

    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    const home = nav.getByRole('link', { name: 'Home' });
    await expect(home).toHaveAttribute('aria-current', 'page');
    await expect(home).toHaveClass(/v-btn--active/);
    for (const name of ['Calendar', 'Add task', 'Notifications', 'Profile']) {
      await expect(nav.getByRole('link', { name })).not.toHaveAttribute('aria-current', 'page');
    }
  });

  test('a redirect from / lands with the Home tab active', async ({ page }) => {
    await signInFreshUser(page);
    await page.goto('/');

    await expect(page).toHaveURL(/\/home$/);
    await expect(
      page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Home' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('the sign-in screen shows no bottom nav', async ({ page }) => {
    await page.goto('/signin');

    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);
  });

  test('the saved language is used on load', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('lang', 'hi'));
    await signInFreshUser(page);

    await page.goto('/home');

    await expect(page.getByRole('link', { name: 'होम' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
  });
});

test.describe('production build', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'checks files, not a browser');
  test.describe.configure({ timeout: 240_000 });

  let workDir = '';
  let dist = '';

  test.beforeAll(() => {
    workDir = mkdtempSync(join(tmpdir(), 'todo-pwa-build-'));
    dist = join(workDir, 'dist');
    const demoEnv = parseEnv(readFileSync('.env.ci', 'utf8')) as Record<string, string>;
    const build = spawnSync(
      process.execPath,
      ['node_modules/vite/bin/vite.js', 'build', '--outDir', dist, '--emptyOutDir'],
      { encoding: 'utf8', env: { ...process.env, ...demoEnv }, timeout: 200_000 },
    );
    expect(build.status, `${build.stdout}\n${build.stderr}`).toBe(0);
  });

  test.afterAll(() => {
    if (workDir) rmSync(workDir, { recursive: true, force: true });
  });

  function filesIn(dir: string): string[] {
    return readdirSync(dir, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => join(entry.parentPath, entry.name));
  }

  test('leaves the source maps out of dist (S5)', () => {
    const files = filesIn(dist);

    expect(files.filter((f) => f.endsWith('.map'))).toEqual([]);
    const mapped = files.filter(
      (f) => /\.(js|css)$/.test(f) && readFileSync(f, 'utf8').includes('sourceMappingURL'),
    );
    expect(mapped).toEqual([]);
    // Built for error tracking, beside dist.
    expect(existsSync(join(workDir, 'sourcemaps', 'sw.js.map'))).toBe(true);
  });

  test('precaches only files under 2 MB (W2)', () => {
    const sw = readFileSync(join(dist, 'sw.js'), 'utf8');
    const precached = [...sw.matchAll(/"url":"([^"]+)"/g)].map((match) => match[1] ?? '');

    expect(precached).toContain('index.html');
    expect(precached.some((url) => /^assets\/vuetify-.*\.js$/.test(url))).toBe(true);
    for (const url of precached) {
      const size = statSync(join(dist, url)).size;
      expect(size, url).toBeLessThan(MAX_PRECACHE_BYTES);
    }
    for (const file of filesIn(dist).filter((f) => f.endsWith('.js'))) {
      expect(statSync(file).size, relative(dist, file)).toBeLessThan(MAX_PRECACHE_BYTES);
    }
  });

  test('writes the web manifest the spec asks for (W3)', () => {
    const manifest = JSON.parse(readFileSync(join(dist, 'manifest.webmanifest'), 'utf8')) as {
      theme_color: string;
      background_color: string;
      id: string;
      scope: string;
      start_url: string;
      icons: { src: string; purpose?: string }[];
    };

    expect(manifest).toMatchObject({
      theme_color: '#1976D2',
      background_color: '#FAFAFA',
      id: '/',
      scope: '/',
      start_url: '/home',
    });
    const maskable = manifest.icons.filter((icon) => icon.purpose?.split(' ').includes('maskable'));
    expect(maskable).toHaveLength(1);
    expect(existsSync(join(dist, maskable[0]?.src ?? 'missing'))).toBe(true);
    expect(readFileSync(join(dist, 'index.html'), 'utf8')).toContain('manifest.webmanifest');
  });
});

test.describe('CI workflow', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'checks a file, not a browser');

  test('runs every gate on pull requests to master, on Node 24 with Java 21 and the demo env', () => {
    const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
    const nvmrc = readFileSync('.nvmrc', 'utf8').trim();

    expect(ci).toMatch(/pull_request:\s*\n\s*branches:\s*\[\s*master\s*\]/);
    expect(nvmrc).toBe('24');
    expect(ci).toContain('node-version-file: .nvmrc');
    expect(ci).toMatch(/java-version:\s*'21'/);
    expect(ci).toContain('cat .env.ci >> "$GITHUB_ENV"');
    for (const gate of ['typecheck', 'lint', 'format:check', 'test', 'e2e']) {
      expect(ci, gate).toContain(`npm run ${gate}\n`);
    }
  });
});

test.describe('emulator ports', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'checks settings, not a browser');

  test("are this project's own, not the defaults another project may hold", () => {
    expect(AUTH_EMULATOR_HOST).toMatch(/:9199$/);
    expect(FIRESTORE_EMULATOR_HOST).toMatch(/:8180$/);
  });
});

test.describe('emulator harness', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'calls the emulators, not a browser');

  test.beforeEach(async () => {
    await resetEmulators();
  });

  test('createUser adds an account, and resetEmulators removes it', async () => {
    const user = await createUser('ada@example.info', 'abc-def_9', 'Ada');

    expect(user).toMatchObject({ email: 'ada@example.info', displayName: 'Ada' });
    expect(user.uid).not.toBe('');
    expect(await listUserEmails()).toEqual(['ada@example.info']);

    await resetEmulators();

    expect(await listUserEmails()).toEqual([]);
  });

  test('seedDoc writes legacy shapes past the rules, and resetEmulators removes them', async () => {
    const remindAt = new Date('2026-11-02T02:30:00Z');

    await seedDoc('tasks/t1', {
      uid: 'u1',
      title: 'Legacy',
      date: 'NA',
      reminded: false,
      remindAt,
      type: [docRef('types/a')],
      meta: { count: 2, ratio: 0.5, missing: null },
    });

    const doc = await readDoc('tasks/t1');
    expect(doc).toMatchObject({
      uid: { stringValue: 'u1' },
      date: { stringValue: 'NA' },
      reminded: { booleanValue: false },
      remindAt: { timestampValue: '2026-11-02T02:30:00Z' },
      type: {
        arrayValue: {
          values: [{ referenceValue: 'projects/demo-todo/databases/(default)/documents/types/a' }],
        },
      },
      meta: {
        mapValue: {
          fields: {
            count: { integerValue: '2' },
            ratio: { doubleValue: 0.5 },
            missing: { nullValue: null },
          },
        },
      },
    });

    await resetEmulators();

    expect(await readDoc('tasks/t1')).toBeNull();
  });

  test('seedDoc refuses a path that is not a document', async () => {
    await expect(seedDoc('tasks', {})).rejects.toThrow('not a document path');
    await expect(seedDoc('tasks/../users/x', {})).rejects.toThrow('not a document path');
  });
});
