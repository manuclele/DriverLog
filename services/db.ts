import { collection, addDoc, query, where, orderBy, limit, getDocs, setDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { TripLog, RefuelLog, MaintenanceLog, AnyLog, MonthlyStats } from '../types';

// Helper to simulate DB delay if DB is not connected
const simulateDelay = () => new Promise(resolve => setTimeout(resolve, 600));

export const addLog = async (collectionName: string, data: any) => {
  if (!db) {
    await simulateDelay();
    console.log(`[MOCK DB] Adding to ${collectionName}:`, data);
    return;
  }
  try {
    await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: new Date().toISOString(),
      timestamp: Date.now()
    });
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
};

// --- Monthly Stats Logic ---

export const getMonthlyStats = async (userId: string, vehicleId: string, monthKey: string): Promise<MonthlyStats | null> => {
  if (!db) {
    await simulateDelay();
    // Mock Data return based on monthKey
    if (monthKey === new Date().toISOString().slice(0, 7)) {
       return { userId, vehicleId, monthKey, initialKm: 120000, finalKm: null };
    }
    return null;
  }

  try {
    const statsRef = collection(db, 'monthlyStats');
    const q = query(
      statsRef,
      where('userId', '==', userId),
      where('vehicleId', '==', vehicleId),
      where('monthKey', '==', monthKey),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as MonthlyStats;
    }
    return null;
  } catch (e) {
    console.error("Error fetching monthly stats:", e);
    return null;
  }
};

export const saveMonthlyStats = async (stats: MonthlyStats) => {
  if (!db) {
    await simulateDelay();
    console.log(`[MOCK DB] Saving Monthly Stats for ${stats.monthKey}:`, stats);
    return;
  }

  try {
    // Check if exists first (or use a composite ID like user_vehicle_month to use setDoc directly)
    const compositeId = `${stats.userId}_${stats.vehicleId}_${stats.monthKey}`;
    await setDoc(doc(db, 'monthlyStats', compositeId), stats, { merge: true });
  } catch (e) {
    console.error("Error saving monthly stats:", e);
    throw e;
  }
};

export const getVehicles = async () => {
    // Mock for dropdowns
    return [
        { id: 'v1', plate: 'AB 123 CD', code: 'TRUCK-01', lastKm: 120000 },
        { id: 'v2', plate: 'EZ 999 XL', code: 'TRUCK-02', lastKm: 85000 }
    ];
};