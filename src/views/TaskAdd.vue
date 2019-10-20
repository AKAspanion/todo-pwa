<template>
    <div>
        <bar-top>
            <template #left>
                <v-btn icon @click="navigateTo('/home')">
                    <v-icon>mdi-arrow-left</v-icon>
                </v-btn>
            </template>
            <template #center>
                <v-chip small outlined>{{$t('task.add')}}</v-chip>
            </template>
            <template #right>
                <container-menu></container-menu>
            </template>
        </bar-top>
        <container-app>
            <v-card
                flat
                tile
                class="pt-3 pb-3 task-add-container"
                :class="$vuetify.breakpoint.smAndUp ? 'mx-3':''"
            >
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
                                    :placeholder="$t('task.title-placeholder')"
                                    :rules="[rules.empty.title, rules.nospace.field]"
                                ></v-text-field>
                            </v-flex>
                            <v-flex xs12 sm6 md4 class="py-0">
                                <v-menu v-model="timeMenu" :close-on-content-click="false">
                                    <template #activator="{ on }">
                                        <v-text-field
                                            v-on="on"
                                            readonly
                                            :disabled="task.indefinite"
                                            v-bind="textFieldAttributes"
                                            placeholder="Select time"
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
                                            :disabled="task.indefinite"
                                            placeholder="Select date"
                                            v-bind="textFieldAttributes"
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
                                            :landscape="$vuetify.breakpoint.mdAndUp"
                                        ></v-date-picker>
                                    </v-card>
                                </v-menu>
                            </v-flex>
                            <v-flex xs12 class="py-0">
                                <div
                                    class="px-3"
                                    :class="!$vuetify.theme.dark ? 'light-type-card':'dark-type-card'"
                                >
                                    <v-layout
                                        justify-start
                                        align-center
                                        row
                                        class="ma-0 type-layout label-container"
                                    >
                                        <v-icon
                                            class="pr-3"
                                            style="margin-left: -2px;"
                                        >mdi-label-outline</v-icon>
                                        <template v-if="taskTypesLoading">
                                            <div class="animate label-shimmer"></div>
                                        </template>
                                        <template v-else>
                                            <div style="width: calc(100% - 36px)">
                                                <v-chip-group
                                                    v-model="taskTypes"
                                                    multiple
                                                    return-object
                                                >
                                                    <v-chip
                                                        filter
                                                        label
                                                        outlined
                                                        :key="tag.id"
                                                        :color="tag.color"
                                                        v-for="(tag, index) in types"
                                                        @focus="onChipFocus(true)"
                                                        @blur="onChipFocus(false)"
                                                        @keyup.enter="updateTaskModel(index)"
                                                        :small="$vuetify.breakpoint.xsOnly"
                                                    >{{ tag.label }}</v-chip>
                                                </v-chip-group>
                                                <div
                                                    v-if="!types.length"
                                                    class="overflow-text mt-n2 caption text-left warning--text"
                                                >{{$t('label.no-label')}}</div>
                                            </div>
                                        </template>
                                    </v-layout>
                                </div>
                            </v-flex>

                            <v-flex xs12 class="py-0 text-area">
                                <v-textarea
                                    v-model="task.description"
                                    auto-grow
                                    v-bind="textFieldAttributes"
                                    prepend-inner-icon="mdi-card-text-outline"
                                    :placeholder="$t('task.desc-placeholder')"
                                ></v-textarea>
                            </v-flex>
                            <v-flex xs12 class="py-0 mt-n5 pb-3">
                                <v-layout row align-center justify-start class="ma-0">
                                    <v-btn-toggle dense block v-model="task.status">
                                        <v-btn left value="todo">
                                            <span
                                                class="pl-1 error--text font-weight-bold"
                                            >{{$t('todo')}}</span>
                                        </v-btn>
                                        <v-btn value="done">
                                            <span
                                                class="pl-1 success--text font-weight-bold"
                                            >{{$t('done')}}</span>
                                        </v-btn>
                                    </v-btn-toggle>
                                    <v-spacer></v-spacer>
                                    <div class="mx-2 subtitle-2">{{$t('task.indefinite')}}</div>
                                    <v-switch
                                        color="primary"
                                        v-model="task.indefinite"
                                        class="mb-n1 mr-n1"
                                    ></v-switch>
                                </v-layout>
                            </v-flex>
                            <v-flex xs12 class="py-0">
                                <v-layout row align-center justify-start class="ma-0 pb-5">
                                    <v-spacer></v-spacer>
                                    <v-btn
                                        large
                                        type="submit"
                                        color="primary"
                                        :disabled="!addTaskForm"
                                        :loading="addTaskLoading"
                                    >{{$t('task.add')}}</v-btn>
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
import ContainerMenu from "@/components/ContainerMenu.vue";
// @ts-ignore
import {
    getMomentDate,
    navigateToPath,
    getReadableDate,
    get12FormatTime,
    getAllTasksForUser,
    getAllTaskTypesForUser,
    parseTasksByStatus,
    getTextColorByBg
    // @ts-ignore
} from "@/util";
export default Vue.extend({
    components: {
        BarTop,
        ContainerApp,
        ContainerMenu
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
                date: getMomentDate(new Date()).substr(0, 10),
                time: getMomentDate(new Date()).substr(11, 5),
                status: "todo",
                description: "",
                indefinite: false,
                type: []
            },
            types: [],
            taskTypeIndexHolder: [],
            textFieldAttributes: {
                dense: !this.$vuetify.breakpoint.mdAndUp,
                outlined: true
            },
            rules: {
                empty: {
                    title: (v: any) => !!v || this.$t("rule.empty.title")
                },
                nospace: {
                    field: (v: any) =>
                        (v && v.trim() !== "") || this.$t("rule.space.field")
                }
            }
        };
    },
    computed: {
        taskTypes: {
            get() {
                // @ts-ignore
                return this.taskTypeIndexHolder;
            },
            set(val) {
                // @ts-ignore
                this.taskTypeIndexHolder = val;
                // @ts-ignore
                this.updateType(val);
            }
        }
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
        onChipFocus(e: any) {
            this.$nextTick(() => {
                let lightCard = document.getElementsByClassName(
                    "light-type-card"
                );
                let darkCard = document.getElementsByClassName(
                    "dark-type-card"
                );
                let taskLayout = document.getElementsByClassName("type-layout");
                if (lightCard.length) {
                    if (e) {
                        lightCard[0].classList.add("light-focused");
                    } else {
                        lightCard[0].classList.remove("light-focused");
                    }
                } else {
                    if (e) {
                        darkCard[0].classList.add("dark-focused");
                    } else {
                        darkCard[0].classList.remove("dark-focused");
                    }
                }
                if (e) {
                    taskLayout[0].classList.add("layout-focused");
                } else {
                    taskLayout[0].classList.remove("layout-focused");
                }
            });
        },
        updateType(val: any) {
            this.task.type = val.map((index: any) => {
                return this.types[index];
            });
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

        updateTaskModel(index: any) {
            //@ts-ignore
            let indexVal = this.taskTypeIndexHolder.indexOf(index);
            if (indexVal !== -1) {
                this.taskTypeIndexHolder.splice(indexVal, 1);
            } else {
                //@ts-ignore
                this.taskTypeIndexHolder.push(index);
            }
            this.updateType(this.taskTypeIndexHolder);
        },
        loadPage() {
            return Promise.all([
                getAllTasksForUser(this.$store.getters.user),
                getAllTaskTypesForUser(this.$store.getters.user)
            ]);
        },
        getTextColor(color: any) {
            return getTextColorByBg(color);
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
.light-type-card,
.dark-type-card {
    min-height: 36px;
    max-height: 50px;
    margin-bottom: 28px;
    border-radius: 4px;
}

.light-type-card {
    border: 1px solid rgba(0, 0, 0, 0.24) !important;
}
.dark-type-card {
    border: 1px solid rgb(192, 192, 192) !important;
}
.light-focused {
    border: 2px solid #1976d2 !important;
}
.dark-focused {
    border: 2px solid #2196f3 !important;
}
.light-focused .v-icon {
    color: #1976d2;
}
.dark-focused .v-icon {
    color: #2196f3;
}
.layout-focused {
    margin-left: -1px !important;
    margin-top: -1px !important;
}
@media only screen and (max-width: 600px) {
    .task-add-container >>> .v-text-field__slot {
        font-size: 13px !important;
    }
    .task-add-container >>> .v-input__slot {
        min-height: 36px !important;
    }
    .task-add-container >>> .v-input__prepend-inner {
        margin-top: 6px !important;
    }
    .text-area >>> .v-input__prepend-inner {
        margin-top: 8px !important;
    }
    .type-card >>> .v-chip-group .v-slide-group__content {
        padding: 2px 0 !important;
    }
    .type-card {
        height: 36px;
    }
}
</style>
