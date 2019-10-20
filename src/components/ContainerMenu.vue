<template>
    <v-menu z-index="999" transition="scale-transition" origin="top right" min-width="348">
        <template #activator="{ on }">
            <v-btn icon v-on="on">
                <v-icon>mdi-dots-horizontal</v-icon>
            </v-btn>
        </template>
        <v-list>
            <slot name="top-list-item"></slot>
            <!-- TODO implement -->
            <v-subheader class="overline">{{$t('label.label')}}</v-subheader>
            <v-list-item link>
                <v-list-item-content class="text-left">
                    <v-list-item-title>{{$t('label.edit')}}</v-list-item-title>
                </v-list-item-content>
                <v-list-item-avatar>
                    <v-avatar small size="36">
                        <v-icon>mdi-pencil</v-icon>
                    </v-avatar>
                </v-list-item-avatar>
            </v-list-item>
            <v-subheader class="overline">{{$t('options')}}</v-subheader>
            <v-list-item>
                <v-list-item-content class="text-left">
                    <v-list-item-title>{{$t('dark.mode')}}</v-list-item-title>
                </v-list-item-content>
                <v-list-item-action class="mr-2">
                    <v-switch color="primary" v-model="themeModel"></v-switch>
                </v-list-item-action>
            </v-list-item>
            <v-list-item>
                <v-list-item-content class="text-left">
                    <v-list-item-title>{{$t('language.label')}}</v-list-item-title>
                </v-list-item-content>
                <v-list-item-action>
                    <v-btn-toggle v-model="langModel" mandatory class="lnl-lang-btn">
                        <v-btn
                            v-for="(lang, i) in langs"
                            :key="`Lang${i}`"
                            :value="lang"
                            small
                        >{{ lang }}</v-btn>
                    </v-btn-toggle>
                </v-list-item-action>
            </v-list-item>
            <v-subheader class="overline">{{$t('settings')}}</v-subheader>
            <v-list-item link @click="onSignoutClick">
                <v-list-item-content class="text-left">
                    <v-list-item-title>{{$t('sign-out')}}</v-list-item-title>
                </v-list-item-content>
                <v-list-item-avatar>
                    <v-avatar small size="36">
                        <v-icon>mdi-logout-variant</v-icon>
                    </v-avatar>
                </v-list-item-avatar>
            </v-list-item>
            <slot name="bottom-list-item"></slot>
            <v-divider class="mt-1"></v-divider>
            <v-list-item-content class="pt-5">
                <div class="text-center overline made-by">
                    made with
                    <span class="px-1">
                        <img src="../assets/heart-icon.png" />
                    </span> by
                    <span class="selectable" @click="routeToSpanion">ankit</span>
                </div>
            </v-list-item-content>
        </v-list>
    </v-menu>
</template>
<script lang="ts">
import Vue from "vue";
import FirebaseWeb from "../firebase";
const firebase = new FirebaseWeb();
export default Vue.extend({
    data() {
        return {
            langs: ["en", "hi"]
        };
    },
    computed: {
        themeModel: {
            get() {
                return this.$vuetify.theme.dark;
            },
            set(val: boolean) {
                this.$vuetify.theme.dark = val;
                localStorage.setItem(
                    "dark",
                    JSON.stringify(this.$vuetify.theme.dark)
                );
            }
        },
        langModel: {
            get() {
                return this.$i18n.locale;
            },
            set(val: string) {
                this.$i18n.locale = val;
                localStorage.setItem("lang", this.$i18n.locale);
            }
        }
    },
    methods: {
        onSignoutClick() {
            this.logout();
        },
        routeToSpanion() {},
        logout() {
            firebase
                .signOut()
                .then(() => {
                    this.$store.dispatch("RESET_STORE");
                    this.$store.dispatch(
                        "SHOW_SNACK",
                        this.$t("toast.success.sign-out")
                    );
                })
                .catch(() => {
                    this.$store.dispatch(
                        "SHOW_SNACK",
                        this.$t("toast.error.sign-out")
                    );
                });
        }
    },
    mounted() {
        this.langModel = localStorage.getItem("lang") == "hi" ? "hi" : "en";
        this.themeModel =
            localStorage.getItem("dark") == "false" ? false : true;
    }
});
</script>
<style scoped>
.made-by img {
    width: 12px;
    height: 12px;
    -webkit-animation: heartbeat 1s infinite ease;
    animation: heartbeat 1s infinite ease;
}
</style>