import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  writeBatch 
} from 'firebase/firestore';
import { TripLog, RefuelLog, AnyLog, MonthlyStats, LogType, UserProfile, Vehicle, Workshop } from '../types';

// --- MOCK DATA HANDLERS (Local Storage) ---
const getLocalData = (key: string) => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
};

const setLocalData = (key: string, data: any[]) => {
    localStorage.setItem(key, JSON.stringify(data));
};

// --- UTILS ---

// Get User Profile (Auto-Registration Logic)
export const syncUserProfile = async (uid: string, email: string | null, displayName: string | null): Promise<UserProfile> => {
    // Mock Mode
    if (!db) {
        console.log("Using Mock Profile Sync");
        const storedUsers = getLocalData('mock_users') || [];
        const existing = storedUsers.find((u: any) => u.uid === uid);
        
        if (existing) return existing;
        
        // AUTO-REGISTER NEW USER AS DRIVER (PENDING)
        // If it's a demo user, we auto-activate for UX, real users are pending
        const isDemo = email?.includes('demo'); 
        
        const newUser: UserProfile = {
            uid,
            email,
            displayName: displayName || 'Nuovo Utente',
            role: 'driver',
            status: isDemo ? 'active' : 'pending', // Default to Pending
            assignedVehicleId: '',
            assignedSector: 'Container'
        };
        
        // Save to mock storage so Master can see them
        storedUsers.push(newUser);
        setLocalData('mock_users', storedUsers);
        
        return newUser;
    }

    try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            return userSnap.data() as UserProfile;
        } else {
            // REGISTER NEW USER IN FIREBASE (PENDING)
            const newUser: UserProfile = {
                uid,
                email,
                displayName,
                role: 'driver', 
                status: 'pending', // IMPORTANT: New users must wait for approval
                assignedVehicleId: '',
                assignedSector: 'Container'
            };
            await setDoc(userRef, newUser);
            return newUser;
        }
    } catch (e) {
        console.error("DB Error (Profile), falling back to mock:", e);
        return { uid, email, displayName, role: 'driver', status: 'pending', assignedVehicleId: '', assignedSector: 'Container' };
    }
};

// --- USER MANAGEMENT (MASTER) ---

export const getUsers = async (): Promise<UserProfile[]> => {
    // Mock Mode
    if (!db) {
        const local = getLocalData('mock_users');
        if (local.length > 0) return local;
        
        // Return some fake users if empty
        return [
            { uid: 'demo-user-123', email: 'mario@driver.it', displayName: 'Mario Rossi (Demo)', role: 'driver', status: 'active', assignedVehicleId: 'mock-vehicle-1', assignedSector: 'Container' },
            { uid: 'demo-master-999', email: 'admin@log.it', displayName: 'Admin Master', role: 'master', status: 'active', assignedVehicleId: '', assignedSector: 'Container' }
        ];
    }

    try {
        const q = query(collection(db, 'users'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as UserProfile);
    } catch (e) {
        console.error("Error fetching users:", e);
        return [];
    }
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>) => {
    // Mock Mode
    if (!db) {
        let users = getLocalData('mock_users');
        users = users.map((u: any) => u.uid === uid ? { ...u, ...data } : u);
        setLocalData('mock_users', users);
        return;
    }

    try {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, data);
    } catch (e) {
        console.error("Error updating user:", e);
        throw e;
    }
};

export const deleteUserProfile = async (uid: string) => {
    // Mock Mode
    if (!db) {
        let users = getLocalData('mock_users');
        users = users.filter((u: any) => u.uid !== uid);
        setLocalData('mock_users', users);
        return;
    }

    try {
        await deleteDoc(doc(db, 'users', uid));
    } catch (e) {
        console.error("Error deleting user:", e);
        throw e;
    }
};

// --- CRUD OPERATIONS ---

export const addLog = async (collectionName: string, data: any) => {
  // Mock Mode
  if (!db) {
      const logs = getLocalData('mock_logs');
      const newLog = { 
          id: 'mock_' + Date.now(), 
          ...data,
          createdAt: new Date().toISOString(),
          timestamp: data.timestamp || Date.now()
      };
      logs.unshift(newLog); // Add to top
      setLocalData('mock_logs', logs);
      return { id: newLog.id };
  }

  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: new Date().toISOString(),
      timestamp: data.timestamp || Date.now()
    });
    return docRef;
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
};

export const updateLog = async (collectionName: string, id: string, data: any) => {
    // Mock Mode
    if (!db) {
        let logs = getLocalData('mock_logs');
        logs = logs.map((l: any) => l.id === id ? { ...l, ...data } : l);
        setLocalData('mock_logs', logs);
        return;
    }

    try {
        const docRef = doc(db, collectionName, id);
        await updateDoc(docRef, data);
    } catch (e) {
        console.error("Error updating document: ", e);
        throw e;
    }
};

export const deleteLog = async (collectionName: string, id: string) => {
    // Mock Mode
    if (!db) {
        let logs = getLocalData('mock_logs');
        logs = logs.filter((l: any) => l.id !== id);
        setLocalData('mock_logs', logs);
        return;
    }

    try {
        await deleteDoc(doc(db, collectionName, id));
    } catch (e) {
        console.error("Error deleting document: ", e);
        throw e;
    }
};

export const getLogs = async (userId: string, type: LogType, limitCount = 50): Promise<AnyLog[]> => {
    // Mock Mode
    if (!db) {
        const logs = getLocalData('mock_logs');
        return logs
            .filter((l: any) => l.userId === userId && l.type === type)
            .sort((a: any, b: any) => b.timestamp - a.timestamp)
            .slice(0, limitCount);
    }

    try {
        const q = query(
            collection(db, 'logs'),
            where('userId', '==', userId),
            where('type', '==', type),
            orderBy('timestamp', 'desc'),
            limit(limitCount)
        );
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AnyLog));
    } catch (e) {
        console.error("Error fetching logs:", e);
        return [];
    }
};

