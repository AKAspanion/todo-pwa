<template>
    <v-menu z-index="50">
        <template #activator="{ on }">
            <v-btn icon v-on="on">
                <v-icon>mdi-dots-horizontal</v-icon>
            </v-btn>
        </template>
        <v-list min-width="300">
            <slot name="top-list-item"></slot>
            <v-subheader>{{$t('settings')}}</v-subheader>
            <v-list-item>
                <v-list-item-content class="text-left">
                    <v-list-item-title>{{$t('language.label')}}</v-list-item-title>
                </v-list-item-content>
                <v-list-item-action>
                    <v-btn-toggle v-model="$i18n.locale" mandatory class="lnl-lang-btn">
                        <v-btn
                            v-for="(lang, i) in langs"
                            :key="`Lang${i}`"
                            :value="lang"
                            small
                        >{{ lang }}</v-btn>
                    </v-btn-toggle>
                </v-list-item-action>
            </v-list-item>
            <v-list-item>
                <v-list-item-content class="text-left">
                    <v-list-item-title>{{$t('dark.mode')}}</v-list-item-title>
                </v-list-item-content>
                <v-list-item-action class="mr-2">
                    <v-switch v-model="themeModel"></v-switch>
                </v-list-item-action>
            </v-list-item>
            <v-list-item link @click="onSignoutClick">
                <v-list-item-content class="text-left">
                    <v-list-item-title>{{$t('signout')}}</v-list-item-title>
                </v-list-item-content>
                <v-list-item-avatar>
                    <v-avatar small size="36">
                        <v-icon>mdi-logout-variant</v-icon>
                    </v-avatar>
                </v-list-item-avatar>
            </v-list-item>
            <slot name="bottom-list-item"></slot>
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
        }
    },
    methods: {
        onSignoutClick() {
            this.logout();
        },
        logout() {
            firebase
                .signOut()
                .then(() => {
                    this.$store.dispatch("RESET_STORE");
                    this.$store.dispatch("SHOW_SNACK", "Signout Succes!");
                })
                .catch(() => {
                    this.$store.dispatch(
                        "SHOW_SNACK",
                        "Error Signing out. Please try later!"
                    );
                });
        }
    },
    mounted() {
        this.themeModel =
            localStorage.getItem("dark") == "false" ? false : true;
    }
});
</script>