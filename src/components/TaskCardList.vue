<template>
    <v-container fill-height grid-list-lg fluid pa-0>
        <v-layout row wrap fill-height>
            <template v-for="(task, index) in taskList">
                <v-flex xs6 :key="index">
                    <task-card
                        :task="task"
                        :class="disabled?'disabled-list':''"
                        :disabled="disabled"
                        @type-select="(v) => $emit('type-select', v)"
                        @uncheck="(v) => $emit('uncheck', v)"
                        @delete="(v) => $emit('delete', v)"
                        @check="(v) => $emit('check', v)"
                        @edit="(v) => $emit('edit', v)"
                    ></task-card>
                </v-flex>
            </template>
        </v-layout>
    </v-container>
</template>
<script lang="ts">
import Vue from "vue";
import TaskCard from "@/components/TaskCard.vue";
export default Vue.extend({
    components: {
        TaskCard
    },
    props: {
        taskList: {
            type: Array,
            required: true
        },
        disabled: {
            type: Boolean,
            default: false
        }
    }
});
</script>
<style scoped>
.disabled-list {
    pointer-events: none;
    cursor: default;
}
</style>