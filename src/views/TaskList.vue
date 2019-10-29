<template>
    <div class="home">
        <bar-top dark primary>
            <template #left>
                <v-avatar>
                    <v-icon>mdi-check-all</v-icon>
                </v-avatar>
            </template>
            <template #center>
                <v-chip small outlined>{{$t('home.label')}}</v-chip>
            </template>
            <template #right>
                <container-menu></container-menu>
            </template>
        </bar-top>
        <container-app
            coloured
            elevated-bg
            :bg-height="$vuetify.breakpoint.xsOnly ?'124px':'132px'"
        >
            <div :class="$vuetify.breakpoint.xsOnly ? '':'mx-3 mb-2'">
                <v-card-title class="py-1 white--text">
                    <div
                        v-if="pageLoading"
                        class="shimmer light--animate mr-1"
                        style="width: 13px;height: 20px;"
                    ></div>
                    <span v-else class="mr-1">{{todoListLength}}</span>
                    {{todoListLength != 1 ? $t("task.plural"):$t("task.singular")}}
                    {{calendarDate}}
                </v-card-title>
            </div>
            <bar-date
                :loading="pageLoading"
                :refresh="refreshDates"
                v-model="selectedDate"
                @after-refresh="refreshDates = false"
                :class="$vuetify.breakpoint.xsOnly ? 'mx-1 mb-6':'mx-4 mb-8'"
            ></bar-date>
            <div style="width: 100%" :class="$vuetify.breakpoint.xsOnly ? 'px-3':'px-4'">
                <v-layout
                    row
                    align-center
                    justify-space-between
                    class="ma-0 pb-1"
                    :class="$vuetify.breakpoint.xsOnly ? 'px-1':'px-3'"
                >
                    <div class="overline text-left">{{$t('todo')}}</div>
                    <v-btn
                        icon
                        class="mr-n2"
                        @click="compact = !compact"
                        v-if="$vuetify.breakpoint.xsOnly"
                    >
                        <v-icon v-if="compact">mdi-view-agenda</v-icon>
                        <v-icon v-else>mdi-view-grid</v-icon>
                    </v-btn>
                </v-layout>
                <task-card-grid
                    :compact="compact"
                    :task-list="todoList"
                    :loading="pageLoading"
                    @edit="onTaskEdit"
                    @check="onTaskCheck"
                    @delete="onTaskDelete"
                    :disabled="tasksUpdating"
                    :no-data-object="{
                        title: $t('no-task.todo.title'), 
                        caption: $t('no-task.todo.caption')
                    }"
                    class="pb-4"
                >
                    <template #no-data>
                        <v-btn
                            text
                            class="mt-2 font-weight-bold primary"
                            small
                            @click="navigateTo('/add')"
                        >{{$t('create')}}</v-btn>
                    </template>
                </task-card-grid>
                <div
                    class="overline text-left pb-3"
                    :class="$vuetify.breakpoint.xsOnly ? 'px-1':'px-3'"
                >{{$t('done')}}</div>
                <task-card-grid
                    :compact="compact"
                    :task-list="doneList"
                    class="pb-4"
                    :loading="pageLoading"
                    :disabled="tasksUpdating"
                    @delete="onTaskDelete"
                    @uncheck="onTaskUncheck"
                    :no-data-object="{
                        title: $t('no-task.done.title'), 
                        caption: $t('no-task.done.caption')
                    }"
                ></task-card-grid>
            </div>
        </container-app>
    </div>
</template>

<script lang="ts">
import Vue from "vue";
import FirebaseWeb from "../firebase";
const firebase = new FirebaseWeb();

import BarTop from "@/components/BarTop.vue";
import BarDate from "@/components/BarDate.vue";
import TaskCardGrid from "@/components/TaskCardGrid.vue";
import ContainerApp from "@/components/ContainerApp.vue";
import ContainerMenu from "@/components/ContainerMenu.vue";
// @ts-ignore
import {
    navigateToPath,
    getAllTasksForUser,
    getAllTaskTypesForUser,
    getAllNotificationsForUser,
    updateTasks,
    deleteTasks,
    getMomentDate,
    getCalendarDate,
    parseTasksByStatus
    // @ts-ignore
} from "@/util";

