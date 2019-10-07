<template>
    <v-bottom-navigation v-if="showBarNav" fixed grow v-model="navBar">
        <v-btn value="home" @click="navigateTo('/home')">
            <v-icon>mdi-view-grid</v-icon>
        </v-btn>
        <v-btn value="add" @click="navigateTo('/add')">
            <v-icon>mdi-plus</v-icon>
        </v-btn>
        <v-btn value="profile" @click="navigateTo('/profile')">
            <v-avatar v-if="currentUser.photoURL" size="24">
                <v-img :src="currentUser.photoURL"></v-img>
            </v-avatar>
            <v-icon v-else>mdi-face</v-icon>
        </v-btn>
    </v-bottom-navigation>
</template>
<script lang="ts">
import Vue from "vue";
// @ts-ignore
import { navigateToPath } from "@/util";
export default Vue.extend({
    data() {
        return {
            navBar: "home",
            is404: false
        };
    },
    computed: {
        currentUser() {
            return this.$store.getters.user;
        },
        showBarNav() {
            return this.$store.getters.barnav;
        }
    },
    methods: {
        navigateTo(path: string) {
            navigateToPath(path);
        }
    },
    mounted() {
        this.$router.afterEach((to, from) => {
            this.navBar = to.name ? to.name : "home";
        });
    }
});
</script>
<style scoped>
.nav-bar {
    position: fixed;
    z-index: 100;
    width: 100%;
    bottom: 0;
    height: 56px;
}
</style>