import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// NOTE: In a real production environment, these would be process.env.NEXT_PUBLIC_...
// For this demo context, we must rely on the environment variables being present or handle the missing keys gracefully.
const firebaseConfig = {
  apiKey: process.env.API_KEY || "demo-key",
  authDomain: process.env.AUTH_DOMAIN || "demo.firebaseapp.com",
  projectId: process.env.PROJECT_ID || "demo-project",
  storageBucket: process.env.STORAGE_BUCKET || "demo.appspot.com",
  messagingSenderId: process.env.MESSAGING_SENDER_ID || "12345",
  appId: process.env.APP_ID || "1:12345:web:12345"
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

// Initialize Firebase only if we have a valid key, otherwise we might mock it for UI dev
try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.warn("Firebase initialization failed (likely missing keys). App will run in UI-only mode.", error);
  // We can leave these undefined or mock them if strictly necessary, 
  // but for this output, we assume standard usage patterns in components.
}

export { auth, db };
export const googleProvider = new GoogleAuthProvider();