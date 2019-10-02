const moment = require('moment');

export const getReadableDate = (date) => {
    let dateTime = new Date(date);
    return moment(dateTime).format("dddd[,] MMMM Do[,] YYYY")
}
export const get12FormatTime = (time) => {
    return moment(time, "HH:mm").format("hh:mm A")
}