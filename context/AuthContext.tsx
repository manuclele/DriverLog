import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider } from '../services/firebase';
import { getVehicles, syncUserProfile } from '../services/db';
import { UserProfile, Vehicle, Role } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  currentVehicle: Vehicle | null;
  availableVehicles: Vehicle[];
  loading: boolean;
  isDrivingAssigned: boolean;
  setVehicle: (vehicleId: string) => void;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  demoLogin: (role?: Role) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  currentVehicle: null,
  availableVehicles: [],
  loading: true,
  isDrivingAssigned: true,
  setVehicle: () => {},
  login: async () => {},
  logout: async () => {},
  demoLogin: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [currentVehicle, setCurrentVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

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
    setCurrentVehicle(found || null);
  };

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
            // 1. Get/Create User Profile in Firestore
            const userProfile = await syncUserProfile(
                firebaseUser.uid, 
                firebaseUser.email, 
                firebaseUser.displayName
            );
            setUser(userProfile);
            
            // 2. Load Vehicles
            const vehicles = await loadVehiclesData();
            
            // 3. Resolve Vehicle
            resolveVehicleSelection(userProfile, vehicles);

        } catch (error) {
            console.error("Error syncing user profile:", error);
            // Fallback for UI if DB fails
            setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                role: 'driver',
                assignedVehicleId: '',
                assignedSector: 'Container'
            });
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
    if (!auth) return;
    try {
      await auth.signInWithPopup(googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const logout = async () => {
    if (!auth) {
      setUser(null);
      return;
    }
    await auth.signOut();
    localStorage.removeItem(`lastVehicle_${user?.uid}`);
  };

  // WARNING: Demo Login now creates a "fake" auth state, 
  // but it won't work well with real Firestore rules if we enable them strictly.
  // Useful only for UI testing without network.
  const demoLogin = async (role: Role = 'driver') => {
    alert("Attenzione: La modalità Demo Login non salva i dati nel DB reale (richiede Auth Reale). Usa 'Accedi con Google'.");
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
      setVehicle, 
      login, 
      logout, 
      demoLogin 
    }}>
      {children}
    </AuthContext.Provider>
  );
};