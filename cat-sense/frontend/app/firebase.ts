import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD8FJFcUYLv9SyhHDKheo-ZIRlW7k_Qmno",
  authDomain: "catsense-1628d.firebaseapp.com",
  projectId: "catsense-1628d",
  storageBucket: "catsense-1628d.firebasestorage.app",
  messagingSenderId: "369976719545",
  appId: "1:369976719545:web:311727c418dc8ccc8f8368",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
