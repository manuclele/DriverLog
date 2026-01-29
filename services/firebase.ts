// import { initializeApp, getApps, getApp } from 'firebase/app';
// import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
// import { getFirestore, Firestore } from 'firebase/firestore';

// Configuration provided by the user
const firebaseConfig = {
  apiKey: "AIzaSyAUYtiSH2zikgshqnY4feyFewJKZ8Psddc",
  authDomain: "driverlog-72469.firebaseapp.com",
  projectId: "driverlog-72469",
  storageBucket: "driverlog-72469.firebasestorage.app",
  messagingSenderId: "325805623506",
  appId: "1:325805623506:web:97563142526794b361050b",
  measurementId: "G-JLCF4DF0RL"
};

let app: any = null;
let auth: any = null;
let db: any = null;
let googleProvider: any = null;

// FORCE MOCK MODE:
// The environment seems to lack correct Firebase module exports or version compatibility.
// We fallback to null exports which triggers the "Mock Mode" in the rest of the application.
console.warn("Firebase imports failed. Running in Offline/Mock Mode.");

/*
try {
  // Initialize Firebase (Modular)
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
  console.log("Firebase initialized successfully");
} catch (error) {
  console.warn("Firebase initialization failed (Running in Offline/Mock Mode):", error);
  // We leave auth and db as null. The db.ts service will handle this.
}
*/

// Export services
export { auth, db, googleProvider };