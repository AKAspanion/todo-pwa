import Vue from "vue";
import Vuex from "vuex";

Vue.use(Vuex);

export default new Vuex.Store({
    state: {
        snackBar: {
            model: false,
            text: "",
        },
    },
    mutations: {
        setSnackBar(state, payload) {
            state.snackBar = payload;
        },
    },
    actions: {
        SHOW_SNACK({ commit }, payload) {
            commit("setSnackBar", {
                model: true,
                text: payload,
            });
        },
    },
    getters: {
        snackBar(state) {
            return state.snackBar;
        },
    },
});
