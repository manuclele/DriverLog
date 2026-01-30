import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuration
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

try {
    // Singleton Initialization
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }

    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    
} catch (e) {
    console.error("Firebase Init Error:", e);
}

export { auth, db, googleProvider };