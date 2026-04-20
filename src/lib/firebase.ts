import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDYVKlLi2AWSmytDBU9IZSM1-O_uhIwdpU",
  authDomain: "dreaminterpretation-dictionary.firebaseapp.com",
  projectId: "dreaminterpretation-dictionary",
  storageBucket: "dreaminterpretation-dictionary.firebasestorage.app",
  messagingSenderId: "230105034067",
  appId: "1:230105034067:web:974ae9aa729b758ee945a6",
  measurementId: "G-PH1MMLJNR9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const googleProvider = new GoogleAuthProvider();
