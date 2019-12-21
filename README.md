# Task Manager

![](https://firebasestorage.googleapis.com/v0/b/spanion-todo.appspot.com/o/smartmockups_k4fmi3on.png?alt=media&token=81bb0c3d-eeab-401b-b933-8622e3d7cf94)

# About
This is a simple Task Manager progressive web application.

## Production View
* View the production site at [Task Manager](http://spanion-todo.web.app/)
* Login with Facebook, Google or Email to create account.

## Features
* Task creation/scheduling with time, date, and label.
* Push notifications 1 hour before task.
* Drag and drop function in desktop.
* Search by text, date and label.

# Development

## Getting Started

### Prerequisites
You need to install [node](https://nodejs.org/) and [git](https://git-scm.com/) locally. The project is based on [ES2015+](https://es6.ruanyifeng.com/), [vue](https://vuejs.org/), [vuex](https://vuex.vuejs.org/), [vue-router](https://router.vuejs.org/zh-cn/),  [vuetify](https://vuetifyjs.com) and [firebase](http://firebase.google.com/). Understanding and learning this knowledge in advance will greatly help the use of this project. 

This project uses firebase for backend.\
To use this project, you must create a web-app project on firebase.

### Installing

```bash
# clone the project
git clone https://github.com/AKAspanion/Lens-n-Light.git

# enter the project directory
cd Lens-n-Light
```

Before going into development, you need to configure .env file.

Go to the settings page of firebase project you created, and look for a config option under 'Firebase SDK snippet'.
```js
// It should look something like this
const firebaseConfig = {
  apiKey: "XYZ...",
  authDomain: "...",
  databaseURL: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
}; 
```
Populate the above values into the .env file without quotes.
```
VUE_APP_API_KEY=XYZ...
VUE_APP_AUTH_DOMAIN=...
VUE_APP_DATABASE_URL=...
VUE_APP_PROJECT_ID=...
VUE_APP_STORAGE_BUCKET=...
VUE_APP_MESSAGING_SENDER_ID=...
VUE_APP_APP_ID=...
```
Project is now pointing to your firebase.

```bash
# install dependency
npm install

# develop
npm run serve
```
Project will launch at http://localhost:8080

# Deployment
```bash
#compiles and minifies for production
npm run buid
```
The `/dist` directory is ready to be deployed
# Built With
* [Vue.js]() - SPA JavaScript Framework
* [Vuetify]() - Frontend Components Framework
* [Firebase]() - Backend and Hosting
# Author
[**Ankit Kumar Pandit**](http://spanion.xyz)
