<template>
    <div>
        <v-progress-linear v-if="loading" indeterminate class="fixed-progress"></v-progress-linear>
        <v-snackbar v-model="snackbar.model" bottom :timeout="5000">
            {{ snackbar.text }}
            <v-btn dark text @click="snackbar.model = false">Close</v-btn>
        </v-snackbar>
        <v-container fluid grid-list-md class="pa-0">
            <transition :name="transitionName" mode="out-in">
                <router-view :key="$route.fullPath"></router-view>
            </transition>
        </v-container>
    </div>
</template>
<script lang="ts">
import Vue from "vue";
export default Vue.extend({
    data() {
        return {
            transitionName: "slide-left"
        };
    },
    computed: {
        themeModel: {
            get() {
                return this.$vuetify.theme.dark;
            },
            set(val: boolean) {
                this.$vuetify.theme.dark = val;
            }
        },
        snackbar: {
            get() {
                return this.$store.getters.snackBar;
            }
        },
        loading: {
            get() {
                return this.$store.getters.loading;
            }
        }
    },
    mounted() {
        // this.themeModel = true;
    }
});
</script>
<style>
.fixed-progress {
    position: fixed !important;
    top: 0;
}
body {
    overflow: hidden;
}
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
    transition-duration: 0.5s;
    transition-property: height, opacity, transform;
    transition-timing-function: cubic-bezier(0.55, 0, 0.1, 1);
    overflow: hidden;
}
.slide-left-enter,
.slide-right-leave-active {
    opacity: 0;
    transform: translate(2em, 0);
}
.slide-left-leave-active,
.slide-right-enter {
    opacity: 0;
    transform: translate(-2em, 0);
}
</style>