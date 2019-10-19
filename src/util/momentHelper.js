const moment = require('moment');
import i18n from '../i18n/i18n.ts';

export const getReadableDate = (date) => {
    let dateTime = new Date(date);
    return moment(dateTime).locale(i18n.locale).format("dddd[,] MMMM Do[,] YYYY");
}

export const getCalendarDate = (date) => {
    let dateTime = new Date(date);
    return moment(dateTime).locale(i18n.locale).calendar()
}

export const get12FormatTime = (time) => {
    return moment(time, "HH:mm").locale(i18n.locale).format("hh:mm A")
}

export const getMomentDate = (date) => {
    return moment(date).format();
}

export const getShortMonth = (date) => {
    let dateTime = new Date(date);
    return moment(dateTime).locale(i18n.locale).format("MMM");
}

export const getNumberDay = (date) => {
    let dateTime = new Date(date);
    return moment(dateTime).locale(i18n.locale).format("DD");
}
export const getWeekDay = (date) => {
    let dateTime = new Date(date);
    return moment(dateTime).locale(i18n.locale).format("ddd");
}