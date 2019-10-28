'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions


exports.testFunction = functions.https.onRequest(async (req, res) => {
    var fcm = {};
    var messages = [];
    var db = admin.firestore();
    const fcmPromise = db.collection("fcm").get();
    const taskPromise = db.collection("tasks").get();
    let data = await Promise.all([fcmPromise, taskPromise])
    data[0].forEach(doc => {
        fcm[doc.id] = doc.data();
    });
    data[1].forEach(doc => {
        let task = doc.data();
        if (fcm[task.uid] && !task.indefinite && task.status !== 'done') {
            let inputDate = task.date;
            let inputTime = task.time.replace(':', '.');
            var indiaTime = new Date().toLocaleString("en-US", {
                timeZone: "Asia/Kolkata"
            });
            indiaTime = new Date(indiaTime);
            let currDate = indiaTime.toLocaleString().substr(0, 10);
            let currTime = indiaTime.toString().substr(16, 5).replace(':', '.');
            let timeDiff = inputTime - currTime;
            if (currDate === inputDate && timeDiff <= 1 && timeDiff > 0) {
                messages = messages.concat({
                    payload: {
                        notification: {
                            title: 'Task reminder',
                            body: `Upcoming task "${task.title}" at ${task.time}Hrs`,
                            icon: 'https://firebasestorage.googleapis.com/v0/b/spanion-todo.appspot.com/o/FCMImages%2Fcheck-all.png?alt=media&token=acf1bf37-6d10-401c-bd7a-ae67991135cf'
                        }
                    },
                    token: fcm[task.uid].token
                })
            }
        }
    });

    (async function loop() {
        for (let i = 0; i < messages.length; i++) {
            // eslint-disable-next-line no-await-in-loop
            const response = await admin.messaging().sendToDevice(messages[i].token, messages[i].payload);
            console.log(messages[i], response.results);
        }
    })();

    // const response = await admin.messaging().sendToDevice('eUr7kU_BmCI:APA91bEGBhmmt1KrRt5czXLxARDSickETVmGXyjcBdaoo01wqOS-woXQzw-9PPTYR_70IObSvBXr6PqbtO7Y0VKRJ5hdmcgUdeHWxSAknFc_shvuWR300C-jKcFjs1LoWp5StAZhP9s5', {
    //     notification: {
    //         title: 'Task reminder',
    //         body: `Upcoming task`
    //     }
    // })
    // results = response.results;
    // messages.forEach(async (message) => {
    //     const response = await admin.messaging().sendToDevice(message.token.toString(), message.payload);
    //     console.log(response.results);
    //     results = results.concat(response.results);
    // })
    //     return Promise.all(messages.map(message => {
    //         console.log(message.token);
    //         return admin.messaging().sendToDevice(message.token.toString(), message.payload);
    //     }));
    // })
    // .then((data) => {
    //     res.send([fcm, messages, data]);
    //     return ''
    // })
    // .catch(reason => {
    //     res.send(reason);
    // })
    res.send([fcm, messages]);
})




// exports.testSchedule = functions.pubsub.schedule('every 2 minutes').onRun((context) => {

//     /**
//      * pseudo code: 
//      *  1. function fires and retrieves all tasks(Array) and all fcm by uid(Object)
//      *  2. loop through all tasks 
//      *  3. check if fcm is valid for that task and task is not indefinite and task status is not done
//      *  4. if false move on 
//      *  5. if true, create a notification by using the the time and send to user
//      */
//     firebase.firestore().collection('tasks').get((snapshot) => {
//         snapshot.forEach((task) => {

//         })
//     })
//     const tokens = ['dE4fDtBXhzc:APA91bGUyxzMD_ICRpk_DalV6zdpL4gRPkOlGlhojvy-4cGoLiPM2a6-RWIzBtL4DMx5_7B0_3Yub_tha1ziWpg8HB9QH1sf6vO-elhgWFpHct49CI1cBloNSa_aIVf3Lye0cd_en4gV'];
//     const payload = {
//         notification: {
//             title: 'You have a new message!',
//             body: `Coming from you.`
//         }
//     };
//     return admin.messaging().sendToDevice(tokens, payload);
// });