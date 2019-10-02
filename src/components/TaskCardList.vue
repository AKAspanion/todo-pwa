<template>
    <v-container fill-height grid-list-lg fluid pa-0>
        <v-layout row wrap fill-height>
            <template v-for="(task, index) in taskList">
                <v-flex xs6 :key="index">
                    <task-card :task="task"></task-card>
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
        }
    }
});
</script>