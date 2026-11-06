import type { User } from 'firebase/auth';
import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteCurrentUser } from '@/services/account';
import {
  onUserChanged,
  reloadEmailVerified,
  sendVerificationEmail,
  signOutUser,
} from '@/services/auth';
import { useLabelsStore } from './labels';
import { useNotificationsStore } from './notifications';
import { useSessionStore } from './session';
import { useTasksStore } from './tasks';
import { useUiStore } from './ui';
import type { Task } from '@/types/models';

vi.mock('@/services/auth', () => ({
  onUserChanged: vi.fn(),
  signOutUser: vi.fn(),
  reloadEmailVerified: vi.fn(),
  sendVerificationEmail: vi.fn(),
}));
vi.mock('@/services/account', () => ({ deleteCurrentUser: vi.fn() }));
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

const alice = {
  uid: 'alice',
  email: 'a@example.com',
  displayName: 'Alice',
  photoURL: null,
  emailVerified: true,
};

const task: Task = {
  id: 't1',
  uid: 'alice',
  title: 'Mine',
  description: '',
  status: 'todo',
  indefinite: true,
  date: null,
  time: null,
  timeZone: 'Asia/Kolkata',
  remindAt: null,
  reminded: false,
  labelIds: [],
};

/** Puts the first user's data in every per-user store, as after a session of use. */
function fillPerUserState(): void {
  useTasksStore().tasks = [task];
  useLabelsStore().labels = [{ id: 'a', uid: 'alice', label: 'Work', color: '#f00' }];
  useNotificationsStore().items = [
    { id: 'n1', uid: 'alice', title: 't', body: 'b', taskId: null, createdAt: new Date() },
  ];
  useUiStore().showSnack('Task added');
}

function expectPerUserStateCleared(): void {
  expect(useTasksStore().tasks).toEqual([]);
  expect(useLabelsStore().labels).toEqual([]);
  expect(useNotificationsStore().items).toEqual([]);
  expect(useUiStore().snack).toBeNull();
}

/** Starts the session and returns the auth listener it registered. */
function startSession(): (u: User | null) => void {
  let listener: ((u: User | null) => void) | undefined;
  vi.mocked(onUserChanged).mockImplementation((cb) => {
    listener = cb;
    return () => {};
  });
  useSessionStore().start();
  if (!listener) throw new Error('start() did not subscribe');
  return listener;
}

