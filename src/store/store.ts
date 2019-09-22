import Vue from "vue";
import Vuex from "vuex";

Vue.use(Vuex);

export default new Vuex.Store({
    state: {
        snackBar: {
            model: false,
            text: "",
        },
        loading: true,
    },
    mutations: {
        setSnackBar(state, payload) {
            state.snackBar = payload;
        },
        setLoading(state, payload) {
            state.loading = payload;
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
    },
    getters: {
        snackBar(state) {
            return state.snackBar;
        },
        loading(state) {
            return state.loading;
        },
    },
});
