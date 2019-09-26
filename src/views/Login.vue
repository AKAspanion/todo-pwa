<template>
    <div class="login-container">
        <v-layout row fill-height justify-center align-center class="pa-0 px-8">
            <v-card outlined max-width="400px" class="pb-4">
                <v-layout column wrap align-center class="pt-4">
                    <div class="pt-4 title selectable" @click="navigateToHome">{{$t('todo')}}</div>
                    <div class="pa-2 caption font-weight-light">{{$t('login.todo')}}</div>
                </v-layout>
                <v-card-text class="pb-0">
                    <v-flex>
                        <v-btn width="280" large dark color="primary" @click="onFacebookLogin">
                            <v-icon left>mdi-facebook</v-icon>
                            <v-spacer></v-spacer>
                            <div class="text-left" style="width: 200px;">Login with Facebook</div>
                        </v-btn>
                    </v-flex>
                    <v-flex class="py-3">
                        <v-btn width="280" large dark color="green" @click="onGoogleLogin">
                            <v-icon left>mdi-google</v-icon>
                            <v-spacer></v-spacer>
                            <div class="text-left" style="width: 200px;">Login with Google</div>
                        </v-btn>
                    </v-flex>
                    <v-flex>
                        <v-divider></v-divider>
                        <v-expand-transition>
                            <div v-if="isEmailLogin">
                                <v-form v-model="signInForm" @submit.prevent="onEmailLogin">
                                    <v-card-text v-if="isEmailLogin" class="px-0 pb-0">
                                        <v-text-field
                                            ref="userEmail"
                                            v-model="user.email"
                                            outlined
                                            :label="$t('email')"
                                            :hint="$t('email.enter')"
                                            persistent-hint
                                            :rules="rules.emailRules"
                                        ></v-text-field>
                                        <v-text-field
                                            ref="userPass"
                                            v-model="user.password"
                                            outlined
                                            :label="$t('password')"
                                            :hint="$t('password.enter')"
                                            persistent-hint
                                            :rules="rules.password"
                                            type="password"
                                        ></v-text-field>
                                    </v-card-text>
                                </v-form>
                            </div>
                        </v-expand-transition>
                    </v-flex>
                    <v-flex class="pt-3">
                        <v-btn
                            width="280"
                            large
                            :loading="signingIn"
                            :color="!isEmailLogin ? '':'primary'"
                            @click="onEmailLogin"
                        >
                            <template v-if="!isEmailLogin">
                                <v-icon left>mdi-email</v-icon>
                                <v-spacer></v-spacer>
                                <div class="text-left" style="width: 200px;">Login with Email</div>
                            </template>
                            <template v-else>LOGIN</template>
                        </v-btn>
                    </v-flex>
                </v-card-text>
                <v-card-text class="pb-1 pt-4">
                    <span class="caption">Don't have an account?&nbsp;</span>
                    <span class="link caption" @click="navigateToSignup">Sign Up</span>
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
        navigateToSignup() {
            this.$router.replace("/signup");
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