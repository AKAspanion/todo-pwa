import * as firebase from 'firebase';

class FirebaseWeb {
    private firebaseConfig: any = {
        apiKey: 'AIzaSyCNL8bBdZAen7K64lEys2lQ-0oM6hc6Rf0',
        authDomain: 'spanion-todo.firebaseapp.com',
        databaseURL: 'https://spanion-todo.firebaseio.com',
        projectId: 'spanion-todo',
        storageBucket: 'spanion-todo.appspot.com',
        messagingSenderId: '1022572071834',
        appId: '1:1022572071834:web:b0fe15a64a13ebac448823',
    };

    public isAppInitialized() {
        return firebase.apps.length;
    }

    public authChangeListener(callback: any) {
        firebase.auth().onAuthStateChanged(callback);
    }

    public initializeFirebase = () => {
        firebase.initializeApp(this.firebaseConfig);
    }

    public signInWithEmail = (user: any) => {
        return firebase.auth().signInWithEmailAndPassword(user.email, user.password);
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
