<template>
    <div class="home">
        <bar-top dark primary>
            <template #left>
                <v-avatar>
                    <v-icon>
                        mdi-check-all
                    </v-icon>
                </v-avatar>
            </template>
            <template #center>
                <v-chip small outlined>{{ $t('home.label') }}</v-chip>
            </template>
            <template #right>
                <container-menu></container-menu>
            </template>
        </bar-top>
        <container-app
            coloured
            elevated-bg
            :bg-height="$vuetify.breakpoint.xsOnly ? '124px' : '132px'"
        >
            <div :class="$vuetify.breakpoint.xsOnly ? '' : 'mx-3 mb-2'">
                <v-card-title class="py-1 white--text">
                    <div
                        v-if="pageLoading"
                        class="shimmer light--animate mr-1"
                        style="width: 13px;height: 20px;"
                    ></div>
                    <span v-else class="mr-1">{{ todoListLength }}</span>
                    {{
                        todoListLength != 1
                            ? $t('task.plural')
                            : $t('task.singular')
                    }}
                    {{ calendarDate }}
                </v-card-title>
            </div>
            <bar-date
                :loading="pageLoading"
                :refresh="refreshDates"
                v-model="selectedDate"
                @after-refresh="refreshDates = false"
                :class="$vuetify.breakpoint.xsOnly ? 'mx-1 mb-6' : 'mx-4 mb-8'"
            ></bar-date>
            <div
                style="width: 100%"
                :class="$vuetify.breakpoint.xsOnly ? 'px-3' : 'px-4'"
            >
                <v-row no-gutters class="ma-0">
                    <v-col cols="12" md="6" class="pa-0">
                        <div
                            class="overline text-left"
                            :class="
                                $vuetify.breakpoint.xsOnly ? 'px-1' : 'px-3'
                            "
                        >
                            {{ $t('todo') }}
                        </div>
                        <task-card-grid
                            class="pa-3 pb-6"
                            :task-list="todoList"
                            :loading="pageLoading"
                            :disabled="tasksUpdating"
                            @edit="onTaskEdit"
                            @check="onTaskCheck"
                            @delete="onTaskDelete"
                            @change="onTaskGridChange"
                            :no-data-object="{
                                title: $t('no-task.todo.title'),
                                caption: $t('no-task.todo.caption'),
                            }"
                        >
                            <template #no-data>
                                <v-btn
                                    text
                                    class="mt-2 font-weight-bold primary"
                                    small
                                    @click="navigateTo('/add')"
                                    >{{ $t('create') }}</v-btn
                                >
                            </template>
                        </task-card-grid>
                    </v-col>
                    <v-col cols="12" md="6" class="pa-0">
                        <div
                            class="overline text-left"
                            :class="
                                $vuetify.breakpoint.xsOnly ? 'px-1' : 'px-3'
                            "
                        >
                            {{ $t('done') }}
                        </div>
                        <task-card-grid
                            class="pa-3 pb-6"
                            :task-list="doneList"
                            :loading="pageLoading"
                            :disabled="tasksUpdating"
                            @delete="onTaskDelete"
                            @uncheck="onTaskUncheck"
                            @change="onTaskGridChange"
                            :no-data-object="{
                                title: $t('no-task.done.title'),
                                caption: $t('no-task.done.caption'),
                            }"
                        ></task-card-grid>
                    </v-col>
                </v-row>
            </div>
        </container-app>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import FirebaseWeb from '../firebase';
const firebase = new FirebaseWeb();

import BarTop from '@/components/BarTop.vue';
import BarDate from '@/components/BarDate.vue';
import TaskCardGrid from '@/components/TaskCardGrid.vue';
import ContainerApp from '@/components/ContainerApp.vue';
import ContainerMenu from '@/components/ContainerMenu.vue';
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
    getTasksByStatus,
    // @ts-ignore
} from '@/util';

