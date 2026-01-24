

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';
import Constants from "expo-constants";

const {
  firebaseApiKey,
  firebaseAuthDomain,
  firebaseProjectId,
  firebaseStorageBucket,
  firebaseMessagingSenderId,
  firebaseAppId,
} = Constants.expoConfig.extra;

const firebaseConfig = {
  apiKey: firebaseApiKey,
  authDomain: firebaseAuthDomain,
  projectId: firebaseProjectId,
  storageBucket: firebaseStorageBucket,
  messagingSenderId: firebaseMessagingSenderId,
  appId: firebaseAppId,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();


let auth;

if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  // React Native üçün AsyncStorage ilə persistence təyin et
  if (getApps().length === 1) {
    // App yeni initialize olubsa, initializeAuth istifadə et
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } else {
    // App artıq initialize olubsa, getAuth istifadə et
    auth = getAuth(app);
  }
}
export const storage = getStorage(app);
export const db = getFirestore(app);

export { auth, app }; 