// --- MASTER/OWNER: GLOBAL LOGS ---

export const getAllLogs = async (limitCount = 100): Promise<AnyLog[]> => {
    // Mock Mode
    if (!db) {
        const logs = getLocalData('mock_logs');
        return logs.sort((a: any, b: any) => b.timestamp - a.timestamp).slice(0, limitCount);
    }

    try {
        const q = query(
            collection(db, 'logs'),
            orderBy('timestamp', 'desc'),
            limit(limitCount)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AnyLog));
    } catch (e) {
        console.error("Error fetching all logs:", e);
        return [];
    }
};

// --- STATS ---

export const getMonthlyStats = async (userId: string, vehicleId: string, monthKey: string): Promise<MonthlyStats | null> => {
  // Mock Mode
  if (!db) {
      const allStats = getLocalData('mock_stats');
      const compositeId = `${userId}_${vehicleId}_${monthKey}`;
      return allStats.find((s: any) => s.id === compositeId) || null;
  }

  try {
    const compositeId = `${userId}_${vehicleId}_${monthKey}`;
    const docRef = doc(db, 'monthlyStats', compositeId);
    const snapshot = await getDoc(docRef);
    
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as MonthlyStats;
    }
    return null;
  } catch (e) {
    console.error("Error fetching monthly stats:", e);
    return null;
  }
};

export const saveMonthlyStats = async (stats: MonthlyStats) => {
  const compositeId = `${stats.userId}_${stats.vehicleId}_${stats.monthKey}`;
  
  // Mock Mode
  if (!db) {
      let allStats = getLocalData('mock_stats');
      const existingIndex = allStats.findIndex((s: any) => s.id === compositeId);
      const newStat = { ...stats, id: compositeId };
      
      if (existingIndex >= 0) {
          allStats[existingIndex] = newStat;
      } else {
          allStats.push(newStat);
      }
      setLocalData('mock_stats', allStats);
      return;
  }

  try {
    const docRef = doc(db, 'monthlyStats', compositeId);
    await setDoc(docRef, stats, { merge: true });
  } catch (e) {
    console.error("Error saving monthly stats:", e);
    throw e;
  }
};

// --- VEHICLES ---

export const getVehicles = async (): Promise<Vehicle[]> => {
    // Mock Mode
    if (!db) {
        // Return defaults if nothing in local storage yet
        const local = getLocalData('mock_vehicles');
        if (local.length > 0) return local;

        return [
            { id: 'mock-vehicle-1', plate: 'AB 123 CD', code: 'TR-01', lastKm: 120000 },
            { id: 'mock-vehicle-2', plate: 'XY 987 ZW', code: 'TR-02', lastKm: 250000 },
            { id: 'mock-vehicle-3', plate: 'EF 456 GH', code: 'TR-03', lastKm: 85000 }
        ];
    }

    try {
        const q = query(collection(db, 'vehicles'), orderBy('plate'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
    } catch (e) {
        console.error("Error fetching vehicles:", e);
        return [];
    }
};

// --- WORKSHOPS (OFFICINE) ---

export const getWorkshops = async (): Promise<Workshop[]> => {
    // Mock Mode
    if (!db) {
        const local = getLocalData('mock_workshops');
        if (local.length > 0) return local;

        // Default Mock Data
        return [
            { id: 'ws1', name: "Officina Autorizzata Rossi", province: "MI" },
            { id: 'ws2', name: "Truck Service Milano Est", province: "MI" },
            { id: 'ws3', name: "Diesel Center Bergamo", province: "BG" },
            { id: 'ws4', name: "Officina Grandi Mezzi", province: "RM" },
            { id: 'ws5', name: "Napoli Truck Repair", province: "NA" },
        ];
    }

    try {
        const q = query(collection(db, 'workshops'), orderBy('province'), orderBy('name'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workshop));
    } catch (e) {
        console.error("Error fetching workshops:", e);
        return [];
    }
};

export const addWorkshop = async (workshop: Workshop) => {
    // Mock Mode
    if (!db) {
        const list = await getWorkshops();
        const newItem = { ...workshop, id: 'ws_' + Date.now() };
        list.push(newItem);
        setLocalData('mock_workshops', list);
        return newItem.id;
    }

    try {
        const docRef = await addDoc(collection(db, 'workshops'), workshop);
        return docRef.id;
    } catch (e) {
        console.error("Error adding workshop:", e);
        throw e;
    }
};

export const deleteWorkshop = async (id: string) => {
    // Mock Mode
    if (!db) {
        let list = await getWorkshops();
        list = list.filter(w => w.id !== id);
        setLocalData('mock_workshops', list);
        return;
    }

    try {
        await deleteDoc(doc(db, 'workshops', id));
    } catch (e) {
        console.error("Error deleting workshop:", e);
        throw e;
    }
};

// --- MASTER ACTIONS ---

export const resetDatabase = async () => {
    if (!db) {
        localStorage.removeItem('mock_logs');
        localStorage.removeItem('mock_stats');
        localStorage.removeItem('mock_workshops');
        localStorage.removeItem('mock_vehicles');
        localStorage.removeItem('mock_users');
        console.log("Mock Database Reset Complete");
        return;
    }

    const batch = writeBatch(db);
    // Be careful with this in production!
    console.log("Database Reset not fully implemented for Production DB safety.");
};