<template>
    <div class="login-container">
        <v-layout row fill-height justify-center align-center class="pa-0 px-8">
            <v-card outlined min-width="320px" max-width="400" class="pb-4">
                <v-layout column wrap align-center class="pt-4">
                    <div class="pt-4 title selectable" @click="navigateToHome">{{$t('todo')}}</div>
                </v-layout>
                <v-card-text>
                    <v-form v-model="signInForm" @submit.prevent="onEmailLogin">
                        <v-card-text class="px-0 pb-0">
                            <v-text-field
                                ref="userEmail"
                                v-model="user.email"
                                outlined
                                :label="$t('email.label')"
                                :hint="$t('email.enter')"
                                persistent-hint
                                :rules="rules.emailRules"
                            ></v-text-field>
                            <div class="pa-1"></div>
                            <v-text-field
                                ref="userPass"
                                v-model="user.password"
                                outlined
                                :label="$t('password.label')"
                                :hint="$t('password.enter')"
                                persistent-hint
                                :rules="rules.password"
                                type="password"
                            ></v-text-field>
                        </v-card-text>
                        <v-card-actions class="px-0 py-4">
                            <v-btn type="submit" block color="primary">Sign up</v-btn>
                        </v-card-actions>
                    </v-form>
                </v-card-text>
                <v-flex class="overline py-0">OR</v-flex>
                <v-card-text>
                    <v-flex>
                        <span class="pa-1">
                            <v-btn icon>
                                <v-icon color="blue">mdi-facebook</v-icon>
                            </v-btn>
                        </span>
                        <span class="pa-1">
                            <v-btn icon>
                                <v-icon color="green">mdi-google</v-icon>
                            </v-btn>
                        </span>
                    </v-flex>
                </v-card-text>
                <v-card-text class="pb-1 pt-0">
                    <span class="caption">Already have an account?&nbsp;</span>
                    <span class="link caption" @click="navigateToLogin
                    ">Login</span>
                </v-card-text>
            </v-card>
        </v-layout>
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
            isEmailLogin: false,
            rules: {
                password: [(value: any) => !!value || "Password is required"],
                emailRules: [
                    (v: any) => !!v || "E-mail is required",
                    (v: any) =>
                        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v) ||
                        "E-mail must be valid"
                ]
            },
            user: {
                email: "",
                password: ""
            }
        };
    },
    methods: {
        onEmailLogin() {
            // TODO: create form
            if (this.isEmailLogin) {
                this.onSignIn();
            } else {
                this.isEmailLogin = true;
            }
        },
        onGoogleLogin() {
            firebase.signInWithGoogle();
        },
        onFacebookLogin() {
            firebase.signInWithFacebook();
        },
        onSignIn() {
            if (this.signInForm) {
                this.signingIn = true;
                firebase
                    .signInWithEmail(this.user)
                    .then((response: any) => {
                        this.$store.dispatch("SHOW_SNACK", "Login Success!");
                        this.navigateToHome();
                    })
                    .catch((err: any) => {
                        this.$store.dispatch(
                            "SHOW_SNACK",
                            err.message || "Error logging in!"
                        );
                    })
                    .then(() => {
                        this.signingIn = false;
                    });
            } else this.$store.dispatch("SHOW_SNACK", "Please give details");
        },
        navigateToHome() {
            this.$router.replace("/home");
        },
        navigateToLogin() {
            this.$router.replace("/login");
        }
    },
    mounted() {
        if (firebase.getUser()) {
            this.navigateToHome();
        }
    }
});
</script>

<style scoped>
.login-container {
    height: 100vh;
}
</style>