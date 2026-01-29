import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { getFirestore } from 'firebase/firestore';

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

// Initialize Firebase
// Using compat libraries for app and auth due to missing modular exports in environment
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = getFirestore(app);
const googleProvider = new firebase.auth.GoogleAuthProvider();

console.log("Firebase connected successfully (Compat)");

// Export services
export { auth, db, googleProvider };