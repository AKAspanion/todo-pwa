import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

const store = new Vuex.Store({
    state: {
        snackBar: {
            model: false,
            text: '',
        },
        user: {
            uid: '',
            displayName: '',
            photoURL: '',
            email: '',
        },
        loading: false,
        isLoggedIn: false,
        isBarNav: false,
        tasksByStatus: {},
        tasks: [],
        types: [],
        landingVisited: false,
        notificationGrant: false,
        notifications: [],
    },
    mutations: {
        setSnackBar(state, payload) {
            state.snackBar = payload;
        },
        setLoading(state, payload) {
            state.loading = payload;
        },
        setUser(state, payload) {
            state.user = payload;
        },
        setLogin(state, payload) {
            state.isLoggedIn = payload;
        },
        setBarNav(state, payload) {
            state.isBarNav = payload;
        },
        setTasksByStatus(state, payload) {
            state.tasksByStatus = payload;
        },
        setTasks(state, payload) {
            state.tasks = payload;
        },
        setTypes(state, payload) {
            state.types = payload;
        },
        landingVisited(state, payload) {
            state.landingVisited = payload;
        },
        setNotifications(state, payload) {
            state.notifications = payload;
        },
        setNotificationGrant(state, payload) {
            state.notificationGrant = payload;
        },
    },
    actions: {
        RESET_STORE({ commit }) {
            commit('setTasksByStatus', {});
            commit('setTasks', []);
            commit('landingVisited', false);
            commit('setUser', {
                uid: '',
                displayName: '',
                photoURL: '',
                email: '',
            });
            commit('setLogin', false);
            localStorage.setItem('isLoggedIn', JSON.stringify(false));
        },
        SET_TASKS_BY_STATUS({ commit }, payload) {
            commit('setTasksByStatus', payload);
        },
        SET_TASKS({ commit }, payload) {
            commit('setTasks', payload);
        },
        SET_TYPES({ commit }, payload) {
            commit('setTypes', payload);
        },
        LANDING_VISITED({ commit }, payload) {
            commit('landingVisited', payload);
        },
        SHOW_SNACK({ commit }, payload) {
            commit('setSnackBar', {
                model: true,
                text: payload,
            });
        },
        LOADING({ commit }, payload) {
            commit('setLoading', payload);
        },
        SHOW_NAVBAR({ commit }, payload) {
            commit('setBarNav', payload);
        },
        SET_USER({ commit }, payload) {
            const { uid, displayName, photoURL, email } = payload;
            commit('setUser', {
                uid,
                email,
                displayName,
                photoURL,
            });
        },
        UNSET_USER({ commit }) {
            commit('setUser', {
                uid: '',
                displayName: '',
                photoURL: '',
                email: '',
            });
        },
        LOGIN({ commit }) {
            commit('setLogin', true);
            localStorage.setItem('isLoggedIn', JSON.stringify(true));
        },
        LOGOUT({ commit }) {
            commit('setLogin', false);
            localStorage.setItem('isLoggedIn', JSON.stringify(false));
        },
        SET_NOTIFICATIONS({ commit }, payload) {
            const sortedNotifications = payload.sort((notification1: any, notification2: any) => {
                const a = new Date(notification1.timestamp);
                const b = new Date(notification2.timestamp);
                if (a < b) {
                    return 1;
                }
                if (a > b) {
                    return -1;
                }
                return 0;
            });
            commit('setNotifications', sortedNotifications);
        },
        SET_NOTIFICATION_GRANT({ commit }, payload) {
            commit('setNotificationGrant', payload);
        },
    },
    getters: {
        snackBar(state) {
            return state.snackBar;
        },
        loading(state) {
            return state.loading;
        },
        barnav(state) {
            return state.isBarNav;
        },
        user(state) {
            return state.user;
        },
        loggedIn(state) {
            return state.isLoggedIn;
        },
        tasksByStatus(state) {
            return state.tasksByStatus;
        },
        tasks(state) {
            return state.tasks;
        },
        types(state) {
            return state.types;
        },
        landingVisited(state) {
            return state.landingVisited;
        },
        notifications(state) {
            return state.notifications;
        },
        notificationGrant(state) {
            return state.notificationGrant;
        },
    },
});

export default store;
