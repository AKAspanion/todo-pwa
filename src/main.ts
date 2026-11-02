import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { i18n } from './plugins/i18n';
import { vuetify } from './plugins/vuetify';
import { router } from './router';

document.documentElement.lang = i18n.global.locale.value;

createApp(App).use(createPinia()).use(router).use(i18n).use(vuetify).mount('#app');
