<template>
    <v-toolbar
        flat
        height="80"
        :dark="dark"
        :color="primary? 'primary':''"
        :class="$vuetify.breakpoint.smAndUp ? 'px-3':''"
    >
        <div class="fallback-content fallback-left">
            <slot name="left"></slot>
        </div>
        <v-spacer></v-spacer>
        <div class="fallback-content">
            <slot name="center"></slot>
        </div>
        <v-spacer></v-spacer>
        <div class="fallback-content fallback-right">
            <slot name="right"></slot>
        </div>
    </v-toolbar>
</template>
<script lang="ts">
import Vue from "vue";
export default Vue.extend({
    name: "BarTop",
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
    min-width: 48px;
}
.fallback-left {
    margin-left: -12px;
}
.fallback-right {
    margin-right: -12px;
}
</style>