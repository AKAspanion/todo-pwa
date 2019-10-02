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
                    <v-list min-width="300">
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
                    </v-list>
                </v-menu>
            </template>
        </topbar>
        <app-container>
            <v-card flat tile width="100%" class="px-7">
                <template v-if="tasksByStatus.hasOwnProperty('todo')">
                    <div class="overline text-left pb-3">Tasks</div>
                    <task-card-list :task-list="tasksByStatus['todo']" class="pb-4"></task-card-list>
                </template>
                <!-- <template v-for="(task) in tasksByStatus['todo']">
                    <div :key="task.id">
                        <div v-for="(item, index) in Object.keys(task)" :key="index">{{task[item]}}</div>
                    </div>
                </template>-->
                <template v-if="tasksByStatus.hasOwnProperty('done')">
                    <div class="overline text-left pb-3">done</div>

                    <task-card-list :task-list="tasksByStatus['done']" class="pb-4"></task-card-list>
                </template>

                <!-- <template v-for="(task) in tasksByStatus['done']">
                    <div :key="task.id">
                        <div v-for="(item, index) in Object.keys(task)" :key="index">{{task[item]}}</div>
                    </div>
                </template>-->
            </v-card>
        </app-container>
    </div>
</template>

<script lang="ts">
import Vue from "vue";
import FirebaseWeb from "../firebase";
const firebase = new FirebaseWeb();

import Topbar from "@/components/Topbar.vue";
import TaskCardList from "@/components/TaskCardList.vue";
import AppContainer from "@/components/AppContainer.vue";
// @ts-ignore
import {
    navigateToPath,
    getAllTasksForUser,
    getAllTaskTypes,
    parseTasksByStatus
} from "@/util";

export default Vue.extend({
    components: {
        Topbar,
        AppContainer,
        TaskCardList
    },
    data() {
        return {
            pageLoading: false,
            tasksByStatus: {},
            tasks: [],
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
    methods: {
        onSignoutClick() {
            this.logout();
        },
        logout() {
            firebase
                .signOut()
                .then(() => {
                    this.$store.dispatch("SHOW_SNACK", "Signout Succes!");
                })
                .catch(() => {
                    this.$store.dispatch(
                        "SHOW_SNACK",
                        "Error Signing out. Please try later!"
                    );
                });
        },
        loadPage() {
            return Promise.all([
                getAllTasksForUser(this.currentUser),
                getAllTaskTypes()
            ]);
        }
    },
    mounted() {
        if (!this.$store.getters.landingVisited) {
            this.pageLoading = true;
            this.loadPage()
                .then(response => {
                    this.$store.dispatch("SET_TASKS", response[0]);
                    this.$store.dispatch("SET_TYPES", response[1]);
                    this.$store.dispatch("LANDING_VISITED", true);
                    return parseTasksByStatus(response[0]);
                })
                .then((tasksByStatus: any) => {
                    this.$store.dispatch("SET_TASKS_BY_STATUS", tasksByStatus);
                    this.tasksByStatus = tasksByStatus;
                })
                .catch(err => {
                    this.$store.dispatch("SHOW_SNACK", err);
                })
                .then(() => {
                    this.pageLoading = false;
                });
        } else {
            this.tasksByStatus = this.$store.getters.tasksByStatus;
        }
    }
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