<template>
    <div class="home">
        <v-toolbar flat class="px-3" height="80">
            <v-btn icon>
                <v-icon>mdi-arrow-left</v-icon>
            </v-btn>
            <v-spacer></v-spacer>
            <v-btn icon>
                <v-avatar>
                    <template v-if="currentUser.photoURL">
                        <v-img :src="currentUser.photoURL"></v-img>
                    </template>
                    <template v-else>
                        <v-icon>mdi-face</v-icon>
                    </template>
                </v-avatar>
            </v-btn>
            <v-spacer></v-spacer>
            <v-btn icon>
                <v-icon>mdi-dots-horizontal</v-icon>
            </v-btn>
        </v-toolbar>
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

export default Vue.extend({
    data() {
        return {};
    },
    computed: {
        currentUser() {
            return this.$store.getters.user;
        }
    },
    methods: {
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
    },
    mounted() {}
});
</script>
