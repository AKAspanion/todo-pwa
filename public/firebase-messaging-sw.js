importScripts('https://www.gstatic.com/firebasejs/3.9.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/3.9.0/firebase-messaging.js');

firebase.initializeApp({
    'messagingSenderId': '1022572071834'
});

const messaging = firebase.messaging();

messaging.setBackgroundMessageHandler((payload) => {
    console.log('Message received in bg. ', payload);
});