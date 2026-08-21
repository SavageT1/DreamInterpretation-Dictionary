import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDYVKlLi2AWSmytDBU9IZSM1-O_uhIwdpU',
  authDomain: 'dreaminterpretation-dictionary.firebaseapp.com',
  projectId: 'dreaminterpretation-dictionary',
  storageBucket: 'dreaminterpretation-dictionary.firebasestorage.app',
  messagingSenderId: '230105034067',
  appId: '1:230105034067:web:974ae9aa729b758ee945a6',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
