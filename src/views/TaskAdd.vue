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
        <app-container coloured elevated-bg bg-height="80px">
            <div class="mx-4 px-3">
                <v-layout row align-center justify-start ma-0 class="label-container pt-2 mb-n1">
                    <v-text-field light solo v-model="task.title" placeholder="Name the task"></v-text-field>
                </v-layout>
                <v-layout row align-start justify-start ma-0 class="label-container pt-3 mb-n3">
                    <div class="pt-2">
                        <v-icon>mdi-calendar</v-icon>
                    </div>
                    <div class="pl-1 add-text subtitle-2">
                        <v-text-field
                            readonly
                            solo
                            flat
                            dense
                            placeholder="Date"
                            v-model="task.date"
                        ></v-text-field>
                    </div>
                    <v-spacer></v-spacer>
                    <div class="pt-2">
                        <v-menu :close-on-content-click="false">
                            <template #activator="{ on }">
                                <v-btn small icon v-on="on">
                                    <v-icon small>mdi-pencil</v-icon>
                                </v-btn>
                            </template>
                            <v-card>
                                <v-date-picker
                                    reactive
                                    full-width
                                    locale="in"
                                    color="primary"
                                    ref="datePicker"
                                    v-model="task.date"
                                ></v-date-picker>
                            </v-card>
                        </v-menu>
                    </div>
                </v-layout>
                <v-layout row align-start justify-start ma-0 class="label-container mb-n1">
                    <div class="pt-2">
                        <v-icon>mdi-clock</v-icon>
                    </div>
                    <div class="pl-1 add-text subtitle-2">
                        <v-text-field
                            readonly
                            solo
                            flat
                            dense
                            placeholder="Time"
                            v-model="task.time"
                        ></v-text-field>
                    </div>
                    <v-spacer></v-spacer>
                    <div class="pt-2">
                        <v-menu :close-on-content-click="false">
                            <template #activator="{ on }">
                                <v-btn small icon v-on="on">
                                    <v-icon small>mdi-pencil</v-icon>
                                </v-btn>
                            </template>
                            <v-card>
                                <v-time-picker
                                    ref="timePicker"
                                    color="primary"
                                    format="24hr"
                                    locale="in"
                                    v-model="task.time"
                                ></v-time-picker>
                            </v-card>
                        </v-menu>
                    </div>
                </v-layout>
                <v-layout row align-center justify-start ma-0 class="label-container pb-6">
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
                <v-layout row align-start justify-start ma-0 class="label-container mb-n3">
                    <div class="pt-2">
                        <v-icon>mdi-file-document-edit</v-icon>
                    </div>

                    <div class="pl-1 add-text subtitle-2" style="width: calc(100% - 24px)">
                        <v-text-field value="Description" solo flat dense readonly></v-text-field>
                        <div class="pl-3 mt-n5">
                            <v-textarea
                                auto-grow
                                outlined
                                dense
                                placeholder="A detailed description of the task."
                            ></v-textarea>
                        </div>
                    </div>
                </v-layout>
                <v-layout row align-start justify-start ma-0 class="label-container mb-6">
                    <div class="pt-2">
                        <v-icon>mdi-label</v-icon>
                    </div>
                    <div class="pl-1 add-text subtitle-2" style="width: calc(100% - 24px)">
                        <v-text-field value="Task type" solo flat dense readonly></v-text-field>
                        <div class="pl-3 mt-n7">
                            <v-chip-group multiple active-class="primary--text">
                                <v-chip label outlined v-for="tag in tags" :key="tag">{{ tag }}</v-chip>
                            </v-chip-group>
                        </div>
                    </div>
                </v-layout>
                <v-btn color="primary" block large rounded>ADD TASK</v-btn>
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
import { navigateToPath } from "@/util";
export default Vue.extend({
    components: {
        Topbar,
        AppContainer
    },
    data() {
        return {
            showTitleField: false,
            task: {
                title: "",
                date: new Date().toISOString().substr(0, 10),
                time: new Date().toISOString().substr(11, 5),
                status: "in_progress",
                description: "",
                type: ""
            },
            tags: [
                "Work",
                "Home Improvement",
                "Vacation",
                "Food",
                "Drawers",
                "Shopping",
                "Art",
                "Tech",
                "Creative Writing"
            ],
            timePeriod: "AM"
        };
    },
    methods: {
        navigateTo(path: any) {
            navigateToPath(path);
        },
        test(data: any) {
            console.log(data);
        },
        getAMPM() {
            this.$nextTick(() => {
                return this.$refs.timePicker.period;
            });
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
textarea {
    margin-top: 0 !important;
}
.v-time-picker-title {
    justify-content: center !important;
}
</style>
