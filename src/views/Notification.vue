<template>
    <div>
        <bar-top>
            <template #left>
                <v-btn icon @click="navigateToHome">
                    <v-icon>mdi-arrow-left</v-icon>
                </v-btn>
            </template>
            <template #center>
                <v-chip small outlined>{{ $t('notification') }}</v-chip>
            </template>
            <template #right>
                <container-menu>
                    <template #top-list-item>
                        <v-subheader class="overline">{{
                            $t('label.label')
                        }}</v-subheader>
                        <v-list-item link>
                            <v-list-item-content class="text-left py-0">
                                <v-layout class="ma-0" align-center>
                                    <v-checkbox
                                        readonly
                                        class="mb-n3 mt-2"
                                        color="primary"
                                        :ripple="false"
                                        v-model="
                                            $store.getters.notificationGrant
                                        "
                                    ></v-checkbox>
                                    <v-list-item-title
                                        >Notification
                                        permission</v-list-item-title
                                    >
                                </v-layout>
                            </v-list-item-content>
                            <v-list-item-avatar>
                                <v-avatar small size="36">
                                    <v-icon>mdi-pencil</v-icon>
                                </v-avatar>
                            </v-list-item-avatar>
                        </v-list-item>
                    </template>
                </container-menu>
            </template>
        </bar-top>
        <container-app>
            <div
                style="width: 100%"
                :class="$vuetify.breakpoint.xsOnly ? 'px-4' : 'px-5'"
            >
                <v-layout
                    row
                    align-center
                    justify-space-between
                    class="ma-0 pb-1"
                    :class="$vuetify.breakpoint.xsOnly ? 'px-1' : 'px-3'"
                >
                    <v-flex xs12 class="pa-0">
                        <div class="overline text-left">
                            {{ $t('notification') }}
                        </div>
                    </v-flex>
                    <template v-if="!notifications.length && !pageLoading">
                        <v-flex xs12 class="pa-0">
                            <v-card
                                outlined
                                width="100%"
                                class="text-left pa-4 my-3"
                            >
                                <div class="subtitle-2">No notifications</div>
                                <div class="caption">
                                    Task reminder notifications will populate
                                    here
                                </div>
                            </v-card>
                        </v-flex>
                    </template>
                    <template v-else>
                        <v-flex
                            xs12
                            class="pa-0"
                            :key="index"
                            v-for="(notification, index) in notifications"
                        >
                            <v-card
                                dark
                                width="100%"
                                class="text-left pa-4 mt-3"
                                color="primary"
                            >
                                <div
                                    class="d-flex align-center justify-space-between"
                                >
                                    <div>
                                        <div class="subtitle-2">
                                            {{ notification.title }}
                                        </div>
                                        <div class="caption">
                                            {{ notification.body }}
                                        </div>
                                    </div>
                                    <v-btn
                                        icon
                                        :disabled="pageLoading"
                                        :small="$vuetify.breakpoint.xsOnly"
                                        @click="
                                            deleteNotification(notification)
                                        "
                                        ><v-icon
                                            :small="$vuetify.breakpoint.xsOnly"
                                            >mdi-delete</v-icon
                                        ></v-btn
                                    >
                                </div>
                            </v-card>
                        </v-flex>
                    </template>
                    <template v-if="pageLoading">
                        <div
                            class="ma-4 d-flex align-center"
                            style="width: 100%"
                            v-for="i in 5"
                            :key="i"
                        >
                            <div style="width: 100%" class="mr-8">
                                <div
                                    style="width: 60%"
                                    class="animate title-shimmer my-2"
                                ></div>
                                <div
                                    class="animate subtitle-shimmer my-3"
                                ></div>
                            </div>
                            <div
                                style="width: 30px"
                                class="animate icon-shimmer"
                            ></div>
                        </div>
                    </template>
                </v-layout>
            </div>
        </container-app>
    </div>
</template>
<script lang="ts">
import BarTop from '@/components/BarTop.vue';
import ContainerApp from '@/components/ContainerApp.vue';
import ContainerMenu from '@/components/ContainerMenu.vue';
// @ts-ignore
import {
    navigateToPath,
    getAllTasksForUser,
    getAllTaskTypesForUser,
    getAllNotificationsForUser,
    deleteNotifications,
    // @ts-ignore
} from '@/util';
import FirebaseWeb from '../firebase';
const firebase = new FirebaseWeb();

import Vue from 'vue';
export default Vue.extend({
    name: 'Notification',
    components: {
        BarTop,
        ContainerApp,
        ContainerMenu,
    },
    data() {
        return {
            pageLoading: false,
        };
    },
    computed: {
        notifications() {
            return this.$store.getters.notifications;
        },
        currentUser() {
            // @ts-ignore
            return this.$store.getters.user;
        },
    },
    methods: {
        navigateToHome() {
            navigateToPath('/home');
        },
        deleteNotification(notification: any) {
            this.pageLoading = true;
            firebase
                .deleteNotification(notification)
                .then(() => {
                    return deleteNotifications(
                        notification.id,
                        this.notifications
                    );
                })
                .then((notifications: any) => {
                    this.$store.dispatch('SET_NOTIFICATIONS', notifications);
                    this.$store.dispatch(
                        'SHOW_SNACK',
                        this.$t('toast.success.notification.delete')
                    );
                })
                .catch((err: any) => {
                    this.$store.dispatch(
                        'SHOW_SNACK',
                        this.$t('toast.error.notification.delete')
                    );
                })
                .finally(() => {
                    this.pageLoading = false;
                });
        },
        // @ts-ignore
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
    },
    mounted() {
        if (!this.$store.getters.landingVisited) {
            this.pageLoading = true;
            this.loadPage()
                .catch((e) => e)
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
