<template>
    <div>
        <bar-top dark primary>
            <template #left>
                <v-btn icon @click="navigateToHome">
                    <v-icon>mdi-arrow-left</v-icon>
                </v-btn>
            </template>
            <template #center>
                <v-chip small outlined>{{$t('profile')}}</v-chip>
            </template>
            <template #right>
                <container-menu></container-menu>
            </template>
        </bar-top>
        <container-app coloured elevated-bg bg-height="224px">
            <div class="pt-2 pb-4">
                <v-avatar size="110" :color="!$vuetify.theme.dark ? 'white':'#404040'">
                    <template v-if="currentUser.photoURL">
                        <v-img :src="currentUser.photoURL"></v-img>
                    </template>
                    <template v-else>
                        <div
                            v-if="currentUser.displayName"
                            class="display-1 font-weight-medium"
                        >{{getInitials(currentUser.displayName)}}</div>
                        <v-icon v-else color="primary">mdi-face</v-icon>
                    </template>
                </v-avatar>
            </div>
            <v-layout
                row
                wrap
                align-center
                justify-center
                class="ma-0 mr-n8 editable-item mb-n2"
                style="min-height: 40px;"
            >
                <v-text-field
                    light
                    ref="nameEdit"
                    v-if="editName"
                    solo
                    dense
                    v-model="user.displayName"
                    class="mb-n6"
                    style="max-width: 300px"
                ></v-text-field>
                <div v-else class="title white--text text-item">{{currentUser.displayName || 'NA'}}</div>
                <v-icon dark class="mx-2" v-if="editName" @click="resetEditFlags()">mdi-check</v-icon>
                <div v-else class="px-2 edit-button">
                    <v-icon dark small class="edit-icon" @click="onNameEdit()">mdi-pencil</v-icon>
                </div>
            </v-layout>
            <v-layout
                row
                wrap
                align-center
                justify-center
                class="ma-0 mr-n8 editable-item"
                style="min-height: 40px;"
            >
                <v-text-field
                    light
                    solo
                    dense
                    class="mb-n6"
                    ref="emailEdit"
                    v-if="editEmail"
                    v-model="user.email"
                    style="max-width: 300px"
                ></v-text-field>
                <div v-else class="subtitle-2 white--text text-item">{{currentUser.email || 'NA'}}</div>
                <v-icon dark class="mx-2" v-if="editEmail" @click="resetEditFlags()">mdi-check</v-icon>

                <div v-else class="px-2 edit-button">
                    <v-icon dark small class="edit-icon" @click="onEmailEdit()">mdi-pencil</v-icon>
                </div>
            </v-layout>
            <v-card-text class="mt-8">
                <v-card outlined class="mb-4 mx-3 px-3">
                    <v-checkbox
                        readonly
                        :ripple="false"
                        v-model="$store.getters.notificationGrant"
                        label="Notification permission granted"
                    ></v-checkbox>
                </v-card>
                <v-card outlined class="py-4 mx-3">
                    <div style="margin: 0 auto; width: 300px;">
                        <v-card-text>
                            <div class="pb-4">
                                <v-text-field
                                    dense
                                    outlined
                                    v-model="taskTypeLabel"
                                    :placeholder="$t('label.create')"
                                ></v-text-field>
                                <v-chip
                                    label
                                    :small="$vuetify.breakpoint.xsOnly"
                                    class="ml-2"
                                    :color="newTypeColor"
                                    :text-color="getTextColor(newTypeColor)"
                                >{{taskTypeLabel}}</v-chip>
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
                                :loading="taskTypesLoading"
                                :disabled="taskTypeLabel.trim() == ''"
                                @click="onAddTaskTypeSubmit"
                            >{{$t('create')}}</v-btn>
                            <v-spacer></v-spacer>
                        </v-card-actions>
                    </div>
                </v-card>
            </v-card-text>
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
import {
    navigateToPath,
    getInitials,
    getAllTasksForUser,
    getAllTaskTypesForUser,
    parseTasksByStatus,
    getTextColorByBg
    // @ts-ignore
} from "@/util";
export default Vue.extend({
    name: "Profile",
    components: {
        BarTop,
        ContainerApp,
        ContainerMenu
    },
    data() {
        return {
            newTypeColor: "#8E00FF",
            taskTypeLabel: "",
            types: [],
            pageLoading: false,
            taskTypesLoading: false,
            editName: false,
            editEmail: false,
            user: {
                displayName: "",
                email: ""
            }
        };
    },
    computed: {
        currentUser() {
            return this.$store.getters.user;
        }
    },
    methods: {
        onNameEdit() {
            this.resetEditFlags();
            this.editName = true;
            this.focusByRef("nameEdit");
        },
        onEmailEdit() {
            this.resetEditFlags();
            this.editEmail = true;
            this.focusByRef("emailEdit");
        },
        resetEditFlags() {
            this.editName = false;
            this.editEmail = false;
        },
        navigateToHome() {
            navigateToPath("/home");
        },
        getInitials(name: any) {
            return getInitials(name);
        },
        onAddTaskTypeSubmit() {
            this.addTaskType();
        },
        getTextColor(color: any) {
            return getTextColorByBg(color);
        },
        loadPage() {
            return Promise.all([
                getAllTasksForUser(this.$store.getters.user),
                getAllTaskTypesForUser(this.$store.getters.user)
            ]);
        },
        addTaskType() {
            this.taskTypesLoading = true;
            let newTaskType = {
                label: this.taskTypeLabel.trim(),
                color: this.newTypeColor.trim()
            };
            firebase
                .addTaskType(this.$store.getters.user, newTaskType)
                .then(response => {
                    this.$store.dispatch("LANDING_VISITED", false);
                    this.$store.dispatch("SET_TYPES", [
                        {
                            id: response.id,
                            ...newTaskType
                        },
                        ...this.types
                    ]);
                    this.types = this.$store.getters.types;
                    this.$store.dispatch(
                        "SHOW_SNACK",
                        this.$t("toast.success.label")
                    );
                    this.taskTypeLabel = "";
                })
                .catch(err => {
                    this.$store.dispatch(
                        "SHOW_SNACK",
                        this.$t("toast.error.label")
                    );
                })
                .finally(() => {
                    this.taskTypesLoading = false;
                });
        },
        focusByRef(name: any) {
            this.$nextTick(() => {
                //@ts-ignore
                this.$refs[name].focus();
            });
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
                    console.log(err);
                })
                .finally(() => {
                    this.pageLoading = false;
                    this.taskTypesLoading = false;
                });
        } else {
            this.types = this.$store.getters.types;
        }
        this.user = this.$store.getters.user;
    }
});
</script>
<style scoped>
.text-item {
    z-index: 10;
}
.edit-icon {
    display: none;
}
.edit-button {
    z-index: 10;
    min-width: 32px;
    min-height: 24px;
}
.editable-item:hover .edit-icon {
    display: contents;
    cursor: pointer;
}
</style>