<template>
    <div>
        <topbar primary dark>
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
        <app-container coloured elevated-bg bg-height="88px">
            <div class="mx-4 px-3">
                <v-layout row align-center justify-start ma-0 class="label-container pt-2 mb-n1">
                    <v-text-field light solo flat v-model="task.title" placeholder="Name your task"></v-text-field>
                </v-layout>
                <v-layout row align-start justify-start ma-0 class="label-container pt-6 mb-n3">
                    <div class="pt-2">
                        <v-menu v-model="dateMenu" :close-on-content-click="false">
                            <template #activator="{ on }">
                                <v-btn small icon v-on="on">
                                    <v-icon>mdi-calendar</v-icon>
                                </v-btn>
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
                    </div>
                    <div class="add-text subtitle-2 full-width">
                        <v-text-field
                            readonly
                            solo
                            flat
                            dense
                            placeholder="Date"
                            :value="readableDate"
                            @click="dateMenu =! dateMenu"
                        >{{readableDate}}</v-text-field>
                    </div>
                    <v-spacer></v-spacer>
                </v-layout>
                <v-layout row align-start justify-start ma-0 class="label-container mb-n3">
                    <div class="pt-2">
                        <v-menu v-model="timeMenu" :close-on-content-click="false">
                            <template #activator="{ on }">
                                <v-btn small icon v-on="on">
                                    <v-icon>mdi-clock</v-icon>
                                </v-btn>
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
                    </div>
                    <div class="add-text subtitle-2 full-width">
                        <v-text-field
                            readonly
                            solo
                            flat
                            dense
                            placeholder="Time"
                            :value="readableTime"
                            @click="timeMenu =! timeMenu"
                        ></v-text-field>
                    </div>
                    <v-spacer></v-spacer>
                </v-layout>
                <v-layout row align-start justify-start ma-0 class="label-container mb-2">
                    <div class="pt-2">
                        <v-menu v-model="labelMenu" :close-on-content-click="false">
                            <template #activator="{ on }">
                                <v-btn small icon v-on="on">
                                    <v-icon>mdi-label</v-icon>
                                </v-btn>
                            </template>
                            <v-card width="400">
                                <v-card-text class="text-left">
                                    <div class="subtitle-1 pb-2">Create new task type</div>
                                    <v-text-field outlined dense label="Type"></v-text-field>
                                    {{newTag.color}}
                                    <v-color-picker
                                        v-model="newTag.color"
                                        hide-canvas
                                        hide-inputs
                                        hide-mode-switch
                                        :show-swatches="false"
                                    ></v-color-picker>
                                </v-card-text>
                                <v-card-actions class="pa-0 pr-4 pb-3">
                                    <v-spacer></v-spacer>
                                    <v-btn color="primary">Add</v-btn>
                                </v-card-actions>
                            </v-card>
                        </v-menu>
                    </div>
                    <div class="add-text subtitle-2 full-width">
                        <v-text-field value="Task type" solo flat dense readonly></v-text-field>
                        <div class="pl-3 mt-n7">
                            <v-chip-group multiple v-model="task.type">
                                <v-chip
                                    label
                                    outlined
                                    :key="tag.id"
                                    :value="tag.id"
                                    :color="tag.color"
                                    v-for="tag in tags"
                                >{{ tag.label }}</v-chip>
                            </v-chip-group>
                        </div>
                    </div>
                </v-layout>
                <v-layout row align-start justify-start ma-0 class="label-container">
                    <div class="pt-2">
                        <v-icon>mdi-file-document-edit</v-icon>
                    </div>
                    <div class="pl-1 add-text subtitle-2 full-width">
                        <v-text-field value="Description" solo flat dense readonly></v-text-field>
                        <div class="pl-3 mt-n5">
                            <v-textarea
                                v-model="task.description"
                                auto-grow
                                outlined
                                dense
                                placeholder="A detailed description of the task."
                            ></v-textarea>
                        </div>
                    </div>
                </v-layout>
                <v-layout row align-center justify-start ma-0 class="label-container mb-8">
                    <div>
                        <v-icon>mdi-finance</v-icon>
                    </div>
                    <div class="pl-4 add-text subtitle-2">Status</div>
                    <v-spacer></v-spacer>
                    <v-btn-toggle v-model="task.status">
                        <v-btn small left value="in_progress">
                            <v-icon x-small color="error">mdi-progress-clock</v-icon>
                            <span class="pl-1 error--text">in progress</span>
                        </v-btn>
                        <v-btn small value="done">
                            <v-icon x-small color="success">mdi-progress-check</v-icon>
                            <span class="pl-1 success--text">done</span>
                        </v-btn>
                    </v-btn-toggle>
                </v-layout>
                <v-btn color="primary" elevation="8" block height="52">ADD TASK</v-btn>
                <div class="pa-4"></div>
            </div>
        </app-container>
    </div>
</template>

<script lang="ts">
import Vue from "vue";
import Topbar from "@/components/Topbar.vue";
import AppContainer from "@/components/AppContainer.vue";
// @ts-ignore
import { navigateToPath, getReadableDate, get12FormatTime } from "@/util";
export default Vue.extend({
    components: {
        Topbar,
        AppContainer
    },
    data() {
        return {
            showTitleField: false,
            labelMenu: false,
            timeMenu: false,
            dateMenu: false,
            task: {
                title: "",
                date: new Date().toISOString().substr(0, 10),
                time: new Date().toISOString().substr(11, 5),
                status: "in_progress",
                description: "",
                type: []
            },
            newTag: {
                color: "#8E00FF"
            },
            tags: [
                {
                    id: "1",
                    color: "#0078ff",
                    label: "Meeting"
                },

                {
                    id: "2",
                    color: "#ff0072",
                    label: "Buisness"
                }
            ],
            timePeriod: "AM"
        };
    },
    computed: {
        readableDate() {
            return getReadableDate(this.task.date);
        },
        readableTime() {
            return get12FormatTime(this.task.time);
        }
    },
    methods: {
        navigateTo(path: any) {
            navigateToPath(path);
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
    padding-top: 2.5px;
    font-size: 16px !important;
}
.full-width {
    width: calc(100% - 28px);
}
textarea {
    margin-top: 0 !important;
}
.pickerTime >>> .v-time-picker-title {
    justify-content: center !important;
}
</style>
