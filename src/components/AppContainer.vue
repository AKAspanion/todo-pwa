<template>
    <div class="home">
        <v-card :dark="dark" flat tile height="calc(100vh - 80px - 56px)">
            {{primaryColor}}
            <div class="content-wrapper">
                <div class="content-bg" :class="primary? 'primary':''"></div>
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
.content-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
}
.content-bg {
    width: 100%;
    height: 200px;
    position: absolute;
    z-index: 10;
    border-bottom-right-radius: 32px;
    border-bottom-left-radius: 32px;
    top: 0;
    left: 0;
}
.content {
    position: absolute;
    text-align: center;
    width: 100%;
    height: 100%;
    z-index: 12;
}
</style>