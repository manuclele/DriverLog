import { collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { TripLog, RefuelLog, MaintenanceLog, AnyLog } from '../types';

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

export const getLastTripSector = async (userId: string): Promise<string | null> => {
  if (!db) {
    // Mock data for demo
    await simulateDelay();
    return "Lombardia - Logistica A"; 
  }

  try {
    const logsRef = collection(db, 'logs');
    const q = query(
      logsRef,
      where('userId', '==', userId),
      where('type', '==', 'trip'),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const lastTrip = querySnapshot.docs[0].data() as TripLog;
      return lastTrip.sector;
    }
    return null;
  } catch (e) {
    console.error("Error fetching last trip:", e);
    return null;
  }
};

export const getVehicles = async () => {
    // Mock for dropdowns
    return [
        { id: 'v1', plate: 'AB 123 CD', code: 'TRUCK-01' },
        { id: 'v2', plate: 'EZ 999 XL', code: 'TRUCK-02' }
    ];
};