// @ts-ignores
export default Vue.extend({
    components: {
        BarTop,
        BarDate,
        ContainerApp,
        ContainerMenu,
        TaskCardGrid,
    },
    data() {
        return {
            selectedDate: getMomentDate(new Date()).substr(0, 10),
            pageLoading: false,
            refreshDates: false,
            tasksUpdating: false,
        };
    },
    watch: {
        '$i18n.locale': {
            handler(newValue) {
                // @ts-ignore
                this.refreshDates = true;
            },
            deep: true,
        },
    },
    computed: {
        currentUser() {
            // @ts-ignore
            return this.$store.getters.user;
        },
        isSelectedDateValid() {
            // @ts-ignore
            return !this.selectedDate || this.selectedDate == '';
        },
        tasksByStatus() {
            return getTasksByStatus(this.$store.getters.tasks);
        },
        todoList() {
            if (this.isSelectedDateValid) {
                // @ts-ignore
                return this.tasksByStatus['todo'];
            } else {
                // @ts-ignore
                return this.tasksByStatus['todo'].filter(
                    // @ts-ignore
                    (task) => task.date == this.selectedDate || task.indefinite
                );
            }
        },
        doneList() {
            // @ts-ignore
            return this.tasksByStatus['done'];
        },
        todoListLength() {
            // @ts-ignore
            return this.todoList ? this.todoList.length : 0;
        },
        calendarDate() {
            // @ts-ignore
            let date = getCalendarDate(this.selectedDate).toLowerCase();
            if (date.includes('invalid')) {
                // @ts-ignore
                return this.$t('todo').toLowerCase();
            } else {
                // @ts-ignore
                if (this.$i18n.locale != 'en') {
                    if (date.includes('कल') || date.includes('आज')) {
                        return date.substr(0, date.length - 14);
                    }
                    if (date.includes(':')) {
                        date = date.substr(0, date.length - 15);
                    }
                    return date + ' को';
                } else {
                    if (
                        !(
                            date.includes('tomorrow') ||
                            date.includes('yesterday') ||
                            date.includes('today') ||
                            date.includes('last')
                        )
                    ) {
                        date = ' on ' + date;
                    }
                    if (date.includes(':')) {
                        return date.substr(0, date.length - 11);
                    } else {
                        return date;
                    }
                }
            }
        },
    },
    methods: {
        onTaskEdit(task: any) {
            // @ts-ignore
            if (this.isTaskValid(task)) {
                let newTask = {
                    ...task,
                    time: task.indefinite ? 'NA' : task.time,
                    date: task.indefinite ? 'NA' : task.date,
                };
                // @ts-ignore
                this.updateTasks(task.id, newTask);
            } else {
                this.$store.dispatch(
                    'SHOW_SNACK',
                    this.$t('toast.error.task.invalid')
                );
            }
        },
        onTaskGridChange(change: any) {
            let event = Object.keys(change)[0];
            switch (event) {
                case 'added':
                    switch (change[event].element.status) {
                        case 'todo':
                            this.onTaskCheck(
                                change[event].element,
                                change[event].newIndex
                            );
                            break;
                        case 'done':
                            this.onTaskUncheck(
                                change[event].element,
                                change[event].newIndex
                            );
                            break;
                        default:
                            break;
                    }
                    break;
                default:
                    break;
            }
        },
        onTaskDelete(task: any) {
            // @ts-ignore
            this.deleteTask(task);
        },
        onTaskUncheck(task: any, index: any) {
            // @ts-ignore
            this.updateTasks(
                task.id,
                {
                    status: 'todo',
                },
                index
            );
        },
        onTaskCheck(task: any, index: any) {
            // @ts-ignore
            this.updateTasks(
                task.id,
                {
                    status: 'done',
                },
                index
            );
        },
        deleteTask(task: any) {
            // @ts-ignore
            this.tasksUpdating = true;
            firebase
                .deleteTask(task)
                .then(() => {
                    return deleteTasks(task.id, this.$store.getters.tasks);
                })
                .then((tasks: any) => {
                    this.$store.dispatch('SET_TASKS', tasks);
                    this.$store.dispatch(
                        'SHOW_SNACK',
                        this.$t('toast.success.task.delete')
                    );
                })
                .catch((err: any) => {
                    this.$store.dispatch(
                        'SHOW_SNACK',
                        this.$t('toast.error.task.delete')
                    );
                })
                .finally(() => {
                    // @ts-ignore
                    this.tasksUpdating = false;
                });
        },
        updateTasks(taskId: any, updatedTask: any, index: any) {
            // @ts-ignore
            this.tasksUpdating = true;
            firebase
                .updateTask(taskId, updatedTask)
                .then(() => {
                    return updateTasks(
                        taskId,
                        updatedTask,
                        this.$store.getters.tasks
                    );
                })
                .then((tasks) => {
                    this.$store.dispatch('SET_TASKS', tasks);
                    if (!isNaN(index) && index >= 0) {
                        this.onTaskGridChange({
                            moved: {
                                element: {
                                    id: taskId,
                                    ...updatedTask,
                                },
                                oldIndex: this.tasksByStatus[updatedTask.status]
                                    .length,
                                newIndex: index,
                            },
                        });
                    }
                    this.$store.dispatch(
                        'SHOW_SNACK',
                        this.$t('toast.success.task.edit')
                    );
                })
                .catch((err) => {
                    this.$store.dispatch(
                        'SHOW_SNACK',
                        this.$t('toast.error.task.edit')
                    );
                })
                .finally(() => {
                    // @ts-ignore
                    this.tasksUpdating = false;
                });
        },
        loadPage() {
            return Promise.all([
                // @ts-ignore
                getAllTasksForUser(this.currentUser),
                // @ts-ignore
                getAllTaskTypesForUser(this.currentUser),
                // @ts-ignore
                getAllNotificationsForUser(this.currentUser),
            ]);
        },
        navigateTo(path: any) {
            navigateToPath(path);
        },
        isTaskValid(task: any) {
            return task.title.trim() !== '';
        },
    },
    mounted() {
        if (!this.$store.getters.landingVisited) {
            this.pageLoading = true;
            this.loadPage()
                .then((response: any) => {
                    // @ts-ignore
                    this.$store.dispatch('SET_TASKS', response[0]);
                    // @ts-ignore
                    this.$store.dispatch('SET_TYPES', response[1]);
                    // @ts-ignore
                    this.$store.dispatch('SET_NOTIFICATIONS', response[2]);
                    // @ts-ignore
                    this.$store.dispatch('LANDING_VISITED', true);
                })
                .catch((err: any) => {
                    // @ts-ignore
                    this.$store.dispatch('SHOW_SNACK', err);
                })
                .then(() => {
                    this.pageLoading = false;
                });
        }
    },
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
