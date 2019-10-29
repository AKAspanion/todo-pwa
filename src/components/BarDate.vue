<template>
    <div>
        <div v-if="loading" class="bar-date-loader">
            <v-layout row class="ma-0">
                <v-card
                    light
                    width="48"
                    height="48"
                    class="ma-3"
                    color="white"
                    flat
                    v-for="i in 20"
                    :key="i"
                >
                    <div class="shimmer light--animate date-shimmer"></div>
                    <div class="shimmer light--animate month-shimmer"></div>
                </v-card>
            </v-layout>
        </div>
        <v-slide-group v-else v-model="model">
            <v-slide-item
                :key="index"
                :disabled="disabled"
                :value="date.model"
                v-for="(date,index) in dates"
                v-slot:default="{ active, toggle }"
            >
                <v-card
                    light
                    width="48"
                    height="48"
                    class="ma-3"
                    :flat="!active"
                    @click="toggle"
                    @keyup.enter="toggle"
                    :elevation="active? 6:0"
                    :color="active ? 'white' : 'primary'"
                >
                    <v-layout
                        row
                        fill-height
                        align-center
                        justify-center
                        class="ma-0 caption date-card"
                    >
                        <div>
                            {{date.date}}
                            <br />
                            {{date.day}}
                        </div>
                    </v-layout>
                </v-card>
            </v-slide-item>
            <v-slide-item>
                <v-card width="48" height="48" class="ma-3" flat color="primary">
                    <v-layout
                        row
                        fill-height
                        align-center
                        justify-center
                        class="ma-0 caption date-card"
                    >
                        <v-menu :close-on-content-click="false">
                            <template #activator="{ on }">
                                <v-btn dark icon v-on="on">
                                    <v-icon>mdi-calendar</v-icon>
                                </v-btn>
                            </template>
                            <v-card>
                                <v-date-picker
                                    reactive
                                    full-width
                                    color="primary"
                                    ref="datePicker"
                                    v-model="modelDate"
                                    :locale="$i18n.locale"
                                    :landscape="$vuetify.breakpoint.mdAndUp"
                                ></v-date-picker>
                            </v-card>
                        </v-menu>
                    </v-layout>
                </v-card>
            </v-slide-item>
        </v-slide-group>
    </div>
</template>
<script lang="ts">
//@ts-ignore
import { getMomentDate, getShortMonth, getNumberDay, getWeekDay } from "@/util";
import Vue from "vue";
export default Vue.extend({
    props: ["value", "refresh", "loading", "disabled"],
    data() {
        return {
            dates: [],
            model: this.value
        };
    },
    watch: {
        modelDate: {
            handler(newValue, oldValue) {
                if (newValue != oldValue) {
                    // @ts-ignore
                    this.$emit("input", newValue);
                }
            },
            deep: true,
            immediate: true
        },
        refresh: {
            handler(newValue) {
                if (newValue) {
                    // @ts-ignore
                    this.populateDates();
                }
            },
            deep: true,
            immediate: true
        }
    },
    computed: {
        modelDate: {
            get() {
                //@ts-ignore
                return this.model;
            },
            set(val) {
                //@ts-ignore
                this.model = val;
            }
        }
    },
    methods: {
        populateDates() {
            let newDates = [];
            let today: any = new Date();
            for (let i = 0; i <= 15; i++) {
                let next: any = new Date();
                next.setDate(today.getDate() + i);
                let date: any = {
                    day: getWeekDay(next),
                    date: getNumberDay(next),
                    month: getShortMonth(next),
                    model: getMomentDate(next).substr(0, 10)
                };
                //@ts-ignore
                newDates.push(date);
            }
            //@ts-ignore
            this.dates = [...newDates];
            this.$emit("after-refresh");
        }
    },
    created() {
        //@ts-ignore
        this.populateDates();
    }
});
</script>
<style scoped>
.date-card {
    line-height: 1.2em !important;
}
.bar-date-loader {
    height: 72px;
    overflow: hidden;
}
.date-shimmer {
    width: 20px;
    height: 16px;
    margin: 6px auto;
}
.month-shimmer {
    width: 24px;
    height: 12px;
    margin: 0 auto;
}
</style>