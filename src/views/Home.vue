<template>
    <div class="home">
        <topbar>
            <template #left>
                <span class="subtitle-1">TODO</span>
            </template>
            <template #center>
                <v-chip small outlined>Home</v-chip>
            </template>
            <template #right>
                <v-btn icon>
                    <v-icon>mdi-dots-horizontal</v-icon>
                </v-btn>
            </template>
        </topbar>
        <app-container>
            
        </app-container>
    </div>
</template>

<script lang="ts">
import Vue from "vue";
import FirebaseWeb from "../firebase";
const firebase = new FirebaseWeb();

import Topbar from "@/components/Topbar.vue";
import AppContainer from "@/components/AppContainer.vue";
import { navigateToPath } from "@/util";

export default Vue.extend({
    components: {
        Topbar,
        AppContainer
    },
    data() {
        return {};
    },
    computed: {
        currentUser() {
            return this.$store.getters.user;
        }
    },
    methods: {},
    mounted() {}
});
</script>
<style scoped>
.content-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
}
.content-bg {
    width: 100%;
    height: 200px;
    position: absolute;
    z-index: 10;
    background: #1976d2;
    border-bottom-right-radius: 28px;
    border-bottom-left-radius: 28px;
    top: 0;
    left: 0;
}
.content {
    position: absolute;
    z-index: 12;
}
</style>