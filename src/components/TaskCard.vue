<template>
    <v-hover #default="{ hover }">
        <v-card
            :elevation="hover && $vuetify.breakpoint.smAndUp? 8 : 2"
            :light="getTextColor() !== '#ffffff' ? true : false"
            :dark="getTextColor() === '#ffffff' ? true : false"
            height="100%"
            class="text-left"
            :color="getBgColor()"
        >
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
                        <v-divider light></v-divider>
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
                    <v-card-text :class="$vuetify.breakpoint.xsOnly ? 'pa-3':'pb-3'">
                        <v-layout
                            row
                            wrap
                            align-start
                            justify-space-between
                            class="ma-0 task-container"
                        >
                            <div
                                :style="!isEdit && !isDelete?'width: calc(100% - 36px)':'width: 100%'"
                            >
                                <!-- Editing part -->
                                <div v-if="isEdit">
                                    <v-text-field v-model="localTask.title" solo dense></v-text-field>
                                </div>
                                <div v-if="isEdit" class="mt-n3">
                                    <v-textarea
                                        v-model="localTask.description"
                                        auto-grow
                                        solo
                                        dense
                                    ></v-textarea>
                                </div>
                                <!-- delete part -->
                                <div
                                    v-if="isDelete"
                                    class="body-2 font-weight-bold pb-1 px-1"
                                    :class="getTextColor() !== '#ffffff' ? 'black--text':'white--text'"
                                >{{$t('task.delete')}}</div>
                                <!-- Non edit/delete part -->
                                <div
                                    v-if="!isEdit && !isDelete"
                                    class="font-weight-bold pb-1 overflow-text"
                                    :style="$vuetify.breakpoint.xsOnly ? 'min-height: 24px;':'min-height: 28px;'"
                                    :class="[
                                    $vuetify.breakpoint.xsOnly ? 'body-2':'body-1',
                                    getTextColor() !== '#ffffff' ? 'black--text':'white--text'
                                ]"
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
                            </div>
                            <div
                                v-if="!isEdit && !isDelete"
                                class="mr-n1"
                                style="margin-top: -2px !important"
                            >
                                <v-btn
                                    icon
                                    :disabled="disabled"
                                    :small="$vuetify.breakpoint.xsOnly"
                                    :color="getTextColor() === '#ffffff' ? 'white':'black'"
                                    @click.stop="task.status === 'todo' ? $emit('check', task): $emit('uncheck', task)"
                                >
                                    <v-icon
                                        :small="$vuetify.breakpoint.xsOnly"
                                    >{{task.status === 'todo' ? 'mdi-check': 'mdi-close'}}</v-icon>
                                </v-btn>
                            </div>
                        </v-layout>
                        <div
                            v-if="!isEdit && !isDelete"
                            class="task-desc pt-1"
                            :class="[
                                $vuetify.breakpoint.xsOnly ? 'caption':'body-2',
                                task.status == 'done' ? 'line-through-text':'', 
                                getTextColor() !== '#ffffff' ? 'black--text':'white--text'
                            ]"
                        >{{task.description}}</div>
                    </v-card-text>
                    <div>
                        <v-card-text
                            v-if="!isEdit && !isDelete"
                            :class="$vuetify.breakpoint.xsOnly ? 'pa-3':'py-3'"
                        >
                            <div>
                                <v-chip
                                    label
                                    class="mr-2 mb-1"
                                    :key="tag.id"
                                    :value="tag.id"
                                    :title="tag.label"
                                    :disabled="disabled"
                                    v-for="tag in task.type"
                                    :small="$vuetify.breakpoint.xsOnly"
                                    @click.stop="$emit('type-select', tag)"
                                    :text-color="task.status == 'done' ? '#808080':tag.color"
                                    :color="getTextColorForBg(tag.color)"
                                >{{ tag.label }}</v-chip>
                            </div>
                        </v-card-text>
                        <v-divider light></v-divider>
                        <v-card-actions
                            :class="$vuetify.breakpoint.xsOnly ? 'pl-3 pr-2':'pl-4 pr-3'"
                        >
                            <div v-if="!isEdit && !isDelete">
                                <v-icon
                                    :small="$vuetify.breakpoint.xsOnly"
                                    :color="getTextColor() === '#ffffff' ? 'white':'black'"
                                >mdi-clock</v-icon>
                            </div>
                            <v-tooltip v-if="!isEdit && !isDelete" bottom>
                                <template #activator="{ on }">
                                    <div
                                        v-on="on"
                                        class="task-time overflow-text"
                                        :class="[
                                        $vuetify.breakpoint.xsOnly ? 'pl-1 caption':'pl-2 body-2',
                                        getTextColor() !== '#ffffff' ? 'black--text':'white--text'
                                    ]"
                                    >{{getCalendarDate()}}</div>
                                </template>
                                <span>{{getCalendarDate()}}</span>
                            </v-tooltip>
                            <v-spacer v-if="!isEdit && !isDelete"></v-spacer>
                            <div v-if="!isEdit && !isDelete">
                                <v-btn
                                    icon
                                    v-if="task.status == 'todo'"
                                    :disabled="disabled"
                                    :small="$vuetify.breakpoint.xsOnly"
                                    @click.stop="onModalCancel(); isEdit = true"
                                    :color="getTextColor() === '#ffffff' ? 'white':'black'"
                                >
                                    <v-icon :small="$vuetify.breakpoint.xsOnly">mdi-pencil</v-icon>
                                </v-btn>
                            </div>
                            <div v-if="!isEdit && !isDelete">
                                <v-btn
                                    icon
                                    :disabled="disabled"
                                    :small="$vuetify.breakpoint.xsOnly"
                                    @click.stop="isDelete = true"
                                    :color="getTextColor() === '#ffffff' ? 'white':'black'"
                                >
                                    <v-icon :small="$vuetify.breakpoint.xsOnly">mdi-delete</v-icon>
                                </v-btn>
                            </div>
                            <div v-if="isEdit || isDelete" class="ml-n1">
                                <v-btn
                                    icon
                                    :disabled="disabled"
                                    @click.stop="onModalCancel();isEdit = false; isDelete = false;"
                                    :color="getTextColor() === '#ffffff' ? 'white':'black'"
                                >
                                    <v-icon>mdi-close</v-icon>
                                </v-btn>
                            </div>
                            <v-spacer v-if="isEdit || isDelete"></v-spacer>
                            <div v-if="isEdit || isDelete" class="mr-n1">
                                <v-btn
                                    icon
                                    :disabled="disabled"
                                    @click.stop="onModalCheck(); isEdit = false; isDelete = false;"
                                    :color="getTextColor() === '#ffffff' ? 'white':'black'"
                                >
                                    <v-icon>mdi-check</v-icon>
                                </v-btn>
                            </div>
                        </v-card-actions>
                    </div>
                </v-layout>
            </template>
        </v-card>
    </v-hover>
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
            isDelete: false,
            isEdit: false,
            localTask: {}
        };
    },
    methods: {
        getTextColor() {
            return this.getTextColorForBg(this.getBgColor());
        },
        getBgColor() {
            if (this.task.status === "todo") {
                if (this.task.type.length) {
                    return this.task.type[0].color;
                } else {
                    if (this.$vuetify.theme.dark) {
                        return "#303030";
                    } else {
                        return "#ffffff";
                    }
                }
            }
            return "#808080";
        },
        getTextColorForBg(color: any) {
            return getTextColorByBg(color);
        },
        getCalendarDate() {
            return getCalendarDate(this.task.date + "T" + this.task.time);
        },
        onModalCheck() {
            if (this.isDelete && !this.isEdit) {
                this.$emit("delete", this.task);
            }
            if (!this.isDelete && this.isEdit) {
                this.$emit("edit", this.localTask);
            }
        },
        onModalCancel() {
            this.localTask = {
                ...this.task
            };
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
    white-space: pre-wrap;
    line-height: 1.2em !important;
}
.task-time {
    padding-top: 3px;
}
.task-container >>> textarea {
    font-size: 14px !important;
    margin-top: 4px !important;
}
.task-container >>> input {
    font-size: 14px !important;
}

@media only screen and (max-width: 600px) {
    .task-container >>> textarea {
        font-size: 12px !important;
        margin-top: 2px !important;
    }
    .task-container >>> input {
        font-size: 14px !important;
    }
}
</style>