<template>
    <v-toolbar :dark="dark" :color="primary? 'primary':''" flat class="px-3" height="80">
        <slot name="left">
            <div class="fallback-content fallback-left"></div>
        </slot>
        <v-spacer></v-spacer>
        <slot name="center">
            <div class="fallback-content"></div>
        </slot>
        <v-spacer></v-spacer>
        <slot name="right">
            <div class="fallback-content fallback-right"></div>
        </slot>
    </v-toolbar>
</template>
<script lang="ts">
import Vue from "vue";
export default Vue.extend({
    name: "Topbar",
    props: {
        dark: {
            type: Boolean,
            default: false
        },
        primary: {
            type: Boolean,
            default: false
        }
    }
});
</script>
<style scoped>
.fallback-content {
    width: 48px;
    height: 48px;
}
.fallback-left {
    margin-left: -12px;
}
.fallback-right {
    margin-right: -12px;
}
</style>