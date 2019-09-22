import Vue from 'vue';
import App from './App.vue';
import router from './router/router';
import store from './store/store';
import vuetify from './vuetify/vuetify';
import i18n from './i18n/i18n';
import './registerServiceWorker';

Vue.config.productionTip = false;

new Vue({
    vuetify,
    router,
    store,
    i18n,
    render: (h) => h(App),
}).$mount('#app');
