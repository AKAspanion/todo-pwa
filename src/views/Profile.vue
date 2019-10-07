<template>
    <div>
        <bar-top dark primary>
            <template #left>
                <v-btn icon @click="navigateToHome">
                    <v-icon>mdi-arrow-left</v-icon>
                </v-btn>
            </template>

            <template #center>
                <v-chip small outlined>Profile</v-chip>
            </template>

            <template #right>
                <v-btn icon @click="navigateToHome">
                    <v-icon>mdi-close</v-icon>
                </v-btn>
            </template>
        </bar-top>

        <container-app coloured elevated-bg>
            <div class="pt-3 pb-6">
                <v-avatar size="100" color="white">
                    <template v-if="currentUser.photoURL">
                        <v-img :src="currentUser.photoURL"></v-img>
                    </template>
                    <template v-else>
                        <div
                            class="display-1 font-weight-medium"
                        >{{getInitials(currentUser.displayName)}}</div>
                    </template>
                </v-avatar>
            </div>
            <div class="subtitle-2 white--text">{{currentUser.displayName}}</div>
            <!-- <v-chip dark small label outlined>{{currentUser.email}}</v-chip> -->
            <div class="caption font-weight-light white--text">{{currentUser.email}}</div>
            <v-card-text>
                <!-- <div class="pt-9">Hello</div> -->
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
// @ts-ignore
import { navigateToPath, getInitials } from "@/util";
export default Vue.extend({
    name: "Profile",
    components: {
        BarTop,
        ContainerApp
    },
    data() {
        return {};
    },
    computed: {
        currentUser() {
            return this.$store.getters.user;
        }
    },
    methods: {
        navigateToHome() {
            navigateToPath("/home");
        },
        getInitials(name: any) {
            return getInitials(name);
        }
    }
});
</script>
<style>
</style>