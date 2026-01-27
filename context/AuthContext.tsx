import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { getVehicles } from '../services/db';
import { UserProfile, Vehicle } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  currentVehicle: Vehicle | null;
  availableVehicles: Vehicle[];
  loading: boolean;
  isDrivingAssigned: boolean; // True if current == assigned
  setVehicle: (vehicleId: string) => void;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  demoLogin: () => void;
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

  // Determine which vehicle to select
  const resolveVehicleSelection = (userProfile: UserProfile, vehicles: Vehicle[]) => {
    // 1. Check local storage for a temporary override
    const storedVehicleId = localStorage.getItem(`lastVehicle_${userProfile.uid}`);
    
    // 2. Determine ID to use (Stored > Assigned)
    const targetId = storedVehicleId || userProfile.assignedVehicleId;
    
    // 3. Find the object
    const found = vehicles.find(v => v.id === targetId) || vehicles.find(v => v.id === userProfile.assignedVehicleId);
    
    setCurrentVehicle(found || null);
  };

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Mock fetching user profile + assigned vehicle
        const userProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          role: 'driver',
          assignedVehicleId: 'v1', // Default assigned vehicle (mock)
          assignedSector: 'Container' // Default sector
        };
        setUser(userProfile);
        
        const vehicles = await loadVehiclesData();
        resolveVehicleSelection(userProfile, vehicles);

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
    localStorage.removeItem('lastVehicle_demo-user-123'); // Clear for demo cleanup usually
  };

  const demoLogin = async () => {
    setLoading(true);
    // Mock User
    const demoUser: UserProfile = {
      uid: 'demo-user-123',
      email: 'driver@example.com',
      displayName: 'Mario Rossi',
      role: 'driver',
      assignedVehicleId: 'v1', // TRUCK-01 is assigned
      assignedSector: 'Container'
    };
    
    setUser(demoUser);
    const vehicles = await loadVehiclesData();
    resolveVehicleSelection(demoUser, vehicles);
    
    setLoading(false);
  };

  const setVehicle = (vehicleId: string) => {
    if (!user) return;
    
    const selected = availableVehicles.find(v => v.id === vehicleId);
    if (selected) {
      setCurrentVehicle(selected);
      // Persist choice
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