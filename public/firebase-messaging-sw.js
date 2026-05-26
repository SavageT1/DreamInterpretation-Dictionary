importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDYVKlLi2AWSmytDBU9IZSM1-O_uhIwdpU",
  authDomain: "dreaminterpretation-dictionary.firebaseapp.com",
  projectId: "dreaminterpretation-dictionary",
  storageBucket: "dreaminterpretation-dictionary.firebasestorage.app",
  messagingSenderId: "230105034067",
  appId: "1:230105034067:web:974ae9aa729b758ee945a6",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging(); 
