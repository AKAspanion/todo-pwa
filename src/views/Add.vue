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
        <app-container></app-container>
    </div>
</template>

<script lang="ts">
import Vue from "vue";
import Topbar from "@/components/Topbar.vue";
import AppContainer from "@/components/AppContainer.vue";
import { navigateToPath } from "@/util";
export default Vue.extend({
    components: {
        Topbar,
        AppContainer
    },
    methods: {
        navigateTo(path: any) {
            navigateToPath(path);
        }
    }
});
</script>
