<template>
    <div class="home">
        <v-card :dark="dark" flat tile height="calc(100vh - 80px - 56px)" class="app-contain">
            <div class="content-wrapper">
                <div
                    v-if="elevatedBg"
                    class="elevated-bg"
                    :style="{ height: `calc(${bgHeight} - 30px)`}"
                ></div>
                <div
                    class="content-bg"
                    :class="[coloured? 'primary':'']"
                    :style="{ height: `${bgHeight}`}"
                ></div>
                <div class="content">
                    <slot></slot>
                </div>
            </div>
        </v-card>
    </div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
    props: {
        dark: [Boolean],
        coloured: [Boolean],
        elevatedBg: [Boolean],
        bgHeight: {
            type: String,
            default: "200px"
        }
    }
});
</script>
<style scoped>
.content-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
}
.content-bg,
.elevated-bg {
    width: 100%;
    position: absolute;
    z-index: 3;
    border-bottom-right-radius: 30px;
    border-bottom-left-radius: 30px;
    top: 0;
    left: 0;
}
.elevated-bg {
    top: 30px;
    z-index: 2;
    box-shadow: 0 4px 5px 0 rgba(0, 0, 0, 0.14),
        0 1px 10px 0 rgba(0, 0, 0, 0.12), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
}
.content {
    position: absolute;
    text-align: center;
    width: 100%;
    height: 100%;
    z-index: 12;
}
.app-contain {
    overflow-y: scroll;
}
</style>