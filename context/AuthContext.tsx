import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider } from '../services/firebase';
import { 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    updateProfile,
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
    // If Auth failed to initialize (e.g. config error), we might be in a forced mock state
    if (!auth) {
      console.warn("Auth service not available. App might require Demo Login.");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
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
    if (!auth) throw new Error("Firebase non configurato.");
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
      
      // 2. Update Display Name immediately in Auth
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
    // Clear state locally as well
    setUser(null);
    setCurrentVehicle(null);
    localStorage.removeItem(`lastVehicle_${user?.uid}`);
  };

  // TRUE DEMO LOGIN for Preview Environment / Testing without Firebase
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