<template>
    <div class="signup-container">
        <v-layout row fill-height justify-center align-center class="pa-0 px-8">
            <v-card outlined class="mt-2 pb-8 px-8">
                <v-layout column wrap align-center class="pt-4">
                    <div
                        class="pt-4 headline selectable"
                        @click="navigateToHome"
                    >{{$t('task-manager')}}</div>
                    <div class="pa-2 caption font-weight-light">{{$t('sign-up.desc')}}</div>
                </v-layout>
                <v-card-text :style="{ maxWidth: '420px', textAlign: 'center', margin: '0 auto'}">
                    <v-form
                        lazy-validation
                        ref="formSignUp"
                        v-model="signUpFrom"
                        @submit.prevent="onEmailSignUp"
                    >
                        <v-card-text class="px-0 pb-0">
                            <v-layout row wrap>
                                <v-flex xs12 class="py-0">
                                    <v-text-field
                                        ref="userEmail"
                                        v-model="user.email"
                                        v-bind="textFieldAttributes"
                                        :label="$t('email.label')"
                                        :rules="[rules.empty.email, rules.nospace.email, rules.email]"
                                    ></v-text-field>
                                </v-flex>

                                <v-flex xs12 sm6 class="py-0">
                                    <v-text-field
                                        v-model="user.password"
                                        v-bind="textFieldAttributes"
                                        :label="$t('password.label')"
                                        :rules="[rules.empty.password, rules.nospace.password, rules.password]"
                                        :append-icon="seePass ? 'mdi-eye-off':'mdi-eye'"
                                        :type="seePass? '':'password'"
                                        @click:append="seePass = !seePass"
                                    ></v-text-field>
                                </v-flex>

                                <v-flex xs12 sm6 class="py-0">
                                    <v-text-field
                                        v-model="user.confirm"
                                        v-bind="textFieldAttributes"
                                        :label="$t('password.confirm')"
                                        :append-icon="seePass ? 'mdi-eye-off':'mdi-eye'"
                                        :type="seePass? '':'password'"
                                        @click:append="seePass = !seePass"
                                        :rules="[rules.empty.confirm, rules.nospace.password, rules.confirmPassword]"
                                    ></v-text-field>
                                </v-flex>
                            </v-layout>
                        </v-card-text>
                        <v-card-actions class="px-0 py-4">
                            <v-btn
                                large
                                type="submit"
                                block
                                :loading="signingUp"
                                color="primary"
                                :disabled="!signUpFrom"
                            >{{$t('sign-up.label')}}</v-btn>
                        </v-card-actions>
                    </v-form>
                </v-card-text>
                <v-flex class="overline py-0">{{$t('sign-up.or')}}</v-flex>
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
                    <span class="caption">{{$t('sign-up.has-account')}}&nbsp;</span>
                    <span class="link caption" @click="navigateToSignin">{{$t('sign-in.label')}}</span>
                </v-card-text>
                <v-btn-toggle v-model="langModel" mandatory>
                    <v-btn
                        v-for="(lang, i) in langs"
                        :key="`Lang${i}`"
                        :value="lang"
                        x-small
                    >{{ lang }}</v-btn>
                </v-btn-toggle>
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
            langs: ["en", "hi"],
            rules: {
                empty: {
                    email: (v: any) => !!v || this.$t("email.enter"),
                    password: (v: any) =>
                        !!v || this.$t("password.enter.pass-enter"),
                    confirm: (v: any) =>
                        !!v || this.$t("password.enter.pass-confirm")
                },
                nospace: {
                    password: (v: any) =>
                        (v && !/\s/g.test(v)) || this.$t("rule.space.password"),
                    email: (v: any) =>
                        (v && !/\s/g.test(v)) || this.$t("rule.space.email")
                },
                password: (v: any) =>
                    (v &&
                        /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/.test(
                            v
                        )) ||
                    this.$t("rule.password.invalid"),
                confirmPassword: (v: any) =>
                    // @ts-ignore
                    (v && v === this.user.password) ||
                    this.$t("rule.password.confirm-pass"),
                email: (v: any) =>
                    (v &&
                        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(
                            v
                        )) ||
                    this.$t("rule.email.invalid")
            },
            user: {
                email: "",
                password: "",
                confirm: ""
            },
            textFieldAttributes: {
                dense: this.$vuetify.breakpoint.xsOnly,
                outlined: true
            }
        };
    },
    computed: {
        langModel: {
            get() {
                return this.$i18n.locale;
            },
            set(val: string) {
                this.$i18n.locale = val;
                if (this.$refs.formSignUp)
                    this.$refs.formSignUp.resetValidation();
                localStorage.setItem("lang", this.$i18n.locale);
            }
        }
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
                    .signUpWithEmail({
                        email: this.user.email,
                        password: this.user.password
                    })
                    .then((response: any) => {
                        this.$store.dispatch(
                            "SHOW_SNACK",
                            this.$t("toast.success.sign-up")
                        );
                        this.navigateToHome();
                    })
                    .catch((err: any) => {
                        this.$store.dispatch(
                            "SHOW_SNACK",
                            this.$t("toast.error.sign-up")
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
        this.langModel = localStorage.getItem("lang") == "hi" ? "hi" : "en";
        if (firebase.getUser()) {
            this.navigateToHome();
        }
        this.$nextTick(() => {
            setTimeout(() => {
                let firstName: any = this.$refs.userEmail;
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