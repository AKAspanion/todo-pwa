<template>
    <div class="login-container">
        <v-layout row fill-height justify-center align-center class="pa-0 px-8">
            <v-card outlined max-width="400px" class="pb-4">
                <v-form v-model="signInForm" @submit.prevent="onSignIn">
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
                            <!-- <v-text-field
                                ref="userEmail"
                                v-model="user.email"
                                outlined
                                :label="$t('email')"
                                :hint="$t('email.enter')"
                                persistent-hint
                                :rules="[rules.required]"
                            ></v-text-field>-->
                        </v-flex>
                        <v-flex class="py-3">
                            <v-btn width="280" large dark color="green" @click="onGoogleLogin">
                                <v-icon left>mdi-google</v-icon>
                                <v-spacer></v-spacer>
                                <div class="text-left" style="width: 200px;">Login with Google</div>
                            </v-btn>
                            <!-- <v-text-field
                                ref="userPass"
                                v-model="user.password"
                                outlined
                                :label="$t('password')"
                                :hint="$t('password.enter')"
                                persistent-hint
                                :rules="[rules.required]"
                                type="password"
                            ></v-text-field>-->
                        </v-flex>
                        <v-flex>
                            <v-divider></v-divider>
                            <!-- <v-text-field
                                ref="userPass"
                                v-model="user.password"
                                outlined
                                :label="$t('password')"
                                :hint="$t('password.enter')"
                                persistent-hint
                                :rules="[rules.required]"
                                type="password"
                            ></v-text-field>-->
                        </v-flex>
                        <v-flex class="pt-3">
                            <v-btn width="280" large @click="onEmailLogin">
                                <v-icon left>mdi-email</v-icon>
                                <v-spacer></v-spacer>
                                <div class="text-left" style="width: 200px;">Login with Email</div>
                            </v-btn>
                            <!-- <v-text-field
                                ref="userPass"
                                v-model="user.password"
                                outlined
                                :label="$t('password')"
                                :hint="$t('password.enter')"
                                persistent-hint
                                :rules="[rules.required]"
                                type="password"
                            ></v-text-field>-->
                        </v-flex>
                    </v-card-text>
                    <!-- <v-card-actions class="pa-4 pb-0 mx-1">
                        <v-btn @click="onGoogleLogin">Login</v-btn>
                        <v-btn
                            type="submit"
                            :loading="signingIn"
                            height="48"
                            color="primary"
                            class="px-3"
                        >
                            <span>{{$t('login')}}</span>
                        </v-btn>
                    </v-card-actions>-->
                </v-form>
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
        onEmailLogin() {
            // TODO: create form
        },
        onGoogleLogin() {
            this.$store.dispatch("LOADING", true);
            firebase.signInWithGoogle();
        },
        onFacebookLogin() {
            this.$store.dispatch("LOADING", true);
            firebase.signInWithFacebook();
        },
        onSignIn() {
            if (this.signInForm) {
                this.signingIn = true;
                this.$store.dispatch("LOADING", true);
                firebase
                    .signInWithEmail(this.user)
                    .then((response: any) => {
                        this.$store.dispatch("SHOW_SNACK", "Login Success!");
                        this.navigateToHome();
                    })
                    .catch((err: any) => {
                        this.$store.dispatch(
                            "SHOW_SNACK",
                            err.message || "Error"
                        );
                    })
                    .then(() => {
                        this.$store.dispatch("LOADING", false);
                        this.signingIn = false;
                    });
            } else this.$store.dispatch("SHOW_SNACK", "Please fill form");
        },
        navigateToHome() {
            this.$router.replace("/home");
        }
    },
    mounted() {
        this.$store.dispatch("LOADING", false);
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