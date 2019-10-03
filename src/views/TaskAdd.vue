<template>
    <div>
        <topbar>
            <template #left>
                <v-btn icon @click="navigateTo('/home')">
                    <v-icon>mdi-arrow-left</v-icon>
                </v-btn>
            </template>
            <template #center>
                <v-chip small outlined>Add Task</v-chip>
            </template>
            <template #right>
                <v-btn icon @click="navigateTo('/home')">
                    <v-icon>mdi-close</v-icon>
                </v-btn>
            </template>
        </topbar>
        <app-container class="task-add-container">
            <v-form v-model="addTaskForm">
                <v-card flat tile height="calc(100vh - 80px - 80px)" class="mx-4 px-3 pt-3">
                    <v-layout column fill-height justify-space-between class="ma-0">
                        <div>
                            <v-text-field
                                dense
                                outlined
                                prepend-inner-icon="mdi-format-title"
                                v-model="task.title"
                                placeholder="Name your task"
                                class="mb-n2"
                            ></v-text-field>
                            <v-menu v-model="timeMenu" :close-on-content-click="false">
                                <template #activator="{ on }">
                                    <v-text-field
                                        dense
                                        v-on="on"
                                        outlined
                                        class="mb-n2"
                                        prepend-inner-icon="mdi-clock-outline"
                                        :value="readableTime()"
                                    ></v-text-field>
                                </template>
                                <v-card>
                                    <v-time-picker
                                        color="primary"
                                        ref="timePicker"
                                        class="pickerTime"
                                        v-model="task.time"
                                        :locale="$i18n.locale"
                                    ></v-time-picker>
                                </v-card>
                            </v-menu>
                            <v-menu v-model="dateMenu" :close-on-content-click="false">
                                <template #activator="{ on }">
                                    <v-text-field
                                        dense
                                        v-on="on"
                                        outlined
                                        class="mb-n2"
                                        prepend-inner-icon="mdi-calendar-outline"
                                        :value="readableDate()"
                                    ></v-text-field>
                                </template>
                                <v-card>
                                    <v-date-picker
                                        reactive
                                        full-width
                                        color="primary"
                                        ref="datePicker"
                                        v-model="task.date"
                                        :locale="$i18n.locale"
                                    ></v-date-picker>
                                </v-card>
                            </v-menu>
                            <v-autocomplete
                                v-model="task.type"
                                :items="types"
                                item-text="label"
                                return-object
                                small-chips
                                label
                                outlined
                                dense
                                multiple
                                class="mb-n2"
                                prepend-inner-icon="mdi-label-outline"
                                placeholder="Task type"
                            ></v-autocomplete>
                            <v-textarea
                                v-model="task.description"
                                auto-grow
                                outlined
                                dense
                                class="mb-n2"
                                prepend-inner-icon="mdi-card-text-outline"
                                placeholder="A detailed description of the task"
                            ></v-textarea>
                            <v-layout
                                row
                                align-center
                                justify-start
                                ma-0
                                mt-3
                                class="label-container pb-5"
                            >
                                <v-spacer></v-spacer>
                                <v-btn-toggle dense block v-model="task.status">
                                    <v-btn left value="todo">
                                        <span class="pl-1 error--text font-weight-bold">todo</span>
                                    </v-btn>
                                    <v-btn value="done">
                                        <span class="pl-1 success--text font-weight-bold">done</span>
                                    </v-btn>
                                </v-btn-toggle>
                                <v-spacer></v-spacer>
                            </v-layout>
                        </div>

                        <v-btn
                            large
                            rounded
                            color="primary"
                            @click="onAddTaskSubmit"
                            :loading="addTaskLoading"
                        >ADD TASK</v-btn>
                    </v-layout>
                </v-card>
            </v-form>
        </app-container>
    </div>
</template>

<script lang="ts">
import Vue from "vue";
import FirebaseWeb from "../firebase";
const firebase = new FirebaseWeb();

import Topbar from "@/components/Topbar.vue";
import AppContainer from "@/components/AppContainer.vue";
// @ts-ignore
import {
    navigateToPath,
    getReadableDate,
    get12FormatTime,
    getAllTasksForUser,
    getAllTaskTypes,
    parseTasksByStatus
    // @ts-ignore
} from "@/util";
export default Vue.extend({
    components: {
        Topbar,
        AppContainer
    },
    data() {
        return {
            addTaskForm: false,
            labelMenu: false,
            timeMenu: false,
            dateMenu: false,
            pageLoading: false,
            addTaskLoading: false,
            task: {
                title: "",
                date: new Date().toISOString().substr(0, 10),
                time: new Date().toISOString().substr(11, 5),
                status: "todo",
                description: "",
                type: []
            },
            newTag: {
                color: "#8E00FF"
            },
            types: []
        };
    },
    methods: {
        navigateTo(path: any) {
            navigateToPath(path);
        },
        readableDate() {
            const { date } = this.task;
            return getReadableDate(this.task.date);
        },
        readableTime() {
            return get12FormatTime(this.task.time);
        },
        onAddTaskSubmit() {
            if (this.task.title.trim() === "") {
                this.$store.dispatch("SHOW_SNACK", "Won't name your task?");
                return;
            }
            if (this.task.description.trim() === "") {
                this.$store.dispatch("SHOW_SNACK", "Won't give description?");
                return;
            }
            this.addTask();
        },
        addTask() {
            this.addTaskLoading = true;
            firebase
                .addTask(this.$store.getters.user, this.task)
                .then(() => {
                    this.$store.dispatch("LANDING_VISITED", false);
                    this.$store.dispatch(
                        "SHOW_SNACK",
                        "Task addedd succesfully"
                    );
                    this.navigateTo("/home");
                })
                .catch(err => {
                    this.$store.dispatch("SHOW_SNACK", err);
                })
                .then(err => {
                    this.addTaskLoading = false;
                });
        },
        loadPage() {
            return Promise.all([
                getAllTasksForUser(this.$store.getters.user),
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
                    this.types = response[1];
                    return parseTasksByStatus(response[0]);
                })
                .then((tasksByStatus: any) => {
                    this.$store.dispatch("SET_TASKS_BY_STATUS", tasksByStatus);
                })
                .catch(err => {
                    this.$store.dispatch("SHOW_SNACK", err);
                })
                .then(() => {
                    this.pageLoading = false;
                });
        } else {
            this.types = this.$store.getters.types;
        }
    }
});
</script>
<style scoped>
.test {
    background: red;
}
.label-container {
    min-height: 40px;
    min-width: 10px;
}
.add-text {
    font-size: 16px !important;
}
.full-width {
    width: calc(100% - 28px);
}
.task-add-container >>> textarea {
    margin-top: 4px !important;
}
.task-add-container >>> .v-text-field__slot {
    padding-left: 6px;
}
.task-add-container >>> .v-select__slot {
    padding-left: 6px;
}
.pickerTime >>> .v-time-picker-title {
    justify-content: center !important;
}
.pt-2px {
    padding-top: 3px;
}
</style>
