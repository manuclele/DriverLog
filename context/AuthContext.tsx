import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  demoLogin: () => void; // Added for testing without API keys
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  demoLogin: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // In a real app, we would fetch the 'role' and 'currentVehicleId' from Firestore 'users' collection here
        // const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        // const userData = userDoc.data();
        
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          role: 'driver', // Default to driver for now
          currentVehicleId: 'demo-vehicle-123' 
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    if (!auth) return;
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const logout = async () => {
    if (!auth) {
      setUser(null);
      return;
    }
    await signOut(auth);
  };

  const demoLogin = () => {
    setUser({
      uid: 'demo-user-123',
      email: 'driver@example.com',
      displayName: 'Mario Rossi',
      role: 'driver',
      currentVehicleId: 'VE-999-XX'
    });
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, demoLogin }}>
      {children}
    </AuthContext.Provider>
  );
};