/**
 * The one Firebase app, its Auth and its Firestore. With `VITE_USE_EMULATORS=true` they talk to
 * the Emulator Suite on the hosts firebase.json gives (vite.config.ts reads them at build time),
 * never to a real project.
 */
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { pickAuthDomain } from './authDomain';

const env = import.meta.env;
const useEmulators = env.VITE_USE_EMULATORS === 'true';

/** The emulators accept any key; these let a fresh checkout run with an empty `.env.local`. */
const EMULATOR_DEFAULTS = { apiKey: 'demo-api-key', projectId: 'demo-todo' };

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY || (useEmulators ? EMULATOR_DEFAULTS.apiKey : ''),
  // The page's own host on the app's Hosting domains, so the auth handler is same-origin (I5).
  authDomain: pickAuthDomain(
    typeof location === 'undefined' ? '' : location.host,
    env.VITE_FIREBASE_AUTH_DOMAINS,
    env.VITE_FIREBASE_AUTH_DOMAIN,
  ),
  projectId: env.VITE_FIREBASE_PROJECT_ID || (useEmulators ? EMULATOR_DEFAULTS.projectId : ''),
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

if (!config.apiKey) {
  console.error(
    '[firebase] config missing: create .env.local from .env.example (VITE_FIREBASE_* values).',
  );
}

/** A second evaluation of this module (a test re-importing it) reuses the app it set up. */
const firstInit = getApps().length === 0;

export const firebaseApp: FirebaseApp = firstInit ? initializeApp(config) : getApp();
export const auth: Auth = getAuth(firebaseApp);
export const db: Firestore = getFirestore(firebaseApp);

function hostAndPort(host: string): [string, number] {
  const at = host.lastIndexOf(':');
  return [host.slice(0, at), Number(host.slice(at + 1))];
}

if (useEmulators && firstInit) {
  const hosts = __FIREBASE_EMULATOR_HOSTS__;
  connectAuthEmulator(auth, `http://${hosts.auth}`, { disableWarnings: true });
  connectFirestoreEmulator(db, ...hostAndPort(hosts.firestore));
}
