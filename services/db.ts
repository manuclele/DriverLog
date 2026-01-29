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

// --- UTILS ---

// Get User Profile from DB or return default if new
export const syncUserProfile = async (uid: string, email: string | null, displayName: string | null): Promise<UserProfile> => {
    if (!db) throw new Error("Database not initialized");

    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        return userSnap.data() as UserProfile;
    } else {
        // Create new user profile
        const newUser: UserProfile = {
            uid,
            email,
            displayName,
            role: 'driver', // Default role
            assignedVehicleId: '', // To be assigned by Master
            assignedSector: 'Container' // Default
        };
        await setDoc(userRef, newUser);
        return newUser;
    }
};

// --- CRUD OPERATIONS ---

export const addLog = async (collectionName: string, data: any) => {
  try {
    // Add createdAt/timestamp automatically
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
    try {
        const docRef = doc(db, collectionName, id);
        await updateDoc(docRef, data);
    } catch (e) {
        console.error("Error updating document: ", e);
        throw e;
    }
};

export const deleteLog = async (collectionName: string, id: string) => {
    try {
        await deleteDoc(doc(db, collectionName, id));
    } catch (e) {
        console.error("Error deleting document: ", e);
        throw e;
    }
};

export const getLogs = async (userId: string, type: LogType, limitCount = 50): Promise<AnyLog[]> => {
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
  try {
    // Composite ID for easier direct access: userId_vehicleId_monthKey
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
  try {
    const compositeId = `${stats.userId}_${stats.vehicleId}_${stats.monthKey}`;
    const docRef = doc(db, 'monthlyStats', compositeId);
    await setDoc(docRef, stats, { merge: true });
  } catch (e) {
    console.error("Error saving monthly stats:", e);
    throw e;
  }
};

// --- VEHICLES ---

export const getVehicles = async (): Promise<Vehicle[]> => {
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
    // WARNING: This deletes ALL logs. Use with caution.
    const batch = writeBatch(db);
    
    // 1. Delete Logs
    const logsSnap = await getDocs(collection(db, 'logs'));
    logsSnap.forEach((doc) => batch.delete(doc.ref));

    // 2. Delete Stats
    const statsSnap = await getDocs(collection(db, 'monthlyStats'));
    statsSnap.forEach((doc) => batch.delete(doc.ref));

    await batch.commit();
    console.log("Database Reset Complete");
};