<template>
    <div class="signup-container">
        <v-layout row fill-height justify-center align-center class="pa-0 px-8">
            <v-card outlined min-width="400px" max-width="400" class="mt-2">
                <v-layout column wrap align-center class="pt-4">
                    <div class="pt-4 headline selectable" @click="navigateToHome">{{$t('todo')}}</div>
                    <div class="pa-2 caption font-weight-light">{{$t('signup.todo')}}</div>
                </v-layout>
                <v-card-text :style="{ maxWidth: '320px', textAlign: 'center', margin: '0 auto'}">
                    <v-form
                        lazy-validation
                        ref="formSignUp"
                        v-model="signUpFrom"
                        @submit.prevent="onEmailSignUp"
                    >
                        <v-card-text class="px-0 pb-0">
                            <v-text-field
                                ref="userFirstName"
                                v-model="user.firstName"
                                v-bind="textFieldAttributes"
                                :label="$t('name.first')"
                                :hint="$t('name.enter.first')"
                                :rules="[rules.empty.firstName, rules.nospace.field]"
                            ></v-text-field>
                            <v-text-field
                                v-model="user.lastName"
                                v-bind="textFieldAttributes"
                                :label="$t('name.last')"
                                :hint="$t('name.enter.last')"
                                :rules="[rules.empty.lastName, rules.nospace.field]"
                            ></v-text-field>
                            <v-text-field
                                v-model="user.email"
                                v-bind="textFieldAttributes"
                                :label="$t('email.label')"
                                :hint="$t('email.enter')"
                                :rules="[rules.empty.email, rules.nospace.email, rules.email]"
                            ></v-text-field>
                            <v-text-field
                                v-model="user.password"
                                v-bind="textFieldAttributes"
                                :label="$t('password.label')"
                                :hint="$t('password.enter.passEnter')"
                                :rules="[rules.empty.password, rules.nospace.password, rules.password]"
                                :append-icon="seePass ? 'mdi-eye-off':'mdi-eye'"
                                :type="seePass? '':'password'"
                                @click:append="seePass = !seePass"
                            ></v-text-field>
                            <v-text-field
                                v-model="user.confirm"
                                v-bind="textFieldAttributes"
                                :label="$t('password.confirm')"
                                :hint="$t('password.enter.passConfirm')"
                                :append-icon="seePass ? 'mdi-eye-off':'mdi-eye'"
                                :type="seePass? '':'password'"
                                @click:append="seePass = !seePass"
                                :rules="[rules.empty.confirm, rules.nospace.password, rules.confirmPassword]"
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
                    <span class="link caption" @click="navigateToSignin">{{$t('signin.label')}}</span>
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
            seePass: false,
            signingUp: false,
            signUpFrom: false,
            rules: {
                empty: {
                    firstName: (v: any) => !!v || this.$t("name.enter.first"),
                    lastName: (v: any) => !!v || this.$t("name.enter.last"),
                    email: (v: any) => !!v || this.$t("email.enter"),
                    password: (v: any) =>
                        !!v || this.$t("password.enter.passEnter"),
                    confirm: (v: any) =>
                        !!v || this.$t("password.enter.passConfirm")
                },
                nospace: {
                    field: (v: any) =>
                        (v && v.trim() !== "") ||
                        this.$t("errors.spaces.field"),
                    password: (v: any) =>
                        (v && !/\s/g.test(v)) ||
                        this.$t("errors.spaces.password"),
                    email: (v: any) =>
                        (v && !/\s/g.test(v)) || this.$t("errors.spaces.email")
                },
                password: (v: any) =>
                    (v &&
                        /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/.test(
                            v
                        )) ||
                    this.$t("errors.password.invalid"),
                confirmPassword: (v: any) =>
                    (v && v === this.user.password) ||
                    this.$t("errors.password.confirmPass"),
                email: (v: any) =>
                    (v &&
                        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(
                            v
                        )) ||
                    this.$t("errors.email.invalid")
            },
            user: {
                email: "",
                password: "",
                confirm: "",
                firstName: "",
                lastName: ""
            },
            textFieldAttributes: {
                dense: true,
                outlined: true
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
            let signUpValidator: any = this.$refs.formSignUp;
            if (
                signUpValidator &&
                signUpValidator.validate() &&
                this.signUpFrom
            ) {
                this.signingUp = true;
                firebase
                    .signUpWithEmail(this.user)
                    .then((response: any) => {
                        this.$store.dispatch("SHOW_SNACK", "Signup Success!");
                        return firebase.updateUserProfile({
                            displayName: `${this.user.firstName} ${this.user.lastName}`
                        });
                    })
                    .then(() => {
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
            }
            // else this.$store.dispatch("SHOW_SNACK", "Please give details");
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
        this.$nextTick(() => {
            setTimeout(() => {
                let firstName: any = this.$refs.userFirstName;
                firstName.focus();
            }, 300);
        });
    }
});
</script>

<style scoped>
.signup-container {
    height: 100vh;
    width: 100vw;
    overflow-x: hidden;
    overflow-y: scroll;
}
.signup-container::-webkit-scrollbar {
    width: 0em;
}
</style>