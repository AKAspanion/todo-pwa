import Vue from "vue";
import Vuex from "vuex";

Vue.use(Vuex);

const store = new Vuex.Store({
    state: {
        snackBar: {
            model: false,
            text: "",
        },
        user: {
            uid: '',
            displayName: '',
            photoURL: '',
            email: '',
        },
        loading: false,
        isLoggedIn: false,
        isNavbar: false,
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
        setNavbar(state, payload) {
            state.isNavbar = payload;
        },
    },
    actions: {
        SHOW_SNACK({ commit }, payload) {
            commit("setSnackBar", {
                model: true,
                text: payload,
            });
        },
        LOADING({ commit }, payload) {
            commit("setLoading", payload);
        },
        SHOW_NAVBAR({ commit }, payload) {
            commit("setNavbar", payload);
        },
        SET_USER({ commit }, payload) {
            const { uid, displayName, photoURL, email } = payload;
            commit("setUser", {
                uid,
                email,
                displayName,
                photoURL,
            });
        },
        UNSET_USER({ commit }) {
            commit("setUser", {
                uid: '',
                displayName: '',
                photoURL: '',
                email: '',
            });
        },
        LOGIN({ commit }) {
            commit("setLogin", true);
            localStorage.setItem('isLoggedIn', JSON.stringify(true));
        },
        LOGOUT({ commit }) {
            commit("setLogin", false);
            localStorage.setItem('isLoggedIn', JSON.stringify(false));
        },
    },
    getters: {
        snackBar(state) {
            return state.snackBar;
        },
        loading(state) {
            return state.loading;
        },
        navbar(state) {
            return state.isNavbar;
        },
        user(state) {
            return state.user;
        },
        loggedIn(state) {
            return state.isLoggedIn;
        },
    },
});

export default store;
