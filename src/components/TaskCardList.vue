<template>
    <v-container fill-height :grid-list-xl="$vuetify.breakpoint.smAndUp" fluid pa-0>
        <v-layout row wrap fill-height>
            <template v-if="taskList.length">
                <template v-for="(task, index) in taskList">
                    <v-flex
                        lg4
                        sm6
                        :key="index"
                        :xs6="compact && $vuetify.breakpoint.xsOnly"
                        :xs12="!compact && $vuetify.breakpoint.xsOnly"
                    >
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
                    </v-flex>
                </template>
            </template>
            <template v-else>
                <template v-if="loading">
                    <template v-for="i in 2">
                        <v-flex
                            lg4
                            sm6
                            :key="i"
                            :xs6="compact && $vuetify.breakpoint.xsOnly"
                            :xs12="!compact && $vuetify.breakpoint.xsOnly"
                        >
                            <task-card :task="{}" :loading="true"></task-card>
                        </v-flex>
                    </template>
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
    }
});
</script>
<style scoped>
.disabled-list {
    pointer-events: none;
    cursor: default;
}
</style>