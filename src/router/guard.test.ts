import type { User } from 'firebase/auth';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMemoryHistory,
  createRouter,
  type RouteLocationNormalized,
  type RouteLocationRaw,
} from 'vue-router';
import { onUserChanged, waitForAuthReady } from '@/services/auth';
import { routes } from './index';
import { authGuard, safeRedirect } from './guard';

vi.mock('@/services/auth', () => ({
  waitForAuthReady: vi.fn(),
  onUserChanged: vi.fn(),
  signOutUser: vi.fn(),
}));
vi.mock('@/services/tasks', () => ({
  listTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}));
vi.mock('@/services/labels', () => ({ listLabels: vi.fn(), createLabel: vi.fn() }));
vi.mock('@/services/notifications', () => ({
  listNotifications: vi.fn(),
  deleteNotification: vi.fn(),
}));

const alice = { uid: 'alice', email: 'a@example.com', displayName: 'Alice', photoURL: null };

/** The app's own routes, resolved as the router resolves them before running the guard. */
const resolver = createRouter({ history: createMemoryHistory(), routes });

/** The location the router hands its guards for `path`, built from the app's own route table. */
function to(path: string): RouteLocationNormalized {
  const {
    name,
    path: resolvedPath,
    params,
    query,
    hash,
    fullPath,
    meta,
    matched,
    redirectedFrom,
  } = resolver.resolve(path);
  return {
    name: name ?? undefined,
    path: resolvedPath,
    params,
    query,
    hash,
    fullPath,
    meta,
    matched,
    redirectedFrom,
  };
}

function signedIn(): void {
  vi.mocked(waitForAuthReady).mockResolvedValue(alice as unknown as User);
}
function signedOut(): void {
  vi.mocked(waitForAuthReady).mockResolvedValue(null);
}

describe('authGuard', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(waitForAuthReady).mockReset();
    vi.mocked(onUserChanged).mockReset();
    vi.mocked(onUserChanged).mockReturnValue(() => {});
  });

  it('sends a signed-out visit to /calendar to /signin, with /calendar to return to (§3.1)', async () => {
    signedOut();

    const result = await authGuard(to('/calendar'));

    expect(result).toEqual({ path: '/signin', query: { redirect: '/calendar' } });
    // The address bar carries it as /signin?redirect=%2Fcalendar (or unencoded): either reads back.
    expect(
      new URL(resolver.resolve(result as RouteLocationRaw).href, 'http://x').searchParams.get(
        'redirect',
      ),
    ).toBe('/calendar');
  });

  it('keeps the query of the page to return to', async () => {
    signedOut();

    const result = await authGuard(to('/calendar?view=week'));

    expect(result).toEqual({ path: '/signin', query: { redirect: '/calendar?view=week' } });
  });

  it.each(['/home', '/add', '/notification', '/profile'])(
    'sends a signed-out visit to %s to sign in',
    async (path) => {
      signedOut();

      expect(await authGuard(to(path))).toEqual({ path: '/signin', query: { redirect: path } });
    },
  );

  it.each(['/signin', '/signup'])('lets a signed-out visitor open %s', async (path) => {
    signedOut();

    expect(await authGuard(to(path))).toBe(true);
  });

  it.each(['/signin', '/signup'])('sends a signed-in visit to %s to /home', async (path) => {
    signedIn();

    expect(await authGuard(to(path))).toBe('/home');
  });

  it.each([
    ['/privacy', 'privacy'],
    ['/delete-account', 'delete-account'],
  ])('routes %s to its own public page, with no menu and no bottom bar (W1)', (path, name) => {
    const location = to(path);

    expect(location.name).toBe(name);
    expect(location.meta.requireAuth).toBeUndefined();
    expect(location.meta.nav).toBeUndefined();
  });

  it.each(['/privacy', '/delete-account'])(
    'lets a signed-out visit to %s through (W1)',
    async (path) => {
      signedOut();

      expect(await authGuard(to(path))).toBe(true);
    },
  );

  it.each(['/privacy', '/delete-account'])(
    'lets a signed-in visit to %s through, with no redirect (W1)',
    async (path) => {
      signedIn();

      expect(await authGuard(to(path))).toBe(true);
    },
  );

  it('sends a signed-in visit to /signin?redirect=/calendar on to /calendar', async () => {
    signedIn();

    expect(await authGuard(to('/signin?redirect=%2Fcalendar'))).toBe('/calendar');
  });

  it('lets a signed-in visit to /profile through', async () => {
    signedIn();

    expect(await authGuard(to('/profile'))).toBe(true);
  });

  it('waits until Firebase knows who is signed in before deciding', async () => {
    let restore: (u: User | null) => void = () => {};
    vi.mocked(waitForAuthReady).mockReturnValue(
      new Promise((resolve) => {
        restore = resolve;
      }),
    );
    let settled = false;

    const pending = authGuard(to('/profile')).then((result) => {
      settled = true;
      return result;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    restore(alice as unknown as User);
    expect(await pending).toBe(true);
  });

  it('starts following the signed-in user, once', async () => {
    signedIn();

    await authGuard(to('/profile'));
    await authGuard(to('/home'));

    expect(onUserChanged).toHaveBeenCalledTimes(1);
  });

  it('treats a session that fails to restore as signed out, and logs the cause', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(waitForAuthReady).mockRejectedValue(
      Object.assign(new Error('secret detail'), { code: 'auth/internal-error' }),
    );

    expect(await authGuard(to('/home'))).toEqual({
      path: '/signin',
      query: { redirect: '/home' },
    });
    expect(error).toHaveBeenCalledWith(
      '[auth] could not restore the session:',
      'auth/internal-error',
    );
  });
});

describe('safeRedirect', () => {
  it.each([
    ['/calendar', '/calendar'],
    ['/calendar?view=week#today', '/calendar?view=week#today'],
    ['/profile', '/profile'],
  ])('keeps the in-app path %j', (value, expected) => {
    expect(safeRedirect(value)).toBe(expected);
  });

  it.each([undefined, null, '', ['/calendar'], 42])(
    'gives /home for a missing or non-text value (%j)',
    (value) => {
      expect(safeRedirect(value)).toBe('/home');
    },
  );

  it.each([
    'https://evil.example/home',
    '//evil.example/home',
    '/\\evil.example',
    '/\t/evil.example',
    'javascript:alert(1)',
    'calendar',
    '/signin',
    '/signup?redirect=/home',
    `/${'a'.repeat(2048)}`,
  ])('gives /home, and logs it, for an unsafe redirect (%j)', (value) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(safeRedirect(value)).toBe('/home');
    expect(warn).toHaveBeenCalledWith('[auth] ignored an unsafe redirect');
  });
});
