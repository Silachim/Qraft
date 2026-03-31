// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY            || "AIzaSyCGDbbAYO8zvGe4J1Y0ouiW2LhgNzcKyxI",
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN        || "qraft-bf81d.firebaseapp.com",
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID         || "qraft-bf81d",
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET     || "qraft-bf81d.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID|| "456005423683",
  appId:             process.env.REACT_APP_FIREBASE_APP_ID             || "1:456005423683:web:5222ff12b493c02c3e7af6",
};

let app, auth, db, storage, googleProvider;

try {
  app            = initializeApp(firebaseConfig);
  auth           = getAuth(app);
  db             = getFirestore(app);
  storage        = getStorage(app);
  googleProvider = new GoogleAuthProvider();
} catch(e) {
  console.error("Firebase init failed:", e.message);
}

export { auth, db, storage, googleProvider };
export default app;