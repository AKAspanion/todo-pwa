import Vue from 'vue';
import Router from 'vue-router';

import FirebaseWeb from '@/firebase';
const firebase = new FirebaseWeb();

import store from '@/store/store';

Vue.use(Router);

const router = new Router({
    mode: 'history',
    base: process.env.BASE_URL,
    routes: [
        {
            path: '/',
            name: 'root',
            component: () => import('@/views/TaskList.vue'),
            meta: {
                requireAuth: true,
                index: 1,
            },
        },
        {
            path: '/index',
            name: 'index',
            component: () => import('@/views/TaskList.vue'),
            meta: {
                requireAuth: true,
                index: 1,
            },
        },
        {
            path: '/home',
            name: 'home',
            component: () => import('@/views/TaskList.vue'),
            meta: {
                requireAuth: true,
                index: 2,
            },
        },
        {
            path: '/calendar',
            name: 'calendar',
            component: () => import('@/views/Calendar.vue'),
            meta: {
                requireAuth: true,
                index: 3,
            },
        },
        {
            path: '/add',
            name: 'add',
            component: () => import('@/views/TaskAdd.vue'),
            meta: {
                requireAuth: true,
                index: 4,
            },
        },
        {
            path: '/notification',
            name: 'notification',
            component: () => import('@/views/Notification.vue'),
            meta: {
                requireAuth: true,
                index: 5,
            },
        },
        {
            path: '/profile',
            name: 'profile',
            component: () => import('@/views/Profile.vue'),
            meta: {
                requireAuth: true,
                index: 6,
            },
        },
        {
            path: '*',
            name: 'notfound',
            redirect: '/',
            component: () => import('@/views/NotFound.vue'),
            meta: {
                requireAuth: true,
                index: 7,
            },
        },
        {
            path: '/signin',
            name: 'signin',
            component: () => import('@/views/Signin.vue'),
        },
        {
            path: '/signup',
            name: 'signup',
            component: () => import('@/views/Signup.vue'),
        },
    ],
});
if (!firebase.isAppInitialized()) {
    firebase.initializeFirebase();
}

// Single app-wide listener: keeps the store in sync and sends the user to sign-in
// when the session ends (sign-out, token revoked) while on a protected page.
firebase.authChangeListener((user: any) => {
    if (user) {
        store.dispatch('SET_USER', user);
        store.dispatch('LOGIN');
    } else {
        store.dispatch('UNSET_USER');
        store.dispatch('LOGOUT');
        if (router.currentRoute.matched.some((record: any) => record.meta.requireAuth)) {
            router.replace('/signin').catch(() => {
                // already navigating
            });
        }
    }
});

router.beforeEach((to, from, next) => {
    store.dispatch('LOADING', true);
    const requireAuth = to.matched.some((record: any) => record.meta.requireAuth);
    firebase.waitForAuthReady().then((user: any) => {
        store.dispatch('LOADING', false);
        if (requireAuth && !user) {
            next({ path: '/signin', query: { redirect: to.fullPath } });
        } else if (!requireAuth && user) {
            next({ path: '/home' });
        } else {
            // the nav bar also triggers the push-permission prompt, so only show it signed in
            store.dispatch('SHOW_NAVBAR', requireAuth);
            next();
        }
    });
});

export default router;
