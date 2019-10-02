<template>
    <v-card
        dark
        class="text-left"
        :class="task.status === 'done' ? 'done-task dark':''"
        :color="getRandom()"
    >
        <v-card-text class="pb-3">
            <div class="body-2 font-weight-bold pb-1 white--text">{{task.title}}</div>
            <div class="caption task-desc white--text">{{task.description}}</div>
            <div class="pt-6">
                <v-chip
                    label
                    x-small
                    light
                    color="white"
                    class="mr-3"
                    :text-color="tag.color"
                    :key="tag.id"
                    :value="tag.id"
                    v-for="tag in task.type"
                >{{ tag.label }}</v-chip>
            </div>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="px-3">
            <div>
                <v-icon small>mdi-clock</v-icon>
            </div>
            <div class="pl-1 caption task-time white--text">{{task.time}}</div>
            <v-spacer></v-spacer>
            <v-btn icon x-small>
                <v-icon x-small>mdi-pencil</v-icon>
            </v-btn>
        </v-card-actions>
    </v-card>
</template>
<script lang="ts">
import Vue from "vue";
export default Vue.extend({
    props: {
        task: {
            type: Object,
            required: true
        }
    },
    methods: {
        getRandom() {
            if (this.task.type.length) {
                return this.task.type[
                    Math.floor(Math.random() * this.task.type.length)
                ].color;
            } else {
                return "#333";
            }
        }
    }
});
</script>
<style scoped>
.done-task {
    filter: grayscale(100%);
    background: red;
}
.task-desc {
    line-height: 1em !important;
}
.task-time {
    padding-top: 2px;
}
</style>