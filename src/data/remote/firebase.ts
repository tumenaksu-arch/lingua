import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

/**
 * Firebase Web SDK (modular) wired for React Native / Expo.
 * Config comes from EXPO_PUBLIC_FIREBASE_* (see .env.example); these values are
 * public identifiers, not secrets — access is enforced by Firestore rules.
 * Without a config the app runs offline-only and every helper here returns null.
 */
export function firebaseConfig() {
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;
  if (!apiKey || !projectId || !appId) return null;
  return {
    apiKey,
    projectId,
    appId,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? `${projectId}.firebaseapp.com`,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? `${projectId}.firebasestorage.app`,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  };
}

export function isFirebaseConfigured(): boolean {
  return firebaseConfig() !== null;
}

/**
 * `getReactNativePersistence` exists only in the SDK's `react-native` export
 * condition, which Metro selects on iOS/Android (verified in
 * @expo/metro-config `unstable_conditionsByPlatform`). TypeScript resolves the
 * `types` condition first and therefore sees the browser typings, so the member
 * is typed here explicitly; see @firebase/auth/dist/rn/index.rn.d.ts.
 */
const { getReactNativePersistence } = FirebaseAuth as typeof FirebaseAuth & {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};

let app: FirebaseApp | null | undefined;
let auth: Auth | null | undefined;
let firestore: Firestore | null | undefined;

export function getFirebaseApp(): FirebaseApp | null {
  if (app !== undefined) return app;
  const cfg = firebaseConfig();
  app = cfg ? (getApps()[0] ?? initializeApp(cfg)) : null;
  return app;
}

/** Auth with session persistence in AsyncStorage (the SDK's React Native entry). */
export function getFirebaseAuth(): Auth | null {
  if (auth !== undefined) return auth;
  const a = getFirebaseApp();
  if (!a) {
    auth = null;
    return auth;
  }
  try {
    auth = initializeAuth(a, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // initializeAuth throws if called twice for the same app (e.g. after Fast Refresh)
    auth = getAuth(a);
  }
  return auth;
}

export function getFirestoreDb(): Firestore | null {
  if (firestore !== undefined) return firestore;
  const a = getFirebaseApp();
  firestore = a ? getFirestore(a) : null;
  return firestore;
}
