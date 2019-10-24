<template>
    <div>
        <template v-if="taskList.length">
            <waterfall :percent="percent">
                <waterfall-item v-for="(task, index) in taskList" :key="index">
                    <v-card flat :class="gridClasses">
                        <task-card
                            :task="task"
                            :loading="loading"
                            :disabled="disabled"
                            :class="disabled?'disabled-list':''"
                            @type-select="(v) => $emit('type-select', v)"
                            @uncheck="(v) => $emit('uncheck', v)"
                            @delete="(v) => $emit('delete', v)"
                            @check="(v) => $emit('check', v)"
                            @edit="(v) => $emit('edit', v)"
                        ></task-card>
                    </v-card>
                </waterfall-item>
            </waterfall>
        </template>
        <template v-else>
            <template v-if="loading">
                <waterfall :percent="percent">
                    <waterfall-item v-for="index in 4" :key="index">
                        <v-card flat :class="gridClasses">
                            <task-card :task="{}" :loading="true"></task-card>
                        </v-card>
                    </waterfall-item>
                </waterfall>
            </template>
            <template v-else>
                <v-card
                    outlined
                    width="100%"
                    class="text-left pa-4"
                    :class="$vuetify.breakpoint.xsOnly ? 'mx-1':'mx-3'"
                >
                    <div class="subtitle-2">{{noDataObject.title}}</div>
                    <div class="caption">{{noDataObject.caption}}</div>
                    <slot name="no-data"></slot>
                </v-card>
            </template>
        </template>
    </div>
</template>
<script lang="ts">
import Vue from "vue";
//@ts-ignore
import { Waterfall, WaterfallItem } from "vue2-waterfall";
import TaskCard from "@/components/TaskCard.vue";
export default Vue.extend({
    components: {
        TaskCard,
        Waterfall,
        WaterfallItem
    },
    props: {
        taskList: {
            type: Array,
            required: true
        },
        loading: {
            type: Boolean,
            default: false
        },
        disabled: {
            type: Boolean,
            default: false
        },
        compact: {
            type: Boolean,
            default: true
        },
        noDataObject: {
            type: Object,
            default: () => {
                return {
                    title: "No data found",
                    caption: "Perform some action to populate data"
                };
            }
        }
    },
    computed: {
        percent() {
            switch (this.$vuetify.breakpoint.name) {
                case "xs":
                    if (!this.compact) {
                        return [1];
                    } else {
                        return [1, 1];
                    }
                case "sm":
                    return [1, 1];
                case "md":
                    return [1, 1, 1];
                case "lg":
                    return [1, 1, 1];
                case "xl":
                    return [1, 1, 1, 1];
            }
        },
        gridClasses() {
            switch (this.$vuetify.breakpoint.name) {
                case "xs":
                    return "pa-1";
                case "sm":
                    return "pa-2";
                case "md":
                    return "pa-2";
                case "lg":
                    return "pa-3";
                case "xl":
                    return "pa-3";
            }
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