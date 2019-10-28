<template>
    <div>
        <bar-top dark primary>
            <template #left>
                <v-btn icon @click="navigateToHome">
                    <v-icon>mdi-arrow-left</v-icon>
                </v-btn>
            </template>
            <template #center>
                <v-chip small outlined>{{$t('Notification')}}</v-chip>
            </template>
            <template #right>
                <container-menu></container-menu>
            </template>
        </bar-top>
        <container-app></container-app>
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