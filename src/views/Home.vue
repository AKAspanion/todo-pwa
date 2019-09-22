<template>
    <div class="home">
        <h1>This is home page</h1>
        <v-btn @click="onSignoutClick">Signout</v-btn>
    </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import FirebaseWeb from "../firebase";
const firebase = new FirebaseWeb();

export default Vue.extend({
    data() {
        return {
            name: "Login",
            signingIn: false,
            signInForm: false,
            rules: {
                required: (value: any) => !!value || "Field is Required."
            },
            user: {
                email: "",
                password: ""
            }
        };
    },
    methods: {
        onSignoutClick() {
            this.logout();
        },
        logout() {
            firebase
                .signOut()
                .then(() => {
                    this.$store.dispatch("SHOW_SNACK", "Signout Succes!");
                })
                .catch(() => {
                    this.$store.dispatch(
                        "SHOW_SNACK",
                        "Error Signing out. Please try later!"
                    );
                });
        }
    },
    mounted() {
        this.$store.dispatch("LOADING", false);
    }
});
</script>
