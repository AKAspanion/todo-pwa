<template>
    <div>
        <topbar>
            <template #left>
                <v-btn icon @click="navigateToHome">
                    <v-icon>mdi-arrow-left</v-icon>
                </v-btn>
            </template>

            <template #center>
                <v-chip small outlined>Profile</v-chip>
            </template>
        </topbar>
        <v-card flat tile height="calc(100vh - 80px)">
            {{currentUser.displayName}}
            <div class="py-3">
                <v-btn @click="onSignoutClick">Signout</v-btn>
            </div>
        </v-card>
    </div>
</template>
<script lang="ts">
import Vue from "vue";
import FirebaseWeb from "../firebase";
const firebase = new FirebaseWeb();

import Topbar from "@/components/Topbar.vue";
import { navigateToPath } from "@/util";
export default Vue.extend({
    name: "Profile",
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