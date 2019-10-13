<template>
    <div class="signin-container">
        <v-layout row fill-height justify-center align-center class="pa-0 px-8">
            <v-card outlined class="mt-2 pb-8 px-8">
                <v-layout column wrap align-center class="pt-4">
                    <div
                        class="pt-4 headline selectable"
                        @click="navigateToHome"
                    >{{$t('task-manager')}}</div>
                    <div class="pa-2 caption font-weight-light">{{$t('sign-in.desc')}}</div>
                </v-layout>
                <v-card-text class="pb-0 px-0">
                    <v-flex class="px-0">
                        <v-btn width="280" large dark color="#3b5998" @click="onFacebookSignin">
                            <v-icon left>mdi-facebook</v-icon>
                            <v-spacer></v-spacer>
                            <div class="text-left" style="width: 200px;">{{$t('sign-in.facebook')}}</div>
                        </v-btn>
                    </v-flex>
                    <v-flex class="py-3 px-0">
                        <v-btn width="280" large dark color="#179c52" @click="onGoolgeSignin">
                            <v-icon left>mdi-google</v-icon>
                            <v-spacer></v-spacer>
                            <div class="text-left" style="width: 200px;">{{$t('sign-in.google')}}</div>
                        </v-btn>
                    </v-flex>
                    <v-flex class="px-0">
                        <v-divider class="my-1"></v-divider>
                        <v-expand-transition>
                            <div v-if="isEmailSignin">
                                <v-form v-model="signInForm" lazy-validation ref="formSignIn">
                                    <v-card-text
                                        :style="{ maxWidth: '280px', textAlign: 'center', margin: '0 auto'}"
                                        v-if="isEmailSignin"
                                        class="px-0 pb-0"
                                    >
                                        <v-text-field
                                            ref="userEmail"
                                            v-model="user.email"
                                            v-bind="textFieldAttributes"
                                            :label="$t('email.label')"
                                            :rules="[rules.empty.email, rules.nospace.email]"
                                            @keyup.enter="onEmailSignin"
                                        ></v-text-field>
                                        <v-text-field
                                            ref="userPass"
                                            type="password"
                                            v-model="user.password"
                                            v-bind="textFieldAttributes"
                                            :label="$t('password.label')"
                                            :rules="[rules.empty.password, rules.nospace.password]"
                                            @keyup.enter="onEmailSignin"
                                        ></v-text-field>
                                    </v-card-text>
                                </v-form>
                            </div>
                        </v-expand-transition>
                    </v-flex>
                    <v-flex class="px-0">
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
                                <div class="text-left" style="width: 200px;">{{$t('sign-in.email')}}</div>
                            </template>
                            <template v-else>{{$t('sign-in.label')}}</template>
                        </v-btn>
                    </v-flex>
                </v-card-text>
                <v-card-text class="pt-9 pb-7">
                    <span class="caption">{{$t('sign-in.no-account')}}&nbsp;</span>
                    <span class="link caption" @click="navigateToSignup">{{$t('sign-up.label')}}</span>
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
    name: "Signin",
    data() {
        return {
            signingIn: false,
            signInForm: false,
            isEmailSignin: false,
            langs: ["en", "hi"],
            rules: {
                empty: {
                    email: (v: any) => !!v || this.$t("email.enter"),
                    password: (v: any) =>
                        !!v || this.$t("rule.password.required")
                },
                nospace: {
                    password: (v: any) =>
                        (v && !/\s/g.test(v)) || this.$t("rule.space.password"),
                    email: (v: any) =>
                        (v && !/\s/g.test(v)) || this.$t("rule.space.email")
                }
            },
            user: {
                email: "",
                password: ""
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
                if (this.$refs.formSignIn)
                    this.$refs.formSignIn.resetValidation();
                localStorage.setItem("lang", this.$i18n.locale);
            }
        }
    },
    methods: {
        onEmailSignin() {
            if (this.isEmailSignin) {
                this.onSignIn();
            } else {
                this.isEmailSignin = true;
                this.$nextTick(() => {
                    if (this.$refs.userEmail) this.$refs.userEmail.focus();
                });
            }
        },
        onGoolgeSignin() {
            firebase.signInWithGoogle();
        },
        onFacebookSignin() {
            firebase.signInWithFacebook();
        },
        onSignIn() {
            if (
                this.$refs.formSignIn &&
                this.$refs.formSignIn.validate() &&
                this.signInForm
            ) {
                this.signingIn = true;
                firebase
                    .signInWithEmail(this.user)
                    .then((response: any) => {
                        this.$store.dispatch(
                            "SHOW_SNACK",
                            this.$t("toast.success.sign-in")
                        );
                        this.navigateToHome();
                    })
                    .catch((err: any) => {
                        this.$store.dispatch(
                            "SHOW_SNACK",
                            this.$t("toast.error.sign-in")
                        );
                    })
                    .then(() => {
                        this.signingIn = false;
                    });
            }
        },
        navigateToHome() {
            this.$router.replace("/home");
        },
        navigateToSignup() {
            this.$router.replace("/signup");
        }
    },
    mounted() {
        this.langModel = localStorage.getItem("lang") == "hi" ? "hi" : "en";
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