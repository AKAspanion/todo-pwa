<template>
    <div>
        <bar-top dark primary>
            <template #left>
                <v-btn icon @click="navigateToHome">
                    <v-icon>mdi-arrow-left</v-icon>
                </v-btn>
            </template>
            <template #center>
                <v-chip small outlined>{{ $t('profile') }}</v-chip>
            </template>
            <template #right>
                <container-menu></container-menu>
            </template>
        </bar-top>
        <container-app coloured elevated-bg bg-height="224px">
            <div class="pt-2 pb-4">
                <v-avatar
                    size="110"
                    :color="!$vuetify.theme.dark ? 'white' : '#404040'"
                >
                    <template v-if="currentUser.photoURL">
                        <v-img :src="currentUser.photoURL"></v-img>
                    </template>
                    <template v-else>
                        <div
                            v-if="currentUser.displayName"
                            class="display-1 font-weight-medium"
                        >
                            {{ getInitials(currentUser.displayName) }}
                        </div>
                        <v-icon v-else color="primary">mdi-face</v-icon>
                    </template>
                </v-avatar>
            </div>
            <v-layout
                row
                wrap
                align-center
                justify-center
                style="min-height: 40px;"
                class="ma-0 mr-n8 editable-item mb-n2"
            >
                <v-text-field
                    solo
                    light
                    dense
                    class="mb-n6"
                    ref="nameEdit"
                    v-if="editName"
                    v-model="user.displayName"
                    style="max-width: 300px"
                ></v-text-field>
                <div v-else class="title white--text text-item">
                    {{ currentUser.displayName || 'NA' }}
                </div>
                <v-icon
                    dark
                    class="mx-2"
                    v-if="editName"
                    @click="resetEditFlags()"
                    >mdi-check</v-icon
                >
                <div v-else class="px-2 edit-button">
                    <v-icon dark small class="edit-icon" @click="onNameEdit()"
                        >mdi-pencil</v-icon
                    >
                </div>
            </v-layout>
            <div class="subtitle-2 mt-3 white--text text-item">
                {{ currentUser.email || 'NA' }}
            </div>
            <v-row no-gutters align="center" justify="center">
                <v-card-text class="mt-6" style="max-width: 500px;">
                    <div class="overline text-left py-3">LABELS</div>
                    <v-card outlined>
                        <v-list>
                            <v-list-item dense>
                                <v-list-item-avatar>
                                    <v-icon
                                        :disabled="taskTypesLoading"
                                        :color="newTypeColor"
                                        >mdi-plus-circle</v-icon
                                    >
                                </v-list-item-avatar>
                                <v-list-item-content class="py-1">
                                    <v-text-field
                                        solo
                                        flat
                                        dense
                                        hide-details
                                        v-model="taskTypeLabel"
                                        :disabled="taskTypesLoading"
                                        @keyup.enter="onAddTaskTypeSubmit"
                                        :placeholder="$t('label.create')"
                                    >
                                    </v-text-field>
                                </v-list-item-content>
                                <v-list-item-action>
                                    <v-menu
                                        left
                                        nudge-top="16"
                                        :close-on-content-click="false"
                                    >
                                        <template #activator="{ on }">
                                            <v-btn
                                                icon
                                                small
                                                v-on="on"
                                                :color="newTypeColor"
                                                :disabled="taskTypesLoading"
                                            >
                                                <v-icon>
                                                    mdi-palette
                                                </v-icon>
                                            </v-btn>
                                        </template>
                                        <v-card width="250">
                                            <v-color-picker
                                                v-model="newTypeColor"
                                                hide-canvas
                                                hide-inputs
                                                hide-swatches
                                            ></v-color-picker>
                                        </v-card>
                                    </v-menu>
                                </v-list-item-action>
                            </v-list-item>
                            <template v-if="taskTypesLoading">
                                <v-row
                                    no-gutters
                                    align="center"
                                    class="px-6 py-4"
                                    v-for="i in 3"
                                    :key="i"
                                >
                                    <div class="animate icon-shimmer"></div>
                                    <div
                                        class="animate title-shimmer ml-11"
                                        style="width: 50%;"
                                    ></div>
                                </v-row>
                            </template>
                            <template v-else>
                                <v-list-item
                                    dense
                                    :key="type.id"
                                    v-for="type in types"
                                >
                                    <v-list-item-avatar>
                                        <v-icon :color="type.color"
                                            >mdi-label</v-icon
                                        >
                                    </v-list-item-avatar>
                                    <v-list-item-content class="pl-3 py-1">{{
                                        type.label
                                    }}</v-list-item-content>
                                </v-list-item>
                            </template>
                        </v-list>
                    </v-card>
                </v-card-text>
            </v-row>
        </container-app>
    </div>
</template>
<script lang="ts">
import Vue from 'vue';
import FirebaseWeb from '../firebase';
const firebase = new FirebaseWeb();

import BarTop from '@/components/BarTop.vue';
import ContainerApp from '@/components/ContainerApp.vue';
import ContainerMenu from '@/components/ContainerMenu.vue';
import {
    navigateToPath,
    getInitials,
    getAllTasksForUser,
    getAllTaskTypesForUser,
    getAllNotificationsForUser,
    getTextColorByBg,
    getRandomHexColor,
    // @ts-ignore
} from '@/util';
export default Vue.extend({
    name: 'Profile',
    components: {
        BarTop,
        ContainerApp,
        ContainerMenu,
    },
    data() {
        return {
            newTypeColor: '#8E00FF',
            taskTypeLabel: '',
            types: [],
            pageLoading: false,
            taskTypesLoading: false,
            editName: false,
            editEmail: false,
            user: {
                displayName: '',
                email: '',
            },
        };
    },
    computed: {
        currentUser() {
            return this.$store.getters.user;
        },
    },
    methods: {
        onNameEdit() {
            this.resetEditFlags();
            this.editName = true;
            this.focusByRef('nameEdit');
        },
        resetEditFlags() {
            this.editName = false;
            this.editEmail = false;
        },
        navigateToHome() {
            navigateToPath('/home');
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
                getAllTaskTypesForUser(this.$store.getters.user),
                getAllNotificationsForUser(this.$store.getters.user),
            ]);
        },
        addTaskType() {
            this.taskTypesLoading = true;
            let newTaskType = {
                label: this.taskTypeLabel.trim(),
                color: this.newTypeColor.trim(),
            };
            firebase
                .addTaskType(this.$store.getters.user, newTaskType)
                .then((response) => {
                    this.$store.dispatch('LANDING_VISITED', false);
                    this.$store.dispatch('SET_TYPES', [
                        {
                            id: response.id,
                            ...newTaskType,
                        },
                        ...this.types,
                    ]);
                    this.types = this.$store.getters.types;
                    this.$store.dispatch(
                        'SHOW_SNACK',
                        this.$t('toast.success.label')
                    );
                    this.taskTypeLabel = '';
                })
                .catch((err) => {
                    this.$store.dispatch(
                        'SHOW_SNACK',
                        this.$t('toast.error.label')
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
        },
    },
    mounted() {
        if (!this.$store.getters.landingVisited) {
            this.pageLoading = true;
            this.taskTypesLoading = true;
            this.loadPage()
                .then((response) => {
                    this.$store.dispatch('SET_TASKS', response[0]);
                    this.$store.dispatch('SET_TYPES', response[1]);
                    this.$store.dispatch('SET_NOTIFICATIONS', response[2]);
                    this.$store.dispatch('LANDING_VISITED', true);
                    this.types = response[1];
                })
                .catch((err) => {
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
        this.newTypeColor = getRandomHexColor();
    },
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
