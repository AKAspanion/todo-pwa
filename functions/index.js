const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions


// exports.testSchedule = functions.pubsub.schedule('every 45 minutes').onRun((context) => {
//     const tokens = ['dE4fDtBXhzc:APA91bGUyxzMD_ICRpk_DalV6zdpL4gRPkOlGlhojvy-4cGoLiPM2a6-RWIzBtL4DMx5_7B0_3Yub_tha1ziWpg8HB9QH1sf6vO-elhgWFpHct49CI1cBloNSa_aIVf3Lye0cd_en4gV'];
//     const payload = {
//         notification: {
//             title: 'You have a new message!',
//             body: `Coming from you.`
//         }
//     };
//     return admin.messaging().sendToDevice(tokens, payload);
// });