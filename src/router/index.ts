import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { authGuard } from './guard';

/** The bottom-navigation tab a route belongs to. */
export type NavTab = 'home' | 'calendar' | 'add' | 'notification' | 'profile';

declare module 'vue-router' {
  interface RouteMeta {
    /** Signed-out visitors are sent to sign in first (enforced by authGuard). */
    requireAuth?: boolean;
    /** The tab the bottom navigation marks active on this route; none hides the navigation. */
    nav?: NavTab;
    /**
     * Where the verify-email banner shows to an unverified user: `always`, or `dismissible` until
     * dismissed, then again after 7 days (decisions/email-verification-reminder). Elsewhere, never.
     */
    verifyBanner?: 'always' | 'dismissible';
  }
}

export const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/home' },
  { path: '/index', redirect: '/home' },
  {
    path: '/home',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { requireAuth: true, nav: 'home', verifyBanner: 'dismissible' },
  },
  {
    path: '/calendar',
    name: 'calendar',
    component: () => import('@/views/CalendarView.vue'),
    meta: { requireAuth: true, nav: 'calendar' },
  },
  {
    path: '/add',
    name: 'add',
    component: () => import('@/views/TaskAddView.vue'),
    meta: { requireAuth: true, nav: 'add' },
  },
  {
    path: '/notification',
    name: 'notification',
    component: () => import('@/views/NotificationsView.vue'),
    meta: { requireAuth: true, nav: 'notification' },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { requireAuth: true, nav: 'profile', verifyBanner: 'always' },
  },
  { path: '/signin', name: 'signin', component: () => import('@/views/SignInView.vue') },
  { path: '/signup', name: 'signup', component: () => import('@/views/SignUpView.vue') },
  // decisions/password-reset: the email typed on sign-in arrives in history state, never the URL.
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/views/ForgotPasswordView.vue'),
  },
  // decisions/password-reset: the reset email's link lands here with `mode` and `oobCode`. Open to
  // everyone, signed in or not, so a link opened on a signed-in device still works: not a
  // signed-out path (guard.ts), and no meta.
  //
  // The console's action URL is one setting for every Auth email, so a verification link lands here
  // too, with `mode=verifyEmail`: it is handed to /verify-email, query and all.
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('@/views/ResetPasswordView.vue'),
    beforeEnter: (to) =>
      to.query.mode === 'verifyEmail' ? { path: '/verify-email', query: to.query } : true,
  },
  // decisions/email-verification-reminder: the verification email's link, open to everyone, signed
  // in or not, like /reset-password.
  {
    path: '/verify-email',
    name: 'verify-email',
    component: () => import('@/views/VerifyEmailView.vue'),
  },
  // W1: public to anyone, signed in or not; no meta, so neither the menu nor the bottom bar shows.
  { path: '/privacy', name: 'privacy', component: () => import('@/views/PrivacyView.vue') },
  {
    path: '/delete-account',
    name: 'delete-account',
    component: () => import('@/views/DeleteAccountInfoView.vue'),
  },
  { path: '/:pathMatch(.*)*', redirect: '/home' },
];

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach((to) => authGuard(to));
