<template>
    <v-slide-group v-model="model">
        <v-slide-item
            :key="index"
            :value="date.model"
            v-for="(date,index) in dates"
            v-slot:default="{ active, toggle }"
        >
            <v-card
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
                            <v-btn icon v-on="on">
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
</template>
<script lang="ts">
//@ts-ignore
import { getMomentDate, getShortMonth, getNumberDay, getWeekDay } from "@/util";
import Vue from "vue";
export default Vue.extend({
    props: ["value"],
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
                this.dates.push(date);
            }
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
</style>