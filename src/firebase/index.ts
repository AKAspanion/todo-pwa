import * as firebase from 'firebase';
import store from '../store/store';

// @ts-ignore
import { getAllNotificationsForUser } from '../util/commonHelper';

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

    public fetchAllNotificationByUID = (user: any) => {
        const notificationRef = firebase.firestore().collection('notifications');
        return notificationRef.where('uid', '==', user.uid).get();
    }

    public deleteNotification = (notification: any) => {
        const notificationRef = firebase.firestore().collection('notifications').doc(notification.id);
        return notificationRef.delete();
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
    }

    public askNotificationPermission = () => {
        Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
                this.getMessagingToken();
            } else {
                store.dispatch('SET_NOTIFICATION_GRANT', false);
                this.sendFCMTokenToServer(false);
            }
        });
    }


    public getMessagingToken = () => {
        const messaging = firebase.messaging();
        messaging.usePublicVapidKey(process.env.VUE_APP_VAPID_KEY);
        messaging
            .getToken()
            .then((currentToken) => {
                if (currentToken) {
                    store.dispatch('SET_NOTIFICATION_GRANT', true);
                    return this.sendFCMTokenToServer(currentToken);
                } else {
                    store.dispatch('SET_NOTIFICATION_GRANT', false);
                    return this.sendFCMTokenToServer(false);
                }
            })
            .then(() => {
                messaging.onMessage((payload) => {
                    store.dispatch('SHOW_SNACK', payload.notification.body);
                    getAllNotificationsForUser(store.state.user)
                        .then((response: any) => {
                            store.dispatch('SET_NOTIFICATIONS', response);
                        })
                        .catch(() => {
                            // err
                        });
                });
            })
            .catch(() => {
                store.dispatch('SET_NOTIFICATION_GRANT', false);
            });
    }

    public tokenRefreshListener() {
        const messaging = firebase.messaging();
        messaging.usePublicVapidKey(process.env.VUE_APP_VAPID_KEY);
        messaging.getToken().then((refreshedToken) => {
            this.sendFCMTokenToServer(refreshedToken);
        }).catch(() => {
            // ERROR
        });
    }

    public sendFCMTokenToServer = (token: any) => {
        const fcmRef = firebase.firestore().collection('fcm');
        const user: any = firebase.auth().currentUser;
        if (user && user) {
            if (token) {
                return fcmRef.doc(user.uid).set({
                    token,
                });
            } else {
                return fcmRef.doc(user.uid).set({
                    token: null,
                });
            }
        } else {
            throw new Error('User not defined');
        }
    }

    public getFCMTokenForUser = () => {
        // TODO
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
