import * as firebase from 'firebase';
import store from '../store/store';

class FirebaseWeb {
    private firebaseConfig: any = {
        apiKey: process.env.VUE_APP_API_KEY,
        authDomain: process.env.VUE_APP_AUTH_DOMAIN,
        databaseURL: process.env.VUE_APP_DATABASE_URL,
        projectId: process.env.VUE_APP_PROJECT_ID,
        storageBucket: process.env.VUE_APP_STORAGE_BUCKET,
        messagingSenderId: process.env.VUE_APP_MESSAGING_SENDER_ID,
        appId: process.env.VUE_APP_APP_ID,
    };

    public isAppInitialized() {
        return firebase.apps.length;
    }

    public fetchAllTaskTypeByUID = (user: any) => {
        const typeRef = firebase.firestore().collection('types');
        return typeRef.where('uid', '==', user.uid).get();
    }

    public fetchTasksByUID = (user: any) => {
        const tasksRef = firebase.firestore().collection('tasks');
        return tasksRef.where('uid', '==', user.uid).get();
    }

    public addTaskType = (user: any, type: any) => {
        const typeRef = firebase.firestore().collection('types');
        return typeRef.add({
            uid: user.uid,
            ...type,
        });
    }

    public addTask = (user: any, task: any) => {
        const tasksRef = firebase.firestore().collection('tasks');
        return tasksRef.add({
            uid: user.uid,
            ...task,
            time: task.indefinite ? 'NA' : task.time,
            date: task.indefinite ? 'NA' : task.date,
            type: task.type.map((e: any) => firebase.firestore().doc(`types/${e.id}`)),
        });
    }

    public updateTask = (taskId: any, updatedTask: any) => {
        const tasksRef = firebase.firestore().collection('tasks').doc(taskId);
        if (updatedTask.hasOwnProperty('type')) {
            return tasksRef.update({
                ...updatedTask,
                type: updatedTask.type.map((e: any) => firebase.firestore().doc(`types/${e.id}`)),
            });
        } else {
            return tasksRef.update({
                ...updatedTask,
            });
        }
    }

    public deleteTask = (task: any) => {
        const tasksRef = firebase.firestore().collection('tasks').doc(task.id);
        return tasksRef.delete();
    }

    public authChangeListener(callback: any) {
        firebase.auth().onAuthStateChanged(callback);
    }

    public initializeFirebase = () => {
        firebase.initializeApp(this.firebaseConfig);
        Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
                // store.dispatch('setNotificationPermission', true);
                // TODO Retrieve an Instance ID token for use with FCM.
                // this.getMessagingToken();
                // ...
            } else {
                // store.dispatch('setNotificationPermission', false);
            }
        });
    }

    public tokenRefreshListener(callback: any) {
        const messaging = firebase.messaging();
        messaging.usePublicVapidKey(process.env.VUE_APP_VAPID_KEY);
        messaging.onTokenRefresh(callback);
        // messaging.getToken().then((refreshedToken) => {
        //     console.log('Token refreshed.');
        //     // Indicate that the new Instance ID token has not yet been sent to the
        //     // app server.
        //     setTokenSentToServer(false);
        //     // Send Instance ID token to app server.
        //     sendTokenToServer(refreshedToken);
        //     // ...
        // }).catch((err) => {
        //     console.log('Unable to retrieve refreshed token ', err);
        //     showToken('Unable to retrieve refreshed token ', err);
        // });
    }

    public getMessagingToken = () => {
        const messaging = firebase.messaging();
        messaging.usePublicVapidKey(process.env.VUE_APP_VAPID_KEY);
        messaging.getToken().then((currentToken) => {
            if (currentToken) {
                return this.sendFCMTokenToServer(currentToken);
                // updateUIForPushEnabled(currentToken);
            } else {
                // Show permission request.
                throw new Error('No Instance ID token available. Request permission to generate one.');
                // Show permission UI.
                // updateUIForPushPermissionRequired();
                // setTokenSentToServer(false);
            }
        })
        .then((msg) => {
            console.log(msg);
        })
        .catch((err) => {
            console.log('An error occurred while retrieving token. ', err);
            // showToken('Error retrieving Instance ID token. ', err);
            // setTokenSentToServer(false);
        })
        messaging.onMessage((payload) => {
            console.log('Message received. ', payload);
            // ...
        });
    }

    public sendFCMTokenToServer = (token: any) => {       
        const fcmsRef = firebase.firestore().collection('fcms');
        const user: any = firebase.auth().currentUser;
        console.log(token, user);
        if (user && user.uid) {
            return fcmsRef.doc(user.uid).set({
                token
            })
        }
    }

    public getFCMTokenForUser = () => {

    }

    public updateUserProfile = (updatedUser: any) => {
        const user: any = firebase.auth().currentUser;
        return user.updateProfile(updatedUser);
    }

    public signInWithEmail = (user: any) => {
        return firebase.auth().signInWithEmailAndPassword(user.email.trim(), user.password.trim());
    }

    public signUpWithEmail = (user: any) => {
        return firebase.auth().createUserWithEmailAndPassword(user.email.trim(), user.password.trim());
    }

    public signUpWithFacebook = () => {
        return this.signInWithFacebook();
    }

    public signUpWithGoogle = () => {
        return this.signInWithGoogle();
    }

    public signInWithFacebook = () => {
        let provider: any = null;
        provider = new firebase.auth.FacebookAuthProvider();
        firebase.auth().signInWithRedirect(provider);
    }
    public signInWithGoogle = () => {
        let provider: any = null;
        provider = new firebase.auth.GoogleAuthProvider();
        firebase.auth().signInWithRedirect(provider);
    }
    public signInResult() {
        return firebase.auth().getRedirectResult();
    }

    public getUser = () => {
        return firebase.auth().currentUser;
    }

    public signOut = () => {
        return firebase.auth().signOut();
    }
}

export default FirebaseWeb;
