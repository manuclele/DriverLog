import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider } from '../services/firebase';
// import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'; // Removed due to import errors
import { getVehicles, syncUserProfile } from '../services/db';
import { UserProfile, Vehicle, Role } from '../types';

// Mock replacements for missing Firebase functions
const signInWithPopup = async (auth: any, provider: any) => { throw new Error("Mock Mode: Cannot sign in"); };
const signOut = async (auth: any) => { console.log("Mock SignOut"); };
const onAuthStateChanged = (auth: any, callback: (user: any) => void) => { return () => {}; };

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
    setCurrentVehicle(found || (vehicles.length > 0 ? vehicles[0] : null));
  };

  useEffect(() => {
    // If Auth is null (Mock mode), stop loading immediately
    if (!auth) {
      console.log("Auth not initialized (Mock Mode available)");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
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
    if (!auth) {
        alert("Firebase non configurato o bloccato in questo ambiente. Usa 'Demo Autista'.");
        return;
    }
    try {
      await signInWithPopup(auth, googleProvider!);
    } catch (error: any) {
      console.error("Login failed", error);
      alert(`Login fallito: ${error.message}`);
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

  // TRUE DEMO LOGIN for Preview Environment
  const demoLogin = async (role: Role = 'driver') => {
    setLoading(true);
    
    // Create a mock user
    const mockUser: UserProfile = {
        uid: 'demo-user-123',
        email: 'demo@driverlog.it',
        displayName: 'Mario Rossi (Demo)',
        role: role,
        assignedVehicleId: 'mock-vehicle-1',
        assignedSector: 'Container'
    };

    setUser(mockUser);
    
    // Load mock vehicles
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
      setVehicle, 
      login, 
      logout, 
      demoLogin 
    }}>
      {children}
    </AuthContext.Provider>
  );
};