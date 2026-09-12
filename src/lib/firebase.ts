import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

// Fill these in from your Firebase console (Project settings > General > Your apps > Web app).
// Firebase web config is not a secret by design, but keep this file out of public repos
// if you'd rather not expose your project id.
const firebaseConfig = {
  apiKey: "AIzaSyAzhFKqsQG_BvKsI5Hy_yrXJDoKdwYHEdw",
  authDomain: "gig-time.firebaseapp.com",
  projectId: "gig-time",
  storageBucket: "gig-time.firebasestorage.app",
  messagingSenderId: "921240536388",
  appId: "1:921240536388:web:9931a9aeb1feef27504311",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// clockOut/addManualEntry etc pass objects with some fields deliberately left
// undefined (e.g. no mood picked) -- Firestore rejects undefined values by
// default, so this option is required, not cosmetic.
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
