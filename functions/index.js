/* eslint-disable no-await-in-loop */
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
    var indiaTime = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Kolkata"
    });
    indiaTime = new Date(indiaTime);
    const fcmPromise = db.collection("fcm").get();
    const taskPromise = db.collection("tasks").get();
    try {
        let data = await Promise.all([fcmPromise, taskPromise])
        data[0].forEach(doc => {
            fcm[doc.id] = doc.data();
        });
        data[1].forEach(doc => {
            let task = doc.data();
            if (fcm[task.uid] && !task.indefinite && task.status !== 'done') {
                let inputDate = task.date;
                let inputTime = task.time.replace(':', '.');
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
                        uid: task.uid,
                        token: fcm[task.uid].token
                    })
                }
            }
        });
        (async function loop() {
            for (let i = 0; i < messages.length; i++) {
                const fcmResponse = await admin.messaging().sendToDevice(messages[i].token, messages[i].payload);
                const dbResponse = await db.collection("notifications").add({
                    uid: messages[i].uid,
                    title: messages[i].payload.notification.title,
                    body: messages[i].payload.notification.body,
                    timestamp: indiaTime.toLocaleString()
                })
                console.log(fcmResponse.results);
                console.log(dbResponse.results);
            }
        })();
        res.send([fcm, messages]);
    } catch (err) {
        res.send(err);
    }
})




exports.testSchedule = functions.pubsub.schedule('every 1 hour').onRun(async () => {

    /**
     * pseudo code: 
     *  1. function fires and retrieves all tasks(Array) and all fcm by uid(Object)
     *  2. loop through all tasks 
     *  3. check if fcm is valid for that task and task is not indefinite and task status is not done
     *  4. if false move on 
     *  5. if true, create a notification by using the the time and send to user
     */
    var fcm = {};
    var messages = [];
    var db = admin.firestore();
    var indiaTime = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Kolkata"
    });
    indiaTime = new Date(indiaTime);
    const fcmPromise = db.collection("fcm").get();
    const taskPromise = db.collection("tasks").get();
    try {
        let data = await Promise.all([fcmPromise, taskPromise])
        data[0].forEach(doc => {
            fcm[doc.id] = doc.data();
        });
        data[1].forEach(doc => {
            let task = doc.data();
            if (fcm[task.uid] && !task.indefinite && task.status !== 'done') {
                let inputDate = task.date;
                let inputTime = task.time.replace(':', '.');
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
                        uid: task.uid,
                        token: fcm[task.uid].token
                    })
                }
            }
        });
        (async function loop() {
            for (let i = 0; i < messages.length; i++) {
                const fcmResponse = await admin.messaging().sendToDevice(messages[i].token, messages[i].payload);
                const dbResponse = await db.collection("notifications").add({
                    uid: messages[i].uid,
                    title: messages[i].payload.notification.title,
                    body: messages[i].payload.notification.body,
                    timestamp: indiaTime.toLocaleString()
                })
                console.log(fcmResponse.results);
                console.log(dbResponse.results);
            }
        })();
    } catch (err) {
        console.error(err);
    }
});