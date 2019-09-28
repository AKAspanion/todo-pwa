<template>
    <div class="home">
        <topbar>
            <template #left>
                <span class="subtitle-1">TODO</span>
            </template>
            <template #center>
                <v-chip small outlined>{{$t('home.label')}}</v-chip>
            </template>
            <template #right>
                <v-menu z-index="50">
                    <template #activator="{ on }">
                        <v-btn icon v-on="on">
                            <v-icon>mdi-dots-horizontal</v-icon>
                        </v-btn>
                    </template>
                    <v-list>
                        <v-list-item>
                            <v-list-item-content class="text-left">
                                <v-list-item-title>{{themeModel? $t('light.label'): $t('dark.label')}}</v-list-item-title>
                                <v-list-item-subtitle>{{themeModel? $t('light.toggle'): $t('dark.toggle')}}</v-list-item-subtitle>
                            </v-list-item-content>
                            <v-list-item-action>
                                <v-switch v-model="themeModel"></v-switch>
                            </v-list-item-action>
                        </v-list-item>
                        <v-list-item>
                            <v-list-item-content class="text-left">
                                <v-list-item-title>{{$t('language.label')}}</v-list-item-title>
                                <v-list-item-subtitle>{{$t('language.change')}}</v-list-item-subtitle>
                            </v-list-item-content>
                            <v-list-item-action>
                                <v-btn-toggle
                                    v-model="$i18n.locale"
                                    mandatory
                                    rounded
                                    class="lnl-lang-btn"
                                >
                                    <v-btn
                                        v-for="(lang, i) in langs"
                                        :key="`Lang${i}`"
                                        :value="lang"
                                    >{{ lang }}</v-btn>
                                </v-btn-toggle>
                            </v-list-item-action>
                        </v-list-item>
                    </v-list>
                </v-menu>
            </template>
        </topbar>
        <app-container></app-container>
    </div>
</template>

<script lang="ts">
import Vue from "vue";
import FirebaseWeb from "../firebase";
const firebase = new FirebaseWeb();

import Topbar from "@/components/Topbar.vue";
import AppContainer from "@/components/AppContainer.vue";
import { navigateToPath } from "@/util";

export default Vue.extend({
    components: {
        Topbar,
        AppContainer
    },
    data() {
        return {
            langs: ["en", "hi"]
        };
    },
    computed: {
        currentUser() {
            return this.$store.getters.user;
        },
        themeModel: {
            get() {
                return this.$vuetify.theme.dark;
            },
            set(val: boolean) {
                this.$vuetify.theme.dark = val;
            }
        }
    },
    methods: {},
    mounted() {}
});
</script>
<style scoped>
.content-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
}
.content-bg {
    width: 100%;
    height: 200px;
    position: absolute;
    z-index: 10;
    background: #1976d2;
    border-bottom-right-radius: 28px;
    border-bottom-left-radius: 28px;
    top: 0;
    left: 0;
}
.content {
    position: absolute;
    z-index: 12;
}
</style>