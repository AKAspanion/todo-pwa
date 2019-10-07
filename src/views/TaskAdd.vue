<template>
    <div>
        <bar-top>
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
        </bar-top>
        <container-app>
            <v-card flat tile class="mx-3 pt-3 pb-3 task-add-container">
                <v-form
                    v-model="addTaskForm"
                    ref="formAddTask"
                    lazy-validation
                    @submit.prevent="onAddTaskSubmit"
                >
                    <v-container grid-list-lg fluid>
                        <v-layout row wrap fill-height justify-space-between class="ma-0">
                            <v-flex xs12 sm12 md4 class="py-0">
                                <v-text-field
                                    ref="titleField"
                                    v-bind="textFieldAttributes"
                                    prepend-inner-icon="mdi-format-title"
                                    v-model="task.title"
                                    hint="Name your task"
                                    placeholder="Name your task"
                                    :rules="[rules.empty.title]"
                                ></v-text-field>
                            </v-flex>

                            <v-flex xs12 sm6 md4 class="py-0">
                                <v-menu v-model="timeMenu" :close-on-content-click="false">
                                    <template #activator="{ on }">
                                        <v-text-field
                                            v-on="on"
                                            readonly
                                            v-bind="textFieldAttributes"
                                            hint="Choose time"
                                            placeholder="Select time"
                                            prepend-inner-icon="mdi-clock-outline"
                                            :value="readableTime()"
                                            :rules="[rules.empty.title]"
                                        ></v-text-field>
                                    </template>
                                    <v-card>
                                        <v-time-picker
                                            color="primary"
                                            ref="timePicker"
                                            class="pickerTime"
                                            v-model="task.time"
                                            :locale="$i18n.locale"
                                            :ampm-in-title="$vuetify.breakpoint.mdAndUp"
                                            :landscape="$vuetify.breakpoint.mdAndUp"
                                        ></v-time-picker>
                                    </v-card>
                                </v-menu>
                            </v-flex>

                            <v-flex xs12 sm6 md4 class="py-0">
                                <v-menu v-model="dateMenu" :close-on-content-click="false">
                                    <template #activator="{ on }">
                                        <v-text-field
                                            v-on="on"
                                            readonly
                                            hint="Choose date"
                                            placeholder="Select date"
                                            v-bind="textFieldAttributes"
                                            prepend-inner-icon="mdi-calendar-outline"
                                            :rules="[rules.empty.title]"
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
                                            :landscape="$vuetify.breakpoint.mdAndUp"
                                        ></v-date-picker>
                                    </v-card>
                                </v-menu>
                            </v-flex>
                            <v-flex xs12 class="py-0">
                                <v-autocomplete
                                    v-model="task.type"
                                    :items="types"
                                    item-text="label"
                                    return-object
                                    small-chips
                                    multiple
                                    :rules="[rules.empty.type]"
                                    v-bind="textFieldAttributes"
                                    :loading="taskTypesLoading"
                                    :search-input.sync="typeSearch"
                                    prepend-inner-icon="mdi-label-outline"
                                    placeholder="Task type"
                                    hint="Choose a task type"
                                >
                                    <template #selection="data">
                                        <v-chip
                                            v-bind="data.attrs"
                                            :input-value="data.selected"
                                            label
                                            :small="$vuetify.breakpoint.xsOnly"
                                            :text-color="getTextColorByBg(data.item)"
                                            :color="data.item.color"
                                            @click="data.select"
                                        >{{ data.item.label }}</v-chip>
                                    </template>
                                    <template #item="data">
                                        <template v-if="typeof data.item !== 'object'">
                                            <v-list-item-content v-text="data.item"></v-list-item-content>
                                        </template>
                                        <template v-else>
                                            <v-list-item-avatar
                                                size="24"
                                                :color="data.item.color"
                                                @click="typeSearch = ''"
                                            ></v-list-item-avatar>
                                            <v-list-item-content
                                                class="text-left"
                                                @click="typeSearch = ''"
                                            >
                                                <v-list-item-title v-html="data.item.label"></v-list-item-title>
                                            </v-list-item-content>
                                        </template>
                                    </template>
                                    <template #no-data>
                                        <v-card flat tile class="py-2">
                                            <div style="margin: 0 auto; width: 300px;">
                                                <v-card-text>
                                                    <div class="pb-4">
                                                        Create a new task type
                                                        <v-chip
                                                            label
                                                            :small="$vuetify.breakpoint.xsOnly"
                                                            class="ml-2"
                                                            :color="newTypeColor"
                                                            :text-color="getTextColorByBg()"
                                                        >{{typeSearch}}</v-chip>
                                                    </div>
                                                    <v-color-picker
                                                        v-model="newTypeColor"
                                                        hide-canvas
                                                        hide-inputs
                                                        hide-swatches
                                                    ></v-color-picker>
                                                </v-card-text>
                                                <v-card-actions>
                                                    <v-spacer></v-spacer>
                                                    <v-btn
                                                        color="primary"
                                                        @click="onAddTaskTypeSubmit"
                                                    >Create</v-btn>
                                                    <v-spacer></v-spacer>
                                                </v-card-actions>
                                            </div>
                                        </v-card>
                                    </template>
                                </v-autocomplete>
                            </v-flex>

                            <v-flex xs12 class="py-0 text-area">
                                <v-textarea
                                    v-model="task.description"
                                    auto-grow
                                    v-bind="textFieldAttributes"
                                    :rules="[rules.empty.desc]"
                                    prepend-inner-icon="mdi-card-text-outline"
                                    placeholder="A detailed description of the task"
                                    hint="Enter a description"
                                ></v-textarea>
                            </v-flex>

                            <v-flex xs12 class="py-0">
                                <v-layout
                                    row
                                    align-center
                                    justify-start
                                    class="label-container ma-0 pb-5 my-3"
                                >
                                    <!-- <v-spacer></v-spacer> -->
                                    <v-btn-toggle dense block v-model="task.status">
                                        <v-btn left value="todo">
                                            <span class="pl-1 error--text font-weight-bold">todo</span>
                                        </v-btn>
                                        <v-btn value="done">
                                            <span class="pl-1 success--text font-weight-bold">done</span>
                                        </v-btn>
                                    </v-btn-toggle>
                                    <v-spacer></v-spacer>
                                    <v-btn
                                        type="submit"
                                        color="primary"
                                        :disabled="!addTaskForm"
                                        :loading="addTaskLoading"
                                    >ADD TASK</v-btn>
                                </v-layout>
                            </v-flex>
                        </v-layout>
                    </v-container>
                </v-form>
            </v-card>
        </container-app>
    </div>
