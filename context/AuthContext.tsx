import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider } from '../services/firebase';
// MOCK FIREBASE AUTH FUNCTIONS
// The environment does not support firebase/auth module imports correctly.
// We provide stubs here which will not be executed because 'auth' is null in Mock Mode.

const signInWithPopup = async (auth: any, provider: any) => { console.warn("Mock signInWithPopup"); };
const signOut = async (auth: any) => { console.warn("Mock signOut"); };
const onAuthStateChanged = (auth: any, nextOrObserver: any) => { return () => {}; };
const createUserWithEmailAndPassword = async (auth: any, email: string, pass: string) => { return { user: { uid: 'mock-uid', email } as any }; };
const signInWithEmailAndPassword = async (auth: any, email: string, pass: string) => { console.warn("Mock signInWithEmail"); };
const updateProfile = async (user: any, profile: any) => { console.warn("Mock updateProfile"); };

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

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: any) => {
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
        alert("Firebase non configurato. Usa 'Demo Autista'.");
        return;
    }
    try {
      await signInWithPopup(auth, googleProvider!);
    } catch (error: any) {
      console.error("Login failed", error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
     if (!auth) throw new Error("Firebase non attivo");
     await signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
      if (!auth) throw new Error("Firebase non attivo");
      
      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      
      // 2. Update Display Name immediately
      if (userCredential.user) {
          await updateProfile(userCredential.user, {
              displayName: name
          });
          
          // 3. Force sync to create DB entry with correct name
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

  // TRUE DEMO LOGIN for Preview Environment
  const demoLogin = async (role: Role = 'driver') => {
    setLoading(true);
    
    // Create a mock user (Always ACTIVE for demo)
    const mockUser: UserProfile = {
        uid: 'demo-user-123',
        email: 'demo@driverlog.it',
        displayName: 'Mario Rossi (Demo)',
        role: role,
        status: 'active',
        assignedVehicleId: 'mock-vehicle-1',
        assignedSector: 'Container'
    };

    // --- SEED DEMO DATA ---
    // If it's a driver, we pre-populate the mock DB with realistic data
    // so they see stats, trips, and logs immediately.
    if (role === 'driver') {
        seedDemoData(mockUser.uid);
    }

    setUser(mockUser);
    
    // Load mock vehicles (will be seeded by seedDemoData or already exist)
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
      loginWithEmail,
      registerWithEmail,
      logout, 
      demoLogin 
    }}>
      {children}
    </AuthContext.Provider>
  );
};