import Vue from "vue";
import VueI18n from "vue-i18n";

Vue.use(VueI18n);

const requireContext = require.context("./", true, /\.json$/);
const messages: any = {};
requireContext.keys().forEach((key) => {
    const obj = requireContext(key);
    const lang = key.split("/")[1];
    if (!messages.hasOwnProperty(lang)) {
        messages[lang] = {};
    }
    messages[lang] = Object.assign(messages[lang], obj);
});

const i18n = new VueI18n({
    locale: "en",
    messages,
});

export default i18n;
