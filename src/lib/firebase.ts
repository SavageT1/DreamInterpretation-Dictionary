import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import firebaseConfig from '../../firebase-applet-config.json';

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY?.trim();
const clientConfig = apiKey ? { ...firebaseConfig, apiKey } : null;
const app = clientConfig ? initializeApp(clientConfig) : null;

export const firebaseEnabled = Boolean(app);
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : null;
export let analytics: Analytics | null = null;

if (app && typeof window !== "undefined") {
  void isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch(() => {
      analytics = null;
    });
}

export const googleProvider = new GoogleAuthProvider();
