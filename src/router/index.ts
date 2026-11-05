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
  }
}

export const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/home' },
  { path: '/index', redirect: '/home' },
  {
    path: '/home',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { requireAuth: true, nav: 'home' },
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
    meta: { requireAuth: true, nav: 'profile' },
  },
  { path: '/signin', name: 'signin', component: () => import('@/views/SignInView.vue') },
  { path: '/signup', name: 'signup', component: () => import('@/views/SignUpView.vue') },
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
