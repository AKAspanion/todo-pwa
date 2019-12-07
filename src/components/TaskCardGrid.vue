<template>
    <div>
        <template v-if="loading">
            <div>
                <task-card
                    :task="{}"
                    :key="index"
                    class="py-2"
                    v-for="index in 4"
                    :loading="true"
                ></task-card>
            </div>
        </template>
        <template v-else-if="!taskList.length">
            <v-card outlined width="100%" class="text-left pa-4 my-2">
                <div class="subtitle-2">{{ noDataObject.title }}</div>
                <div class="caption">{{ noDataObject.caption }}</div>
                <slot name="no-data"></slot>
            </v-card>
        </template>
        <div>
            <draggable
                group="tasks"
                :value="taskList"
                :disabled="disabled"
                @change="(v) => $emit('change', v)"
                @start="(v) => $emit('change', { start: v })"
                @end="(v) => $emit('change', { end: v })"
            >
                <task-card
                    class="py-2"
                    :task="task"
                    :key="task.id"
                    :loading="loading"
                    :disabled="disabled"
                    v-for="task in taskList"
                    :class="disabled ? 'disabled-list' : ''"
                    @type-select="(v) => $emit('type-select', v)"
                    @uncheck="(v) => $emit('uncheck', v)"
                    @delete="(v) => $emit('delete', v)"
                    @check="(v) => $emit('check', v)"
                    @edit="(v) => $emit('edit', v)"
                ></task-card>
            </draggable>
        </div>
    </div>
</template>
<script lang="ts">
import Vue from 'vue';
//@ts-ignore
import draggable from 'vuedraggable';
import TaskCard from '@/components/TaskCard.vue';
export default Vue.extend({
    components: {
        TaskCard,
        draggable,
    },
    props: {
        taskList: {
            type: Array,
            required: true,
        },
        loading: {
            type: Boolean,
            default: false,
        },
        disabled: {
            type: Boolean,
            default: false,
        },
        noDataObject: {
            type: Object,
            default: () => {
                return {
                    title: 'No data found',
                    caption: 'Perform some action to populate data',
                };
            },
        },
    },
});
</script>
<style scoped>
.disabled-list {
    pointer-events: none;
    cursor: default;
}
</style>
