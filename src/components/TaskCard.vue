<template>
    <v-card dark height="100%" class="text-left" :color="getBgColor()">
        <v-dialog v-model="deleteModal" persistent max-width="400">
            <v-card class="text-left">
                <v-card-title>Delete</v-card-title>
                <v-card-text>Are you sure you want to delete this task?</v-card-text>
                <v-card-actions class="px-4 pb-4">
                    <v-spacer></v-spacer>
                    <v-btn color="primary" small text @click.stop="deleteModal = false">Cancel</v-btn>
                    <v-btn
                        color="primary"
                        small
                        @click.stop="$emit('delete', task); deleteModal = false;"
                    >Delete</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
        <template v-if="loading">
            <v-layout column fill-height justify-space-between class="ma-0">
                <div>
                    <v-card-text class="pb-3">
                        <v-layout row wrap align-start justify-space-between class="ma-0">
                            <div style="width: calc(100% - 36px)">
                                <div
                                    class="shimmer title-shimmer"
                                    :class="getTextColor() === '#ffffff' ? 'light--animate':'dark--animate'"
                                ></div>
                                <div
                                    class="shimmer subtitle-shimmer"
                                    :class="getTextColor() === '#ffffff' ? 'light--animate':'dark--animate'"
                                ></div>
                            </div>
                            <div
                                class="shimmer icon-shimmer"
                                :class="getTextColor() === '#ffffff' ? 'light--animate':'dark--animate'"
                            ></div>
                        </v-layout>
                    </v-card-text>
                </div>
                <div>
                    <v-card-text class="pb-2 pt-1">
                        <div
                            class="shimmer chip-shimmer"
                            :class="getTextColor() === '#ffffff' ? 'light--animate':'dark--animate'"
                        ></div>
                    </v-card-text>
                    <v-divider></v-divider>
                    <v-card-actions class="px-3 mx-1">
                        <div
                            class="shimmer title-shimmer"
                            :class="getTextColor() === '#ffffff' ? 'light--animate':'dark--animate'"
                            style="width: 50%"
                        ></div>
                        <v-spacer></v-spacer>
                        <div
                            class="shimmer icon-shimmer"
                            :class="getTextColor() === '#ffffff' ? 'light--animate':'dark--animate'"
                        ></div>
                        <div
                            class="shimmer icon-shimmer ml-1"
                            :class="getTextColor() === '#ffffff' ? 'light--animate':'dark--animate'"
                        ></div>
                    </v-card-actions>
                </div>
            </v-layout>
        </template>
        <template v-else>
            <v-layout column fill-height justify-space-between class="ma-0">
                <v-card-text class="pb-3">
                    <v-layout row wrap align-start justify-space-between class="ma-0">
                        <div style="width: calc(100% - 36px)">
                            <div
                                class="body-2 font-weight-bold pb-1 overflow-text"
                                :class="getTextColor() !== '#ffffff' ? 'black--text':'white--text'"
                            >
                                <v-tooltip bottom max-width="50%" nudge-top="4">
                                    <template #activator="{ on }">
                                        <span
                                            v-on="on"
                                            :class="task.status == 'done' ? 'line-through-text':''"
                                        >{{task.title}}</span>
                                    </template>
                                    <span>{{task.title}}</span>
                                </v-tooltip>
                            </div>
                            <div
                                class="caption task-desc"
                                :class="[
                                        task.status == 'done' ? 'line-through-text':'', 
                                        getTextColor() !== '#ffffff' ? 'black--text':'white--text'
                                    ]"
                            >{{task.description}}</div>
                        </div>
                        <div class="mr-n1" style="margin-top: -2px !important">
                            <v-btn
                                icon
                                :disabled="disabled"
                                :x-small="$vuetify.breakpoint.xsOnly"
                                :small="$vuetify.breakpoint.smAndUp"
                                :color="getTextColor() === '#ffffff' ? 'white':'black'"
                                @click.stop="task.status === 'todo' ? $emit('check', task): $emit('uncheck', task)"
                            >
                                <v-icon
                                    :x-small="$vuetify.breakpoint.xsOnly"
                                    :small="$vuetify.breakpoint.smAndUp"
                                >{{task.status === 'todo' ? 'mdi-check': 'mdi-close'}}</v-icon>
                            </v-btn>
                        </div>
                    </v-layout>
                </v-card-text>
                <div>
                    <v-card-text class="pb-3">
                        <div>
                            <v-chip
                                label
                                class="mr-2 mb-1"
                                :key="tag.id"
                                :value="tag.id"
                                :title="tag.label"
                                :disabled="disabled"
                                v-for="tag in task.type"
                                :x-small="$vuetify.breakpoint.xsOnly"
                                :small="$vuetify.breakpoint.smAndUp"
                                @click.stop="$emit('type-select', tag)"
                                :text-color="task.status == 'done' ? '#808080':tag.color"
                                :color="getTextColor() === '#ffffff' ? 'white':'black'"
                            >{{ tag.label }}</v-chip>
                        </div>
                    </v-card-text>
                    <v-divider></v-divider>
                    <v-card-actions class="pl-4 pr-3">
                        <div>
                            <v-icon
                                small
                                :color="getTextColor() === '#ffffff' ? 'white':'black'"
                            >mdi-clock</v-icon>
                        </div>
                        <v-tooltip bottom>
                            <template #activator="{ on }">
                                <div
                                    v-on="on"
                                    class="pl-1 caption task-time overflow-text"
                                    :class="getTextColor() !== '#ffffff' ? 'black--text':'white--text'"
                                >{{getCalendarDate()}}</div>
                            </template>
                            <span>{{getCalendarDate()}}</span>
                        </v-tooltip>
                        <v-spacer></v-spacer>
                        <div>
                            <v-btn
                                icon
                                v-if="task.status == 'todo'"
                                :disabled="disabled"
                                :x-small="$vuetify.breakpoint.xsOnly"
                                :small="$vuetify.breakpoint.smAndUp"
                                @click.stop="$emit('edit', task)"
                                :color="getTextColor() === '#ffffff' ? 'white':'black'"
                            >
                                <v-icon
                                    :x-small="$vuetify.breakpoint.xsOnly"
                                    :small="$vuetify.breakpoint.smAndUp"
                                >mdi-pencil</v-icon>
                            </v-btn>
                        </div>
                        <div>
                            <v-btn
                                icon
                                :disabled="disabled"
                                :x-small="$vuetify.breakpoint.xsOnly"
                                :small="$vuetify.breakpoint.smAndUp"
                                @click.stop="deleteModal = true"
                                :color="getTextColor() === '#ffffff' ? 'white':'black'"
                            >
                                <v-icon
                                    :x-small="$vuetify.breakpoint.xsOnly"
                                    :small="$vuetify.breakpoint.smAndUp"
                                >mdi-delete</v-icon>
                            </v-btn>
                        </div>
                    </v-card-actions>
                </div>
            </v-layout>
        </template>
    </v-card>
</template>
<script lang="ts">
import Vue from "vue";
// @ts-ignore
import { getCalendarDate, getTextColorByBg } from "@/util";
export default Vue.extend({
    props: {
        task: {
            type: Object,
            required: true
        },
        loading: {
            type: Boolean,
            default: false
        },
        disabled: {
            type: Boolean,
            default: false
        }
    },
    data() {
        return {
            deleteModal: false
        };
    },
    methods: {
        getTextColor() {
            return getTextColorByBg(this.getBgColor());
        },
        getBgColor() {
            if (this.task.status === "todo" && this.task.type.length) {
                return this.task.type[0].color;
            } else {
                return "#808080";
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
</style>