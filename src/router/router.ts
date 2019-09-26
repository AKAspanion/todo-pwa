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
            component: () => import('@/views/Home.vue'),
            meta: {
                requireAuth: true,
                index: 1,
            },
        },
        {
            path: '/home',
            name: 'home',
            component: () => import('@/views/Home.vue'),
            meta: {
                requireAuth: true,
                index: 2,
            },
        },
        {
            path: '/about',
            name: 'about',
            component: () => import('@/views/About.vue'),
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
            path: '/login',
            name: 'login',
            component: () => import('@/views/Login.vue'),
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
    firebase.authChangeListener((user: any) => {
        store.dispatch("LOADING", false);
        if (to.matched.some((record: any) => record.meta.requireAuth)) {
            if (!user) {
                store.dispatch('UNSET_USER');
                store.dispatch('LOGOUT');
                const nextObject: any = {
                    path: '/login',
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
