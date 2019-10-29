<template>
    <div>
        <bar-top>
            <template #left>
                <v-btn icon @click="navigateToHome">
                    <v-icon>mdi-arrow-left</v-icon>
                </v-btn>
            </template>
            <template #center>
                <v-chip small outlined>{{$t('calendar')}}</v-chip>
            </template>
            <template #right>
                <container-menu></container-menu>
            </template>
        </bar-top>
        <container-app>
            <v-row class="fill-height pa-0 ma-0">
                <v-col class="pa-0">
                    <v-sheet :class="$vuetify.breakpoint.xsOnly ? 'mx-1' :'mx-3'">
                        <v-toolbar flat class="mb-3" height="48">
                            <v-btn
                                :small="$vuetify.breakpoint.xsOnly"
                                outlined
                                @click="setToday"
                            >Today</v-btn>
                            <template v-if="!$vuetify.breakpoint.xsOnly">
                                <v-btn class="ml-2" small fab text @click="prev">
                                    <v-icon small>mdi-chevron-left</v-icon>
                                </v-btn>
                                <v-toolbar-title>{{ title }}</v-toolbar-title>
                                <v-btn class="mr-2" small fab text @click="next">
                                    <v-icon small>mdi-chevron-right</v-icon>
                                </v-btn>
                            </template>
                            <v-spacer></v-spacer>
                            <v-menu bottom right>
                                <template v-slot:activator="{ on }">
                                    <v-btn :small="$vuetify.breakpoint.xsOnly" outlined v-on="on">
                                        <span>{{ typeToLabel[type] }}</span>
                                        <v-icon right>mdi-menu-down</v-icon>
                                    </v-btn>
                                </template>
                                <v-list>
                                    <v-list-item @click="type = 'day'">
                                        <v-list-item-title>Day</v-list-item-title>
                                    </v-list-item>
                                    <v-list-item @click="type = 'week'">
                                        <v-list-item-title>Week</v-list-item-title>
                                    </v-list-item>
                                    <v-list-item @click="type = 'month'">
                                        <v-list-item-title>Month</v-list-item-title>
                                    </v-list-item>
                                </v-list>
                            </v-menu>
                        </v-toolbar>
                        <v-toolbar flat class="mb-3" height="36" v-if="$vuetify.breakpoint.xsOnly">
                            <v-btn small fab text @click="prev">
                                <v-icon small>mdi-chevron-left</v-icon>
                            </v-btn>
                            <v-spacer></v-spacer>
                            <v-toolbar-title>{{ title }}</v-toolbar-title>
                            <v-spacer></v-spacer>
                            <v-btn small fab text @click="next">
                                <v-icon small>mdi-chevron-right</v-icon>
                            </v-btn>
                        </v-toolbar>
                    </v-sheet>
                    <v-sheet
                        :height="`calc(100% - ${!$vuetify.breakpoint.xsOnly ? '48px':'100px'} - 24px - 12px)`"
                        :class="$vuetify.breakpoint.xsOnly ? 'mx-5 my-3 mt-5':'mx-7 my-3'"
                    >
                        <v-calendar
                            :locale="$i18n.locale"
                            ref="calendar"
                            v-model="focus"
                            color="primary"
                            :events="events"
                            event-color="primary"
                            :event-margin-bottom="3"
                            :now="today"
                            :type="type"
                            @click:event="showEvent"
                            @click:more="viewDay"
                            @click:date="viewDay"
                            @change="updateRange"
                        ></v-calendar>
                    </v-sheet>
                </v-col>
            </v-row>
        </container-app>
    </div>
</template>
<script lang="ts">
import BarTop from "@/components/BarTop.vue";
import ContainerApp from "@/components/ContainerApp.vue";
import ContainerMenu from "@/components/ContainerMenu.vue";

// @ts-ignore
import { navigateToPath, getMomentDate } from "@/util";

import Vue from "vue";
export default Vue.extend({
    name: "Calendar",
    components: {
        BarTop,
        ContainerApp,
        ContainerMenu
    },
    data: () => ({
        today: getMomentDate(new Date()).substr(0, 10),
        focus: getMomentDate(new Date()).substr(0, 10),
        type: "month",
        typeToLabel: {
            month: "Month",
            week: "Week",
            day: "Day"
        },
        start: null,
        end: null,
        selectedEvent: {},
        selectedElement: null,
        selectedOpen: false
    }),
    computed: {
        events: {
            get() {
                let validTasks: any = [];
                this.$store.getters.tasks.forEach((element: any) => {
                    if (!element.indefinite) {
                        validTasks.push(element);
                    }
                });
                return validTasks.map((task: any) => {
                    return {
                        name: task.title,
                        start: `${task.date} ${task.time}`,
                        color: "#4285F4"
                    };
                });
            }
        },
        title() {
            const { start, end } = this;
            if (!start || !end) {
                return "";
            }
            //@ts-ignore
            const startMonth = this.monthFormatter(start);
            //@ts-ignore
            const endMonth = this.monthFormatter(end);
            const suffixMonth = startMonth === endMonth ? "" : endMonth;
            //@ts-ignore
            const startYear = start.year;
            //@ts-ignore
            const endYear = end.year;
            const suffixYear = startYear === endYear ? "" : endYear;
            //@ts-ignore
            const startDay = start.day + this.nth(start.day);
            //@ts-ignore
            const endDay = end.day + this.nth(end.day);
            switch (this.type) {
                case "month":
                    return `${startMonth} ${startYear}`;
                case "week":
                case "4day":
                    return `${startMonth} ${startDay} ${startYear} - ${suffixMonth} ${endDay} ${suffixYear}`;
                case "day":
                    return `${startMonth} ${startDay} ${startYear}`;
            }
            return "";
        },
        monthFormatter() {
            //@ts-ignore
            return this.$refs.calendar.getFormatter({
                timeZone: "UTC",
                month: "long"
            });
        }
    },
    mounted() {
        //@ts-ignore
        this.$refs.calendar.checkChange();
    },
    methods: {
        navigateToHome() {
            navigateToPath("/home");
        },
        viewDay({ date }: any) {
            this.focus = date;
            this.type = "day";
        },
        setToday() {
            this.focus = this.today;
        },
        prev() {
            //@ts-ignore
            this.$refs.calendar.prev();
        },
        next() {
            //@ts-ignore
            this.$refs.calendar.next();
        },
        showEvent({ nativeEvent, event }: any) {
            const open = () => {
                this.selectedEvent = event;
                this.selectedElement = nativeEvent.target;
                setTimeout(() => (this.selectedOpen = true), 10);
            };

            if (this.selectedOpen) {
                this.selectedOpen = false;
                setTimeout(open, 10);
            } else {
                open();
            }

            nativeEvent.stopPropagation();
        },
        updateRange({ start, end }: any) {
            this.start = start;
            this.end = end;
        },
        nth(d: any) {
            return d > 3 && d < 21
                ? "th"
                : ["th", "st", "nd", "rd", "th", "th", "th", "th", "th", "th"][
                      d % 10
                  ];
        }
    }
});
</script>