</template>

<script lang="ts">
import Vue from "vue";
import FirebaseWeb from "../firebase";
const firebase = new FirebaseWeb();

import BarTop from "@/components/BarTop.vue";
import ContainerApp from "@/components/ContainerApp.vue";
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
        BarTop,
        ContainerApp
    },
    data() {
        return {
            addTaskForm: false,
            labelMenu: false,
            timeMenu: false,
            dateMenu: false,
            pageLoading: false,
            addTaskLoading: false,
            newTypeColor: "#8E00FF",
            typeSearch: "",
            taskTypesLoading: false,
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
            types: [],
            textFieldAttributes: {
                dense: !this.$vuetify.breakpoint.mdAndUp,
                outlined: true
            },
            rules: {
                empty: {
                    title: (v: any) => !!v || "Enter a title",
                    desc: (v: any) => !!v || "Enter a description",
                    type: (v: any) => v.length !== 0 || "Choose a task type"
                },
                nospace: {
                    field: (v: any) =>
                        (v && v.trim() !== "") ||
                        this.$t("errors.spaces.field"),
                    password: (v: any) =>
                        (v && !/\s/g.test(v)) ||
                        this.$t("errors.spaces.password"),
                    email: (v: any) =>
                        (v && !/\s/g.test(v)) || this.$t("errors.spaces.email")
                },
                password: (v: any) =>
                    (v &&
                        /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/.test(
                            v
                        )) ||
                    this.$t("errors.password.invalid"),
                confirmPassword: (v: any) =>
                    (v && v === this.user.password) ||
                    this.$t("errors.password.confirmPass"),
                email: (v: any) =>
                    (v &&
                        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(
                            v
                        )) ||
                    this.$t("errors.email.invalid")
            }
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
            let addTaskValidator: any = this.$refs.formAddTask;
            if (
                addTaskValidator &&
                addTaskValidator.validate() &&
                this.addTaskForm
            ) {
                this.addTask();
            }
        },
        onAddTaskTypeSubmit() {
            if (this.typeSearch.trim() === "") {
                return;
            }
            if (this.newTypeColor.trim() === "") {
                return;
            }
            this.addTaskType();
        },
        addTaskType() {
            this.taskTypesLoading = true;
            let newTaskType = {
                label: this.typeSearch.trim(),
                color: this.newTypeColor.trim()
            };
            firebase
                .addTaskType(newTaskType)
                .then(() => {
                    this.$store.dispatch("LANDING_VISITED", false);
                    this.$store.dispatch("SET_TYPES", [
                        newTaskType,
                        ...this.types
                    ]);
                    this.types = this.$store.getters.types;
                })
                .catch(err => {
                    this.$store.dispatch("SHOW_SNACK", err);
                })
                .finally(() => {
                    this.taskTypesLoading = false;
                });
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
        },
        getTextColorByBg(item: any) {
            return "#fff";
        }
    },
    mounted() {
        if (!this.$store.getters.landingVisited) {
            this.pageLoading = true;
            this.taskTypesLoading = true;
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
                .finally(() => {
                    this.pageLoading = false;
                    this.taskTypesLoading = false;
                });
        } else {
            this.types = this.$store.getters.types;
        }
        this.$nextTick(() => {
            setTimeout(() => {
                let title: any = this.$refs.titleField;
                title.focus();
            }, 300);
        });
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
.task-add-container >>> .v-text-field__slot input {
    margin-top: 0 !important;
}
.text-area >>> .v-input__prepend-inner {
    margin-top: 7px !important;
}
.task-add-container >>> .v-select__slot {
    padding-left: 6px;
}
.pickerTime >>> .v-time-picker-title {
    justify-content: center !important;
}
.pickerTime {
    width: 100%;
}
.pt-2px {
    padding-top: 3px;
}
</style>
