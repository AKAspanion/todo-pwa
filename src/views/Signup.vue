<template>
    <div class="signup-container">
        <v-layout row fill-height justify-center align-center class="pa-0 px-8">
            <v-card outlined min-width="400px" max-width="400" class="pb-4">
                <v-layout column wrap align-center class="pt-4">
                    <div class="pt-4 headline selectable" @click="navigateToHome">{{$t('todo')}}</div>
                    <div class="pa-2 caption font-weight-light">{{$t('signup.todo')}}</div>
                </v-layout>
                <v-card-text :style="{ maxWidth: '320px', textAlign: 'center', margin: '0 auto'}">
                    <v-form v-model="signUpFrom" @submit.prevent="onEmailSignUp">
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
                            <v-btn
                                large
                                type="submit"
                                block
                                :loading="signingUp"
                                color="primary"
                                :disabled="!signUpFrom"
                            >Sign up</v-btn>
                        </v-card-actions>
                    </v-form>
                </v-card-text>
                <v-flex class="overline py-0">OR</v-flex>
                <v-card-text>
                    <v-flex>
                        <span class="pa-1">
                            <v-btn large icon @click="onFacebookSignUp">
                                <v-icon color="#3b5998">mdi-facebook</v-icon>
                            </v-btn>
                        </span>
                        <span class="pa-1">
                            <v-btn large icon @click="onGoogleSignUp">
                                <v-icon color="#179c52">mdi-google</v-icon>
                            </v-btn>
                        </span>
                    </v-flex>
                </v-card-text>
                <v-card-text class="pt-0 pb-7">
                    <span class="caption">Already have an account?&nbsp;</span>
                    <span class="link caption" @click="navigateToSignin
                    ">Signin</span>
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
    name: "Signup",
    data() {
        return {
            signingUp: false,
            signUpFrom: false,
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
        onGoogleSignUp() {
            firebase.signUpWithGoogle();
        },
        onFacebookSignUp() {
            firebase.signUpWithFacebook();
        },
        onEmailSignUp() {
            if (this.signUpFrom) {
                this.signingUp = true;
                firebase
                    .signUpWithEmail(this.user)
                    .then((response: any) => {
                        this.$store.dispatch("SHOW_SNACK", "Signup Success!");
                        this.navigateToHome();
                    })
                    .catch((err: any) => {
                        this.$store.dispatch(
                            "SHOW_SNACK",
                            err.message || "Error signing up!"
                        );
                    })
                    .then(() => {
                        this.signingUp = false;
                    });
            } else this.$store.dispatch("SHOW_SNACK", "Please give details");
        },
        navigateToHome() {
            this.$router.replace("/home");
        },
        navigateToSignin() {
            this.$router.replace("/signin");
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
.signup-container {
    height: 100vh;
}
</style>