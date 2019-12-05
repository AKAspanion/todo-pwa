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
                style="width: 100%;"
                :class="$vuetify.breakpoint.xsOnly ? 'px-3' : 'px-4'"
            >
                <v-row
                    no-gutters
                    justify="start"
                    v-if="filters.length"
                    :class="
                        $vuetify.breakpoint.xsOnly ? 'px-1 pb-2' : 'px-3 pb-4'
                    "
                >
                    <template v-for="(filter, index) in filters">
                        <v-chip
                            close
                            label
                            :key="index"
                            class="mr-2"
                            :color="filter.color"
                            :small="$vuetify.breakpoint.xsOnly"
                            @click:close="onFilterClose(filter)"
                            :style="
                                `color: ${getTextColor(
                                    filter.color
                                )} !important`
                            "
                            ><span class="px-1">{{
                                filter.label
                            }}</span></v-chip
                        >
                    </template>
                </v-row>
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
                            :task-list="todoList"
                            :loading="pageLoading"
                            :disabled="tasksUpdating"
                            @edit="onTaskEdit"
                            @check="onTaskCheck"
                            @delete="onTaskDelete"
                            @change="onTaskGridChange"
                            @type-select="onTypeSelect"
                            :no-data-object="{
                                title: $t('no-task.todo.title'),
                                caption: $t('no-task.todo.caption'),
                            }"
                            :class="
                                $vuetify.breakpoint.xsOnly
                                    ? 'pa-1 pb-4'
                                    : 'pa-3 pb-6'
                            "
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
                            :task-list="doneList"
                            :loading="pageLoading"
                            :disabled="tasksUpdating"
                            @delete="onTaskDelete"
                            @uncheck="onTaskUncheck"
                            @change="onTaskGridChange"
                            @type-select="onTypeSelect"
                            :no-data-object="{
                                title: $t('no-task.done.title'),
                                caption: $t('no-task.done.caption'),
                            }"
                            :class="
                                $vuetify.breakpoint.xsOnly
                                    ? 'pa-1 pb-4'
                                    : 'pa-3 pb-6'
                            "
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
    getTextColorByBg,
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
            filters: [],
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
        tasks() {
            return this.$store.getters.tasks;
        },
        filteredTasks() {
            // @ts-ignore
            let filterId = this.filters.reduce((text: any, type: any) => {
                return (text += type.id);
            }, '');
            // @ts-ignore
            return this.tasks.filter((task) => {
                let found = false;
                for (let i = 0; i < task.type.length; i++) {
                    if (filterId.includes(task.type[i].id)) {
                        found = true;
                        break;
                    }
                }
                return found;
            });
        },
        tasksByStatus() {
            return getTasksByStatus(
                // @ts-ignore
                this.filters.length ? this.filteredTasks : this.tasks
            );
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
        onFilterClose(type: any) {
            this.removeFilter(type);
        },
        onTypeSelect(type: any) {
            if (!this.isFilterActive(type)) {
                // @ts-ignore
                this.filters.unshift(type);
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
                    return deleteTasks(task.id, this.tasks);
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
                    return updateTasks(taskId, updatedTask, this.tasks);
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
        getTextColor(color: any) {
            return getTextColorByBg(color);
        },
        removeFilter(type: any) {
            // @ts-ignore
            this.filters.splice(this.filters.indexOf(type), 1);
        },
        isTaskValid(task: any) {
            return task.title.trim() !== '';
        },
        isFilterActive(type: any) {
            return this.filters.find((filter: any) => filter.id == type.id);
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
