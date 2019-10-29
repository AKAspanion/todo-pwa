<template>
    <div>
        <bar-top>
            <template #left>
                <v-btn icon @click="navigateToHome">
                    <v-icon>mdi-arrow-left</v-icon>
                </v-btn>
            </template>
            <template #center>
                <v-chip small outlined>{{$t('notification')}}</v-chip>
            </template>
            <template #right>
                <container-menu>
                    <template #top-list-item>
                        <v-subheader class="overline">{{$t('label.label')}}</v-subheader>
                        <v-list-item link>
                            <v-list-item-content class="text-left py-0">
                                <v-layout class="ma-0" align-center>
                                    <v-checkbox
                                        readonly
                                        class="mb-n3 mt-2"
                                        color="primary"
                                        :ripple="false"
                                        v-model="$store.getters.notificationGrant"
                                    ></v-checkbox>
                                    <v-list-item-title>Notification permission</v-list-item-title>
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
            <div style="width: 100%" :class="$vuetify.breakpoint.xsOnly ? 'px-4':'px-5'">
                <v-layout
                    row
                    align-center
                    justify-space-between
                    class="ma-0 pb-1"
                    :class="$vuetify.breakpoint.xsOnly ? 'px-1':'px-3'"
                >
                    <v-flex xs12 class="pa-0">
                        <div class="overline text-left">{{$t('notification')}}</div>
                    </v-flex>

                    <v-flex xs12 class="pa-0">
                        <v-card outlined width="100%" class="text-left pa-4 my-3">
                            <div class="subtitle-2">No notifications</div>
                            <div class="caption">Task reminder notifications will populate here</div>
                        </v-card>
                    </v-flex>
                </v-layout>
            </div>
        </container-app>
    </div>
</template>
<script lang="ts">
import BarTop from "@/components/BarTop.vue";
import ContainerApp from "@/components/ContainerApp.vue";
import ContainerMenu from "@/components/ContainerMenu.vue";

// @ts-ignore
import { navigateToPath } from "@/util";

import Vue from "vue";
export default Vue.extend({
    name: "Notification",
    components: {
        BarTop,
        ContainerApp,
        ContainerMenu
    },
    methods: {
        navigateToHome() {
            navigateToPath("/home");
        }
    }
});
</script>