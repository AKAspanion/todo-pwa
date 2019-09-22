import Vue from 'vue';
import Router from 'vue-router';

import FirebaseWeb from '@/firebase';
const firebase = new FirebaseWeb();

Vue.use(Router);

const router = new Router({
    mode: 'history',
    base: process.env.BASE_URL,
    routes: [
        {
            path: '/',
            name: 'root',
            component: () => import('@/views/Home.vue'),
        },
        {
            path: '/home',
            name: 'home',
            component: () => import('@/views/Home.vue'),
        },
        {
            path: '/about',
            name: 'about',
            component: () => import('@/views/About.vue'),
        },
        {
            path: '/login',
            name: 'login',
            component: () => import('@/views/Login.vue'),
        },
    ],
});
router.beforeEach((to, from, next) => {
    if (!firebase.isAppInitialized()) {
        firebase.initializeFirebase();
    }
    firebase.authChangeListener((user: any) => {
        if (!user && to.path !== '/login') {
            next({
                path: '/login',
            });
        } else {
            next();
        }
    });
});

export default router;
