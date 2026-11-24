// Firebase setup: the app, sign-in (Auth) and the database (Firestore). Everything else imports
// `auth` and `db` from here. Nothing in here talks to the internet until something asks it to,
// so the maps and directions never wait on Firebase.
//
// Emulator (for staff who run without our live project): start the app with
//   EXPO_PUBLIC_USE_EMULATOR=1 npx expo start
// and, on a phone, EXPO_PUBLIC_EMULATOR_HOST=<your laptop's IP> (default "localhost").
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth, connectAuthEmulator, getAuth, getReactNativePersistence, initializeAuth,
} from 'firebase/auth';
import { Firestore, connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import { firebaseConfig } from './firebaseConfig';

export const useEmulator = process.env.EXPO_PUBLIC_USE_EMULATOR === '1';
const emulatorHost = process.env.EXPO_PUBLIC_EMULATOR_HOST || 'localhost';

const fresh = getApps().length === 0; // false when the dev server reloads this file
const app = fresh ? initializeApp(firebaseConfig) : getApp();

// On phones, keep the sign-in in AsyncStorage so you stay signed in after closing the app.
// On the web, Firebase keeps it in the browser by itself.
export const auth: Auth = !fresh
  ? getAuth(app)
  : Platform.OS === 'web'
    ? getAuth(app)
    : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });

export const db: Firestore = getFirestore(app);

if (fresh && useEmulator) {
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, emulatorHost, 8080);
}
