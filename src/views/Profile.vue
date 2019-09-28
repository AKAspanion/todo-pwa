<template>
    <div>
        <topbar dark primary>
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
        </topbar>

        <app-container primary>
            <div class="pt-3 pb-5">
                <v-avatar size="100">
                    <v-img :src="currentUser.photoURL"></v-img>
                </v-avatar>
            </div>
            <div class="subtitle-2 white--text">{{currentUser.displayName}}</div>
            <div class="caption font-weight-light white--text">{{currentUser.email}}</div>
            <v-card-text>
                <!-- <div class="pt-9">Hello</div> -->
            </v-card-text>
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
    name: "Profile",
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
    methods: {
        navigateToHome() {
            navigateToPath("/home");
        },
        onSignoutClick() {
            this.logout();
        },
        logout() {
            firebase
                .signOut()
                .then(() => {
                    this.$store.dispatch("SHOW_SNACK", "Signout Succes!");
                })
                .catch(() => {
                    this.$store.dispatch(
                        "SHOW_SNACK",
                        "Error Signing out. Please try later!"
                    );
                });
        }
    }
});
</script>
<style>
</style>