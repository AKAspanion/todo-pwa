<template>
    <div id="app">
        <v-app id="ankit">
            <main-container></main-container>
            <navbar></navbar>
        </v-app>
    </div>
</template>
<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import Navbar from "@/components/Navbar.vue";
import MainContainer from "@/components/MainContainer.vue";
import FirebaseWeb from "./firebase";
const firebase = new FirebaseWeb();

@Component({
    components: {
        MainContainer,
        Navbar
    }
})
export default class App extends Vue {
    mounted() {
        // this.$store.dispatch("LOADING", false);
        if (!firebase.isAppInitialized) {
            firebase.initializeFirebase();
        }
    }
}
</script>
<style>
#app {
    font-family: "Avenir", Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
}
#nav {
    padding: 30px;
}

#nav a {
    font-weight: bold;
    color: #2c3e50;
}

#nav a.router-link-exact-active {
    color: #42b983;
}
.link {
    color: #2196f3;
    cursor: pointer;
}
</style>
