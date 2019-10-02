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
            path: '/home',
            name: 'home',
            component: () => import('@/views/TaskList.vue'),
            meta: {
                requireAuth: true,
                index: 2,
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
            path: '/profile',
            name: 'profile',
            component: () => import('@/views/Profile.vue'),
            meta: {
                requireAuth: true,
                index: 4,
            },
        },
        {
            path: '*',
            name: 'notfound',
            component: () => import('@/views/NotFound.vue'),
            meta: {
                requireAuth: true,
                index: 4,
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
router.beforeEach((to, from, next) => {
    if (!firebase.isAppInitialized()) {
        firebase.initializeFirebase();
    }
    store.dispatch("LOADING", true);
    if (to.name == 'signin' || to.name == 'signup') {
        store.dispatch("SHOW_NAVBAR", false);
    }
    firebase.authChangeListener((user: any) => {
        store.dispatch("LOADING", false);
        if (to.matched.some((record: any) => record.meta.requireAuth)) {
            store.dispatch("SHOW_NAVBAR", true);
            if (!user) {
                store.dispatch('UNSET_USER');
                store.dispatch('LOGOUT');
                const nextObject: any = {
                    path: '/signin',
                    redirect: from.fullPath,
                };
                next(nextObject);
            } else {
                store.dispatch('SET_USER', user);
                store.dispatch('LOGIN');
                next();
            }
        } else {
            if (localStorage.getItem('isLoggedIn') === 'true') {
                next({
                    path: '/home',
                });
            } else {
                next();
            }
        }
    });
});

export default router;
