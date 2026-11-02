import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router';
import { waitForAuthReady } from '@/services/auth';
import { errorCode, useSessionStore } from '@/stores/session';

const HOME = '/home';
/** The screens only a signed-out visitor needs: never a place to return to after signing in. */
const SIGNED_OUT_PATHS = new Set(['/signin', '/signup']);
/** A dummy origin to resolve a redirect against: anything that leaves it leaves the app. */
const IN_APP_ORIGIN = 'http://app.invalid';
/** Longer than any path the app has; a longer `redirect` is someone else's. */
const MAX_REDIRECT_LENGTH = 2048;

/**
 * Where to go after signing in, from the untrusted `redirect` query: an in-app path (with its
 * query and hash), normalised, or `/home` when it is missing, points off the app, or points back
 * at sign-in or sign-up.
 */
export function safeRedirect(value: unknown): string {
  if (typeof value !== 'string' || value === '') return HOME;
  let url: URL | null = null;
  if (value.length <= MAX_REDIRECT_LENGTH && value.startsWith('/')) {
    try {
      url = new URL(value, IN_APP_ORIGIN);
    } catch {
      url = null;
    }
  }
  // `//host`, `/\host` and paths with tabs or newlines resolve to another origin: rejected here.
  if (!url || url.origin !== IN_APP_ORIGIN || SIGNED_OUT_PATHS.has(url.pathname)) {
    console.warn('[auth] ignored an unsafe redirect');
    return HOME;
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Whether someone is signed in, once Firebase has restored the last session (or found none). */
async function isSignedIn(): Promise<boolean> {
  useSessionStore().start();
  try {
    return (await waitForAuthReady()) !== null;
  } catch (error) {
    console.error('[auth] could not restore the session:', errorCode(error));
    return false;
  }
}

/**
 * Decides whether a navigation may go ahead: `true`, or where to go instead. A signed-out visit
 * to a `requireAuth` route goes to sign in, remembering the page (§3.1); a signed-in visit to
 * sign-in or sign-up goes to that remembered page, or `/home`.
 */
export async function authGuard(to: RouteLocationNormalized): Promise<true | RouteLocationRaw> {
  const signedIn = await isSignedIn();
  if (to.meta.requireAuth) {
    return signedIn ? true : { path: '/signin', query: { redirect: to.fullPath } };
  }
  if (signedIn && SIGNED_OUT_PATHS.has(to.path)) return safeRedirect(to.query.redirect);
  return true;
}
