<template>
    <div class="signin-container">
        <v-layout row fill-height justify-center align-center class="pa-0 px-8">
            <v-card outlined min-width="400px" class="pb-4">
                <v-layout column wrap align-center class="pt-4">
                    <div class="pt-4 headline selectable" @click="navigateToHome">{{$t('todo')}}</div>
                    <div class="pa-2 caption font-weight-light">{{$t('signin.todo')}}</div>
                </v-layout>
                <v-card-text class="pb-0 px-0">
                    <v-flex class="px-0">
                        <v-btn width="280" large dark color="#3b5998" @click="onFacebookSignin">
                            <v-icon left>mdi-facebook</v-icon>
                            <v-spacer></v-spacer>
                            <div class="text-left" style="width: 200px;">Signin with Facebook</div>
                        </v-btn>
                    </v-flex>
                    <v-flex class="py-3 px-0">
                        <v-btn width="280" large dark color="#179c52" @click="onGoolgeSignin">
                            <v-icon left>mdi-google</v-icon>
                            <v-spacer></v-spacer>
                            <div class="text-left" style="width: 200px;">Signin with Google</div>
                        </v-btn>
                    </v-flex>
                    <v-flex class="px-0">
                        <v-divider class="my-1"></v-divider>
                        <v-expand-transition>
                            <div v-if="isEmailSignin">
                                <v-form v-model="signInForm" @submit.prevent="onEmailLogin">
                                    <v-card-text
                                        :style="{ maxWidth: '280px', textAlign: 'center', margin: '0 auto'}"
                                        v-if="isEmailSignin"
                                        class="px-0 pb-0"
                                    >
                                        <v-text-field
                                            ref="userEmail"
                                            v-model="user.email"
                                            outlined
                                            :label="$t('email.label')"
                                            :hint="$t('email.enter')"
                                            persistent-hint
                                            :rules="rules.emailRules"
                                        ></v-text-field>
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
                                </v-form>
                            </div>
                        </v-expand-transition>
                    </v-flex>
                    <v-flex class="pt-3 px-0">
                        <v-btn
                            width="280"
                            large
                            :loading="signingIn"
                            :color="!isEmailSignin ? '':'primary'"
                            :disabled="!isEmailSignin ? false : !signInForm"
                            @click="onEmailSignin"
                        >
                            <template v-if="!isEmailSignin">
                                <v-icon left>mdi-email</v-icon>
                                <v-spacer></v-spacer>
                                <div class="text-left" style="width: 200px;">Signin with Email</div>
                            </template>
                            <template v-else>LOGIN</template>
                        </v-btn>
                    </v-flex>
                </v-card-text>
                <v-card-text class="pt-9 pb-7">
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
    name: "Signin",
    data() {
        return {
            signingIn: false,
            signInForm: false,
            isEmailSignin: false,
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
        onEmailSignin() {
            if (this.isEmailSignin) {
                this.onSignIn();
            } else {
                this.isEmailSignin = true;
            }
        },
        onGoolgeSignin() {
            firebase.signInWithGoogle();
        },
        onFacebookSignin() {
            firebase.signInWithFacebook();
        },
        onSignIn() {
            if (this.signInForm) {
                this.signingIn = true;
                firebase
                    .signInWithEmail(this.user)
                    .then((response: any) => {
                        this.$store.dispatch("SHOW_SNACK", "Signin Success!");
                        this.navigateToHome();
                    })
                    .catch((err: any) => {
                        this.$store.dispatch(
                            "SHOW_SNACK",
                            err.message || "Error signing in!"
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
.signin-container {
    height: 100vh;
}
</style>