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
import { TripLog, RefuelLog, AnyLog, MonthlyStats, LogType, UserProfile, Vehicle } from '../types';

// --- MOCK DATA HANDLERS (Local Storage) ---
const getLocalData = (key: string) => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
};

const setLocalData = (key: string, data: any[]) => {
    localStorage.setItem(key, JSON.stringify(data));
};

// --- UTILS ---

// Get User Profile
export const syncUserProfile = async (uid: string, email: string | null, displayName: string | null): Promise<UserProfile> => {
    // Mock Mode
    if (!db) {
        console.log("Using Mock Profile");
        return {
            uid,
            email,
            displayName,
            role: 'driver',
            assignedVehicleId: 'mock-vehicle-1',
            assignedSector: 'Container'
        };
    }

    try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            return userSnap.data() as UserProfile;
        } else {
            const newUser: UserProfile = {
                uid,
                email,
                displayName,
                role: 'driver',
                assignedVehicleId: '',
                assignedSector: 'Container'
            };
            await setDoc(userRef, newUser);
            return newUser;
        }
    } catch (e) {
        console.error("DB Error (Profile), falling back to mock:", e);
        return { uid, email, displayName, role: 'driver', assignedVehicleId: '', assignedSector: 'Container' };
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
        return [
            { id: 'mock-vehicle-1', plate: 'AB 123 CD', code: 'TR-01', lastKm: 120000 },
            { id: 'mock-vehicle-2', plate: 'XY 987 ZW', code: 'TR-02', lastKm: 250000 },
            { id: 'mock-vehicle-3', plate: 'EF 456 GH', code: 'TR-03', lastKm: 85000 }
        ];
    }

    try {
        const q = query(collection(db, 'vehicles'), orderBy('plate'));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            return []; 
        }

        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
    } catch (e) {
        console.error("Error fetching vehicles:", e);
        return [];
    }
};

// --- MASTER ACTIONS ---

export const resetDatabase = async () => {
    if (!db) {
        localStorage.removeItem('mock_logs');
        localStorage.removeItem('mock_stats');
        console.log("Mock Database Reset Complete");
        return;
    }

    const batch = writeBatch(db);
    const logsSnap = await getDocs(collection(db, 'logs'));
    logsSnap.forEach((doc) => batch.delete(doc.ref));
    const statsSnap = await getDocs(collection(db, 'monthlyStats'));
    statsSnap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log("Database Reset Complete");
};