// @ts-ignores
export default Vue.extend({
    components: {
        BarTop,
        BarDate,
        ContainerApp,
        ContainerMenu,
        TaskCardGrid
    },
    data() {
        return {
            selectedDate: getMomentDate(new Date()).substr(0, 10),
            pageLoading: false,
            refreshDates: false,
            tasksUpdating: false,
            tasksByStatus: {
                todo: [],
                done: []
            },
            compact: true
        };
    },
    watch: {
        "$i18n.locale": {
            handler(newValue) {
                // @ts-ignore
                this.refreshDates = true;
            }
        },
        deep: true
    },
    computed: {
        currentUser() {
            // @ts-ignore
            return this.$store.getters.user;
        },
        isSelectedDateValid() {
            // @ts-ignore
            return !this.selectedDate || this.selectedDate == "";
        },
        todoList() {
            if (this.isSelectedDateValid) {
                // @ts-ignore
                return this.tasksByStatus["todo"];
            } else {
                // @ts-ignore
                return this.tasksByStatus["todo"].filter(
                    // @ts-ignore
                    task => task.date == this.selectedDate || task.indefinite
                );
            }
        },
        doneList() {
            // @ts-ignore
            if (this.isSelectedDateValid) {
                // @ts-ignore
                return this.tasksByStatus["done"];
            } else {
                // @ts-ignore
                return this.tasksByStatus["done"].filter(
                    // @ts-ignore
                    task => task.date == this.selectedDate || task.indefinite
                );
            }
        },
        todoListLength() {
            // @ts-ignore
            return this.todoList ? this.todoList.length : 0;
        },
        calendarDate() {
            let date = getCalendarDate(this.selectedDate).toLowerCase();
            if (date.includes("invalid")) {
                // @ts-ignore
                return this.$t("todo").toLowerCase();
            } else {
                // @ts-ignore
                if (this.$i18n.locale != "en") {
                    if (date.includes("कल") || date.includes("आज")) {
                        return date.substr(0, date.length - 14);
                    }
                    if (date.includes(":")) {
                        date = date.substr(0, date.length - 15);
                    }
                    return date + " को";
                } else {
                    if (
                        !(
                            date.includes("tomorrow") ||
                            date.includes("yesterday") ||
                            date.includes("today") ||
                            date.includes("last")
                        )
                    ) {
                        date = " on " + date;
                    }
                    if (date.includes(":")) {
                        return date.substr(0, date.length - 11);
                    } else {
                        return date;
                    }
                }
            }
        }
    },
    methods: {
        onTaskEdit(task: any) {
            // @ts-ignore
            if (this.isTaskValid(task)) {
                let { title, date, time, status, description, type } = task;
                // @ts-ignore
                this.updateTasks(task.id, {
                    title,
                    date,
                    time,
                    status,
                    description,
                    type
                });
            } else {
                this.$store.dispatch(
                    "SHOW_SNACK",
                    this.$t("toast.error.task.invalid")
                );
            }
        },
        onTaskDelete(task: any) {
            // @ts-ignore
            this.deleteTask(task);
        },
        onTaskUncheck(task: any) {
            // @ts-ignore
            this.updateTasks(task.id, {
                status: "todo"
            });
        },
        onTaskCheck(task: any) {
            // @ts-ignore
            this.updateTasks(task.id, {
                status: "done"
            });
        },
        deleteTask(task: any) {
            // @ts-ignore
            this.tasksUpdating = true;
            this.$store.dispatch("LOADING", true);
            firebase
                .deleteTask(task)
                .then(() => {
                    return deleteTasks(task.id, this.$store.getters.tasks);
                })
                .then((tasks: any) => {
                    this.$store.dispatch("SET_TASKS", tasks);
                    return parseTasksByStatus(tasks);
                })
                .then((tasksByStatus: any) => {
                    this.$store.dispatch("SET_TASKS_BY_STATUS", tasksByStatus);
                    // @ts-ignore
                    this.tasksByStatus = tasksByStatus;
                    this.$store.dispatch(
                        "SHOW_SNACK",
                        this.$t("toast.success.task.delete")
                    );
                })
                .catch((err: any) => {
                    this.$store.dispatch(
                        "SHOW_SNACK",
                        this.$t("toast.error.task.delete")
                    );
                })
                .finally(() => {
                    // @ts-ignore
                    this.tasksUpdating = false;
                    this.$store.dispatch("LOADING", false);
                });
        },
        updateTasks(taskId: any, updatedTask: any) {
            // @ts-ignore
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
                    // @ts-ignore
                    this.tasksByStatus = tasksByStatus;
                    this.$store.dispatch(
                        "SHOW_SNACK",
                        this.$t("toast.success.task.edit")
                    );
                })
                .catch(err => {
                    this.$store.dispatch(
                        "SHOW_SNACK",
                        this.$t("toast.error.task.edit")
                    );
                })
                .finally(() => {
                    // @ts-ignore
                    this.tasksUpdating = false;
                    this.$store.dispatch("LOADING", false);
                });
        },
        loadPage() {
            return Promise.all([
                // @ts-ignore
                getAllTasksForUser(this.currentUser),
                // @ts-ignore
                getAllTaskTypesForUser(this.currentUser),
                // @ts-ignore
                getAllNotificationsForUser(this.currentUser)
            ]);
        },
        navigateTo(path: any) {
            navigateToPath(path);
        },
        isTaskValid(task: any) {
            return task.title.trim() !== "";
        }
    },
    mounted() {
        if (!this.$store.getters.landingVisited) {
            this.pageLoading = true;
            this.loadPage()
                .then((response: any) => {
                    // @ts-ignore
                    this.$store.dispatch("SET_TASKS", response[0]);
                    // @ts-ignore
                    this.$store.dispatch("SET_TYPES", response[1]);
                    // @ts-ignore
                    this.$store.dispatch("SET_NOTIFICATIONS", response[2]);
                    // @ts-ignore
                    this.$store.dispatch("LANDING_VISITED", true);
                    return parseTasksByStatus(response[0]);
                })
                .then((tasksByStatus: any) => {
                    // @ts-ignore
                    this.$store.dispatch("SET_TASKS_BY_STATUS", tasksByStatus);
                    this.tasksByStatus = tasksByStatus;
                })
                .catch((err: any) => {
                    // @ts-ignore
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