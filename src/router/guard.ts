import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router';

/**
 * Decides whether a navigation may go ahead: `true`, or where to go instead.
 * STUB until Task 4 implements sign-in: it allows every route.
 */
export async function authGuard(_to: RouteLocationNormalized): Promise<true | RouteLocationRaw> {
  return true;
}