describe('session store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(onUserChanged).mockReset();
    vi.mocked(signOutUser).mockReset();
    vi.mocked(signOutUser).mockResolvedValue();
    vi.mocked(deleteCurrentUser).mockReset();
    vi.mocked(deleteCurrentUser).mockResolvedValue();
  });

  it('subscribes once, and becomes ready with the user Firebase reports', () => {
    const listener = startSession();
    const session = useSessionStore();
    session.start();

    expect(onUserChanged).toHaveBeenCalledTimes(1);
    expect(session.ready).toBe(false);

    listener({ ...alice, extra: 'ignored' } as unknown as User);

    expect(session.ready).toBe(true);
    expect(session.user).toEqual(alice);
  });

  it('signOut runs every hook before signOutUser, then clears all per-user state (D13)', async () => {
    const listener = startSession();
    listener(alice as unknown as User);
    fillPerUserState();
    const order: string[] = [];
    const session = useSessionStore();
    session.onSignOut(async () => {
      await Promise.resolve();
      order.push('hook 1');
    });
    session.onSignOut(() => {
      order.push('hook 2');
    });
    vi.mocked(signOutUser).mockImplementation(async () => {
      order.push('signOutUser');
    });

    await session.signOut();

    expect(order).toEqual(['hook 1', 'hook 2', 'signOutUser']);
    expectPerUserStateCleared();
    expect(session.user).toBeNull();
  });

  it('still signs out when a hook fails, and logs the failure', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const session = useSessionStore();
    session.onSignOut(() => {
      throw new TypeError('token delete failed');
    });

    await session.signOut();

    expect(signOutUser).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('[session] a sign-out hook failed:', 'TypeError');
  });

  it('keeps the data when signOutUser fails, and rejects', async () => {
    const listener = startSession();
    listener(alice as unknown as User);
    fillPerUserState();
    vi.mocked(signOutUser).mockRejectedValue(new Error('network'));

    await expect(useSessionStore().signOut()).rejects.toThrow('network');

    expect(useTasksStore().tasks).toEqual([task]);
    expect(useSessionStore().user).toEqual(alice);
  });

  it('clears per-user state when Firebase reports a different user or none', () => {
    const listener = startSession();
    listener(alice as unknown as User);
    fillPerUserState();

    listener({ ...alice, uid: 'bob' } as unknown as User);

    expectPerUserStateCleared();
  });

  it('runSignOutHooks runs every hook in turn, logging a failing one by its code only', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const order: string[] = [];
    const session = useSessionStore();
    session.onSignOut(() => {
      order.push('hook 1');
      throw Object.assign(new Error('secret-ish detail'), {
        code: 'messaging/token-unsubscribe-failed',
      });
    });
    session.onSignOut(() => {
      order.push('hook 2');
    });

    await session.runSignOutHooks();

    expect(order).toEqual(['hook 1', 'hook 2']);
    expect(warn).toHaveBeenCalledWith(
      '[session] a sign-out hook failed:',
      'messaging/token-unsubscribe-failed',
    );
    expect(signOutUser).not.toHaveBeenCalled();
  });

  describe('deleteAccount (D5, decisions/delete-account-deletes-user-first)', () => {
    function networkError(): Error {
      return Object.assign(new Error('offline'), { code: 'auth/network-request-failed' });
    }

    it('calls deleteCurrentUser before any hook, then clears all per-user state and the user', async () => {
      const listener = startSession();
      listener(alice as unknown as User);
      fillPerUserState();
      const order: string[] = [];
      const session = useSessionStore();
      session.onSignOut(() => {
        order.push('hook 1');
      });
      session.onSignOut(async () => {
        order.push('hook 2');
      });
      vi.mocked(deleteCurrentUser).mockImplementation(async () => {
        order.push('deleteCurrentUser');
        expect(useTasksStore().tasks).toEqual([task]);
      });

      await session.deleteAccount();

      expect(order).toEqual(['deleteCurrentUser', 'hook 1', 'hook 2']);
      expectPerUserStateCleared();
      expect(session.user).toBeNull();
      expect(signOutUser).not.toHaveBeenCalled();
    });

    it('rejects with auth/network-request-failed, runs no hook and changes nothing', async () => {
      const listener = startSession();
      listener(alice as unknown as User);
      fillPerUserState();
      const hook = vi.fn();
      const session = useSessionStore();
      session.onSignOut(hook);
      vi.mocked(deleteCurrentUser).mockRejectedValue(networkError());

      await expect(session.deleteAccount()).rejects.toMatchObject({
        code: 'auth/network-request-failed',
      });
      await flushPromises();

      expect(hook).not.toHaveBeenCalled();
      expect(useTasksStore().tasks).toEqual([task]);
      expect(useLabelsStore().labels).toHaveLength(1);
      expect(useNotificationsStore().items).toHaveLength(1);
      expect(useUiStore().snack).not.toBeNull();
      expect(session.user).toEqual(alice);
    });

    it('rejects with auth/requires-recent-login, runs no hook and clears nothing', async () => {
      const listener = startSession();
      listener(alice as unknown as User);
      fillPerUserState();
      const hook = vi.fn();
      vi.mocked(deleteCurrentUser).mockRejectedValue(
        Object.assign(new Error('recent login needed'), { code: 'auth/requires-recent-login' }),
      );
      const session = useSessionStore();
      session.onSignOut(hook);

      await expect(session.deleteAccount()).rejects.toMatchObject({
        code: 'auth/requires-recent-login',
      });
      await flushPromises();

      expect(hook).not.toHaveBeenCalled();
      expect(useTasksStore().tasks).toEqual([task]);
      expect(useUiStore().snack).not.toBeNull();
      expect(session.user).toEqual(alice);
    });

    it('resolves and clears state even when a hook never settles', async () => {
      const listener = startSession();
      listener(alice as unknown as User);
      fillPerUserState();
      const session = useSessionStore();
      const pending = vi.fn(() => new Promise<void>(() => {}));
      const after = vi.fn();
      session.onSignOut(pending);
      session.onSignOut(after);

      await session.deleteAccount();

      expect(pending).toHaveBeenCalledTimes(1);
      expect(after).toHaveBeenCalledTimes(1);
      expectPerUserStateCleared();
      expect(session.user).toBeNull();
    });

    it('logs a rejecting or throwing hook by its code only, and still clears state', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const listener = startSession();
      listener(alice as unknown as User);
      fillPerUserState();
      const session = useSessionStore();
      session.onSignOut(async () => {
        throw Object.assign(new Error('secret-ish detail'), {
          code: 'permission-denied',
        });
      });
      session.onSignOut(() => {
        throw new TypeError('token delete failed');
      });

      await session.deleteAccount();

      expectPerUserStateCleared();
      expect(session.user).toBeNull();
      await vi.waitFor(() => expect(warn).toHaveBeenCalledTimes(2));
      expect(warn).toHaveBeenCalledWith('[session] a sign-out hook failed:', 'permission-denied');
      expect(warn).toHaveBeenCalledWith('[session] a sign-out hook failed:', 'TypeError');
      expect(JSON.stringify(warn.mock.calls)).not.toContain('secret-ish detail');
    });
  });

  describe('email verification (decisions/email-verification-reminder)', () => {
    beforeEach(() => {
      vi.mocked(reloadEmailVerified).mockReset();
      vi.mocked(sendVerificationEmail).mockReset();
    });

    it('marks the user verified once the reload says so', async () => {
      startSession()({ ...alice, emailVerified: false } as unknown as User);
      vi.mocked(reloadEmailVerified).mockResolvedValue(true);
      const session = useSessionStore();

      await expect(session.checkEmailVerified()).resolves.toBe(true);
      expect(session.user?.emailVerified).toBe(true);
    });

    it('leaves the user unverified when the reload says not yet', async () => {
      startSession()({ ...alice, emailVerified: false } as unknown as User);
      vi.mocked(reloadEmailVerified).mockResolvedValue(false);
      const session = useSessionStore();

      await expect(session.checkEmailVerified()).resolves.toBe(false);
      expect(session.user?.emailVerified).toBe(false);
    });

    it('drops the answer when the user changed while it ran', async () => {
      const listener = startSession();
      listener({ ...alice, emailVerified: false } as unknown as User);
      const bob = { ...alice, uid: 'bob', emailVerified: false };
      vi.mocked(reloadEmailVerified).mockImplementation(async () => {
        listener(bob as unknown as User);
        return true;
      });
      const session = useSessionStore();

      await expect(session.checkEmailVerified()).resolves.toBe(false);
      expect(session.user).toEqual(bob);
    });

    it('resends through the service, and the failure reaches the caller', async () => {
      startSession()({ ...alice, emailVerified: false } as unknown as User);
      const error = Object.assign(new Error('x'), { code: 'auth/too-many-requests' });
      vi.mocked(sendVerificationEmail).mockRejectedValue(error);

      await expect(useSessionStore().resendVerification()).rejects.toBe(error);
    });
  });
});
