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
        <v-card flat tile height="calc(100vh - 80px - 56px)"></v-card>
    </div>
</template>

<script lang="ts">
import Vue from "vue";
import FirebaseWeb from "../firebase";
const firebase = new FirebaseWeb();

import Topbar from "@/components/Topbar.vue";
import { navigateToPath } from "@/util";

export default Vue.extend({
    components: {
        Topbar
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
