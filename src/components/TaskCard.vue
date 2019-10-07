<template>
    <v-card
        dark
        height="100%"
        class="text-left"
        :class="task.status === 'done' ? 'done-task dark':''"
        :color="getRandom()"
    >
        <v-layout column fill-height justify-space-between class="ma-0">
            <div>
                <v-card-text class="pb-3">
                    <div class="body-2 font-weight-bold pb-1 white--text">{{task.title}}</div>
                    <div class="caption task-desc white--text">{{task.description}}</div>
                </v-card-text>
            </div>
            <div>
                <v-card-text>
                    <div>
                        <v-chip
                            label
                            light
                            color="white"
                            class="mr-2 mb-1"
                            :text-color="tag.color"
                            :key="tag.id"
                            :value="tag.id"
                            :title="tag.label"
                            v-for="tag in task.type"
                            :x-small="$vuetify.breakpoint.xsOnly"
                            :small="$vuetify.breakpoint.smAndUp"
                        >{{ tag.label }}</v-chip>
                    </div>
                </v-card-text>
                <v-divider></v-divider>
                <v-card-actions class="px-3">
                    <div>
                        <v-icon small>mdi-clock</v-icon>
                    </div>
                    <v-tooltip bottom>
                        <template #activator="{ on }">
                            <div
                                v-on="on"
                                class="pl-1 caption task-time white--text overflow-text"
                            >{{getCalendarDate()}}</div>
                        </template>
                        <span>{{getCalendarDate()}}</span>
                    </v-tooltip>
                    <v-spacer></v-spacer>
                    <div>
                        <v-btn icon x-small>
                            <v-icon x-small>mdi-pencil</v-icon>
                        </v-btn>
                    </div>
                </v-card-actions>
            </div>
        </v-layout>
    </v-card>
</template>
<script lang="ts">
import Vue from "vue";
// @ts-ignore
import { getCalendarDate } from "@/util";
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
        },
        getCalendarDate() {
            return getCalendarDate(this.task.date + "T" + this.task.time);
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
.overflow-text {
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
}
</style>