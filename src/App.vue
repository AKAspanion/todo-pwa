<template>
    <div id="app">
        <v-app id="ankit">
            <container-main></container-main>
            <bar-nav></bar-nav>
        </v-app>
    </div>
</template>
<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import BarNav from "@/components/BarNav.vue";
import ContainerMain from "@/components/ContainerMain.vue";
import FirebaseWeb from "./firebase";
const firebase = new FirebaseWeb();

@Component({
    components: {
        ContainerMain,
        BarNav
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
