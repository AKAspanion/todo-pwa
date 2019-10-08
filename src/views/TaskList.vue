<template>
    <div class="home">
        <bar-top>
            <template #left>
                <span class="subtitle-1">TASK</span>
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
        </bar-top>
        <container-app>
            <v-card flat tile width="100%" class="px-7">
                <div class="overline text-left pb-3">todo</div>
                <task-card-list
                    :task-list="tasksByStatus['todo']"
                    @check="onTaskCheck"
                    @delete="onTaskDelete"
                    :disabled="tasksUpdating"
                    :no-data-object="{title: 'No task todo', caption: 'Create a task and it will appear here'}"
                    class="pb-4"
                >
                    <template #no-data>
                        <v-btn
                            text
                            class="mt-2 font-weight-bold primary"
                            small
                            @click="navigateTo('/add')"
                        >Create</v-btn>
                    </template>
                </task-card-list>
                <div class="overline text-left pb-3">done</div>
                <task-card-list
                    :task-list="tasksByStatus['done']"
                    class="pb-4"
                    :disabled="tasksUpdating"
                    @delete="onTaskDelete"
                    @uncheck="onTaskUncheck"
                    :no-data-object="{title: 'No task done', caption: 'Complete a task and it will appear here'}"
                ></task-card-list>
            </v-card>
        </container-app>
    </div>
</template>

<script lang="ts">
import Vue from "vue";
import FirebaseWeb from "../firebase";
const firebase = new FirebaseWeb();

import BarTop from "@/components/BarTop.vue";
import TaskCardList from "@/components/TaskCardList.vue";
import ContainerApp from "@/components/ContainerApp.vue";
// @ts-ignore
import {
    navigateToPath,
    getAllTasksForUser,
    getAllTaskTypesForUser,
    updateTasks,
    deleteTasks,
    parseTasksByStatus
    // @ts-ignore
} from "@/util";

export default Vue.extend({
    components: {
        BarTop,
        ContainerApp,
        TaskCardList
    },
    data() {
        return {
            pageLoading: false,
            tasksUpdating: false,
            tasksByStatus: {
                todo: [],
                done: []
            },
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
        onTaskDelete(task: any) {
            this.deleteTask(task);
        },
        onTaskUncheck(task: any) {
            this.updateTasks(task.id, {
                status: "todo"
            });
        },
        onTaskCheck(task: any) {
            this.updateTasks(task.id, {
                status: "done"
            });
        },
        deleteTask(task: any) {
            this.tasksUpdating = true;
            this.$store.dispatch("LOADING", true);
            firebase
                .deleteTask(task)
                .then(() => {
                    return deleteTasks(task.id, this.$store.getters.tasks);
                })
                .then(tasks => {
                    this.$store.dispatch("SET_TASKS", tasks);
                    return parseTasksByStatus(tasks);
                })
                .then((tasksByStatus: any) => {
                    this.$store.dispatch("SET_TASKS_BY_STATUS", tasksByStatus);
                    this.tasksByStatus = tasksByStatus;
                    this.$store.dispatch("SHOW_SNACK", "Task deleted");
                })
                .catch(err => {
                    console.log(err.message);
                })
                .finally(() => {
                    this.tasksUpdating = false;
                    this.$store.dispatch("LOADING", false);
                });
        },
        updateTasks(taskId: any, updatedTask: any) {
            this.tasksUpdating = true;
            this.$store.dispatch("LOADING", true);
            firebase
                .updateTask(taskId, updatedTask)
                .then(() => {
                    return updateTasks(
                        taskId,
                        updatedTask,
                        this.$store.getters.tasks
                    );
                })
                .then(tasks => {
                    this.$store.dispatch("SET_TASKS", tasks);
                    return parseTasksByStatus(tasks);
                })
                .then((tasksByStatus: any) => {
                    this.$store.dispatch("SET_TASKS_BY_STATUS", tasksByStatus);
                    this.tasksByStatus = tasksByStatus;
                    this.$store.dispatch("SHOW_SNACK", "Task updated");
                })
                .catch(err => {
                    console.log(err.message);
                })
                .finally(() => {
                    this.tasksUpdating = false;
                    this.$store.dispatch("LOADING", false);
                });
        },
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
        },
        loadPage() {
            return Promise.all([
                getAllTasksForUser(this.currentUser),
                getAllTaskTypesForUser(this.currentUser)
            ]);
        },
        navigateTo(path: any) {
            navigateToPath(path);
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