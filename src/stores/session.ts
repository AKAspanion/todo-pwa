import type { User } from 'firebase/auth';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { deleteCurrentUser } from '@/services/account';
import { onUserChanged, signOutUser } from '@/services/auth';
import type { SessionUser } from '@/types/models';
import { useLabelsStore } from './labels';
import { useNotificationsStore } from './notifications';
import { useTasksStore } from './tasks';
import { useUiStore } from './ui';

export type SignOutHook = () => Promise<void> | void;

function toSessionUser(u: User): SessionUser {
  return { uid: u.uid, email: u.email, displayName: u.displayName, photoURL: u.photoURL };
}

/** Firebase errors carry a `code`; anything else is logged by its name only, never its message. */
export function errorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) return String(error.code);
  return error instanceof Error ? error.name : typeof error;
}

/** The signed-in user's uid, or null. */
export function currentUid(): string | null {
  return useSessionStore().user?.uid ?? null;
}

/** The signed-in user's uid; throws Error('auth/not-signed-in') when nobody is. */
export function requireUid(): string {
  const uid = currentUid();
  if (!uid) throw new Error('auth/not-signed-in');
  return uid;
}

/**
 * The signed-in user, sign-out and account deletion. Signing out, deleting the account, or
 * Firebase reporting another user (or none), clears every per-user store, so the next account
 * never sees the last one's data (D13).
 */
export const useSessionStore = defineStore('session', () => {
  const user = ref<SessionUser | null>(null);
  const ready = ref(false);
  const signOutHooks: SignOutHook[] = [];
  let stopListening: (() => void) | null = null;

  function clearPerUserState(): void {
    useTasksStore().$reset();
    useLabelsStore().$reset();
    useNotificationsStore().$reset();
    // The ui store's reset clears only the snack; language and theme belong to the device.
    useUiStore().$reset();
  }

  /** Follows Firebase's signed-in user. Calling it again does nothing. */
  function start(): void {
    if (stopListening) return;
    stopListening = onUserChanged((u) => {
      const previous = user.value;
      if (previous && previous.uid !== u?.uid) clearPerUserState();
      user.value = u ? toSessionUser(u) : null;
      ready.value = true;
    });
  }

  /** Registers work to do while still signed in, before sign-out (such as deleting a device token). */
  function onSignOut(hook: SignOutHook): void {
    if (!signOutHooks.includes(hook)) signOutHooks.push(hook);
  }

  /**
   * Runs every sign-out hook in turn; a failing hook is logged by code and doesn't stop the rest.
   */
  async function runSignOutHooks(): Promise<void> {
    for (const hook of signOutHooks) {
      try {
        await hook();
      } catch (error) {
        console.warn('[session] a sign-out hook failed:', errorCode(error));
      }
    }
  }

  /**
   * Runs the sign-out hooks, signs out, then clears all per-user state. If signing out itself
   * fails, nothing is cleared and the error reaches the caller.
   */
  async function signOut(): Promise<void> {
    await runSignOutHooks();
    await signOutUser();
    clearPerUserState();
    user.value = null;
  }

  /**
   * D5: runs the sign-out hooks while still signed in (they turn push off for this browser),
   * deletes the Firebase Auth user, then clears every per-user store and the user. If the delete
   * fails (`auth/requires-recent-login`, say), nothing is cleared and the error reaches the caller.
   */
  async function deleteAccount(): Promise<void> {
    await runSignOutHooks();
    await deleteCurrentUser();
    clearPerUserState();
    user.value = null;
  }

  return { user, ready, start, signOut, onSignOut, runSignOutHooks, deleteAccount };
});
