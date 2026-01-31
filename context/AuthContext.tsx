import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider } from '../services/firebase';
import { 
    signInWithRedirect, // Changed from Popup to Redirect
    signOut, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    updateProfile,
    getRedirectResult, // Added to handle return from Google
    User as FirebaseUser 
} from 'firebase/auth';

import { getVehicles, syncUserProfile, seedDemoData } from '../services/db';
import { UserProfile, Vehicle, Role } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  currentVehicle: Vehicle | null;
  availableVehicles: Vehicle[];
  loading: boolean;
  isDrivingAssigned: boolean;
  setVehicle: (vehicleId: string) => void;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  demoLogin: (role?: Role) => void;
  authError: string | null; // Added to expose redirect errors
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  currentVehicle: null,
  availableVehicles: [],
  loading: true,
  isDrivingAssigned: true,
  setVehicle: () => {},
  login: async () => {},
  loginWithEmail: async () => {},
  registerWithEmail: async () => {},
  logout: async () => {},
  demoLogin: () => {},
  authError: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [currentVehicle, setCurrentVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Load vehicles helper
  const loadVehiclesData = async () => {
    try {
      const vehicles = await getVehicles();
      setAvailableVehicles(vehicles);
      return vehicles;
    } catch (err) {
      console.error("Failed to load vehicles", err);
      return [];
    }
  };

  const resolveVehicleSelection = (userProfile: UserProfile, vehicles: Vehicle[]) => {
    const storedVehicleId = localStorage.getItem(`lastVehicle_${userProfile.uid}`);
    const targetId = storedVehicleId || userProfile.assignedVehicleId;
    const found = vehicles.find(v => v.id === targetId) || vehicles.find(v => v.id === userProfile.assignedVehicleId);
    setCurrentVehicle(found || (vehicles.length > 0 ? vehicles[0] : null));
  };

  useEffect(() => {
    if (!auth) {
      console.warn("Auth service not available.");
      setLoading(false);
      return;
    }

    // 1. Handle Redirect Result (Error catching from Google Login)
    getRedirectResult(auth).catch((error) => {
        console.error("Google Redirect Error:", error);
        let msg = error.message;
        if (error.code === 'auth/unauthorized-domain') {
            msg = `Dominio non autorizzato (${window.location.hostname}). Aggiungilo in Firebase Console -> Auth -> Settings.`;
        }
        setAuthError(msg);
    });

    // 2. Listen for Auth State Changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setAuthError(null); // Clear errors on success
        try {
            // Get/Create User Profile in Firestore
            const userProfile = await syncUserProfile(
                firebaseUser.uid, 
                firebaseUser.email, 
                firebaseUser.displayName
            );
            setUser(userProfile);
            
            // Load Vehicles
            const vehicles = await loadVehiclesData();
            
            // Resolve Vehicle
            resolveVehicleSelection(userProfile, vehicles);

        } catch (error) {
            console.error("Error syncing user profile:", error);
            setAuthError("Errore durante la sincronizzazione del profilo.");
            setUser(null);
        }
      } else {
        setUser(null);
        setCurrentVehicle(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    if (!auth) throw new Error("Firebase non configurato.");
    setAuthError(null);
    try {
      // Use Redirect instead of Popup for better Mobile support
      await signInWithRedirect(auth, googleProvider!);
    } catch (error: any) {
      console.error("Login initiation failed", error);
      setAuthError(error.message);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
     if (!auth) throw new Error("Firebase non attivo");
     setAuthError(null);
     await signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
      if (!auth) throw new Error("Firebase non attivo");
      setAuthError(null);
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      
      if (userCredential.user) {
          await updateProfile(userCredential.user, {
              displayName: name
          });
          await syncUserProfile(userCredential.user.uid, email, name);
      }
  };

  const logout = async () => {
    if (auth) {
        await signOut(auth);
    }
    setUser(null);
    setCurrentVehicle(null);
    localStorage.removeItem(`lastVehicle_${user?.uid}`);
  };

  const demoLogin = async (role: Role = 'driver') => {
    setLoading(true);
    setAuthError(null);
    
    const mockUser: UserProfile = {
        uid: 'demo-user-123',
        email: 'demo@driverlog.it',
        displayName: 'Mario Rossi (Demo)',
        role: role,
        status: 'active',
        assignedVehicleId: 'mock-vehicle-1',
        assignedSector: 'Container'
    };

    if (role === 'driver') {
        seedDemoData(mockUser.uid);
    }

    setUser(mockUser);
    const vehicles = await loadVehiclesData();
    resolveVehicleSelection(mockUser, vehicles);
    
    setLoading(false);
  };

  const setVehicle = (vehicleId: string) => {
    if (!user) return;
    const selected = availableVehicles.find(v => v.id === vehicleId);
    if (selected) {
      setCurrentVehicle(selected);
      localStorage.setItem(`lastVehicle_${user.uid}`, vehicleId);
    }
  };

  const isDrivingAssigned = user && currentVehicle ? user.assignedVehicleId === currentVehicle.id : true;

  return (
    <AuthContext.Provider value={{ 
      user, 
      currentVehicle, 
      availableVehicles, 
      loading, 
      isDrivingAssigned,
      authError,
      setVehicle, 
      login, 
      loginWithEmail,
      registerWithEmail,
      logout, 
      demoLogin 
    }}>
      {children}
    </AuthContext.Provider>
  );
};