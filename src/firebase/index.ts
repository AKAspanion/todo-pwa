import * as firebase from 'firebase';

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

    public fetchAllTaskType = () => {
        const typeRef = firebase.firestore().collection('type');
        return typeRef.get();
    }

    public fetchTasksByUID = (user: any) => {
        const tasksRef = firebase.firestore().collection('tasks');
        return tasksRef.where('uid', '==', user.uid).get();
    }

    public addTaskType = (type: any) => {
        const typeRef = firebase.firestore().collection('type');
        return typeRef.add(type);
    }

    public addTask = (user: any, task: any) => {
        const tasksRef = firebase.firestore().collection('tasks');
        return tasksRef.add({
            uid: user.uid,
            ...task,
            type: task.type.map((e: any) => firebase.firestore().doc(`type/${e.id}`)),
        });
    }

    public updateTask = (taskId: any, updatedTask: any) => {
        const typeRef = firebase.firestore().collection('tasks').doc(taskId);
        return typeRef.update({
            ...updatedTask,
        });
    }

    public authChangeListener(callback: any) {
        firebase.auth().onAuthStateChanged(callback);
    }

    public initializeFirebase = () => {
        firebase.initializeApp(this.firebaseConfig);
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
