import { db } from './firebase';
import { 
  collection, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, getDocs, 
  query, where, orderBy, limit, writeBatch 
} from 'firebase/firestore';
import { TripLog, RefuelLog, AnyLog, MonthlyStats, LogType, UserProfile, Vehicle, Workshop, FuelStation, Sector } from '../types';

// --- LOCAL STORAGE HELPERS (Fallback) ---
const getLocalData = (key: string) => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
};

const setLocalData = (key: string, data: any[]) => {
    localStorage.setItem(key, JSON.stringify(data));
};

// --- FIRESTORE SEEDER (Production Init) ---
export const seedFirestore = async () => {
    if (!db) return alert("Firebase non attivo.");
    
    try {
        const batch = writeBatch(db);
        
        // 1. Initial Sectors
        const sectors: Sector[] = [
            {
                id: 'sec_container',
                name: 'Container',
                fields: [
                    { id: 'f1', label: 'Tipologia', type: 'select', options: ['20 Box', '40 Box', '40 HC', '20 Reefer', '40 Reefer', 'Open Top'], required: true },
                    { id: 'f2', label: 'Sigillo', type: 'text', required: false }
                ]
            },
            {
                id: 'sec_centina',
                name: 'Centina',
                fields: [
                    { id: 'f1', label: 'Tipologia Merce', type: 'text', required: true },
                    { id: 'f2', label: 'Nr. Pallets', type: 'number', required: false }
                ]
            }
        ];

        sectors.forEach(s => {
            const ref = doc(db, 'sectors', s.id!);
            batch.set(ref, s);
        });

        await batch.commit();
        console.log("Database seeded successfully.");
    } catch (e) {
        console.error("Seeding error:", e);
        throw e;
    }
};

// --- SYSTEM RESET UTILS ---
const deleteCollectionBatch = async (collectionName: string, excludeId?: string) => {
    if (!db) return;
    const q = query(collection(db, collectionName));
    const snapshot = await getDocs(q);
    
    // Firestore batch limit is 500. We do chunks.
    const CHUNK_SIZE = 400; 
    const docs = snapshot.docs;
    
    for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
        const chunk = docs.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        let count = 0;

        chunk.forEach(docSnap => {
            if (excludeId && docSnap.id === excludeId) return; // Skip protected doc
            batch.delete(docSnap.ref);
            count++;
        });

        if (count > 0) await batch.commit();
    }
};

export const resetSystemData = async (scope: 'logs' | 'vehicles' | 'users' | 'all', currentUserId?: string) => {
    if (!db) return;

    if (scope === 'logs' || scope === 'all') {
        await deleteCollectionBatch('logs');
        await deleteCollectionBatch('monthly_stats');
    }

    if (scope === 'vehicles' || scope === 'all') {
        await deleteCollectionBatch('vehicles');
    }

    if (scope === 'users' || scope === 'all') {
        // IMPORTANT: Never delete the current Master user executing the reset
        await deleteCollectionBatch('users', currentUserId);
    }
};


// --- MOCK DATA SEEDER (Local Demo) ---
export const seedDemoData = (userId: string) => {
    const today = new Date();
    const monthKey = today.toISOString().slice(0, 7);

    // Mock Vehicles
    const vehicles: Vehicle[] = [
        { id: 'mock-vehicle-1', plate: 'AB 123 CD', code: 'TR-01', type: 'tractor' }, 
        { id: 'mock-vehicle-2', plate: 'XY 987 ZW', code: 'TR-02', type: 'tractor' }
    ];
    setLocalData('mock_vehicles', vehicles);

    // Mock Sectors
    const sectors: Sector[] = [
        {
            id: 'sec_container',
            name: 'Container',
            fields: [{ id: 'f1', label: 'Tipologia', type: 'select', options: ['20 Box', '40 HC'], required: true }]
        }
    ];
    setLocalData('mock_sectors', sectors);
};

// --- SECTORS (CRUD) ---
export const getSectors = async (): Promise<Sector[]> => {
    if (!db) return getLocalData('mock_sectors');
    try {
        const q = query(collection(db, 'sectors'), orderBy('name'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sector));
    } catch (e) {
        console.error("Error fetching sectors", e);
        return [];
    }
};

export const addSector = async (sector: Sector) => {
    if (!db) return;
    return await addDoc(collection(db, 'sectors'), sector);
};

export const updateSector = async (id: string, data: Partial<Sector>) => {
    if (!db) return;
    await updateDoc(doc(db, 'sectors', id), data);
};

export const deleteSector = async (id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, 'sectors', id));
};

// --- USER MANAGEMENT ---
export const syncUserProfile = async (uid: string, email: string | null, displayName: string | null): Promise<UserProfile> => {
    // DEVELOPER OVERRIDE: Automatically make this email a Master
    const isAdminEmail = email === 'manuclele@gmail.com';

    const initialProfile: UserProfile = {
        uid,
        email,
        displayName,
        role: isAdminEmail ? 'master' : 'driver',
        status: isAdminEmail ? 'active' : 'pending',
        assignedVehicleId: '',
        assignedSector: 'Container'
    };

    if (!db) return initialProfile;

    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        
        // Auto-fix permissions for dev if they were created with wrong role previously
        if (isAdminEmail && data.role !== 'master') {
             await updateDoc(userRef, { role: 'master', status: 'active' });
             return { ...data, role: 'master', status: 'active' };
        }
        
        return data;
    } else {
        await setDoc(userRef, initialProfile);
        return initialProfile;
    }
};

export const getUsers = async (): Promise<UserProfile[]> => {
    if (!db) return [];
    const q = query(collection(db, 'users'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as UserProfile);
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>) => {
    if (!db) return;
    await updateDoc(doc(db, 'users', uid), data);
};

export const deleteUserProfile = async (uid: string) => {
    if (!db) return;
    await deleteDoc(doc(db, 'users', uid));
};

// --- VEHICLES ---
export const getVehicles = async (): Promise<Vehicle[]> => {
    if (!db) return getLocalData('mock_vehicles');
    const q = query(collection(db, 'vehicles'), orderBy('plate'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
};

export const addVehicle = async (vehicle: Vehicle): Promise<string> => {
    if (!db) return 'mock-id';
    const docRef = await addDoc(collection(db, 'vehicles'), vehicle);
    return docRef.id;
};

export const updateVehicle = async (id: string, data: Partial<Vehicle>) => {
    if (!db) return;
    await updateDoc(doc(db, 'vehicles', id), data);
};

export const deleteVehicle = async (id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, 'vehicles', id));
};

export const batchImportVehicles = async (vehicles: Vehicle[]) => {
    if (!db) return;
    const batch = writeBatch(db);
    vehicles.forEach(v => {
        const ref = v.id ? doc(db, 'vehicles', v.id) : doc(collection(db, 'vehicles'));
        batch.set(ref, v); 
    });
    await batch.commit();
};

// --- WORKSHOPS & STATIONS ---
export const getWorkshops = async (): Promise<Workshop[]> => {
    if (!db) return [];
    const q = query(collection(db, 'workshops'), orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workshop));
};

export const addWorkshop = async (workshop: Workshop) => {
    if (!db) return;
    await addDoc(collection(db, 'workshops'), workshop);
};

export const deleteWorkshop = async (id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, 'workshops', id));
};

export const getFuelStations = async (): Promise<FuelStation[]> => {
    if (!db) return [];
    const q = query(collection(db, 'fuel_stations'), orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FuelStation));
};

export const addFuelStation = async (station: FuelStation) => {
    if (!db) return;
    await addDoc(collection(db, 'fuel_stations'), station);
};

export const deleteFuelStation = async (id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, 'fuel_stations', id));
};

// --- LOGS ---
export const addLog = async (collectionName: string, data: any) => {
    if (!db) {
        // Mock fallback
        const list = getLocalData('mock_logs');
        const newItem = { ...data, id: 'log_' + Date.now(), createdAt: new Date().toISOString() };
        list.unshift(newItem); 
        setLocalData('mock_logs', list);
        return { id: newItem.id };
    }
    return await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: new Date().toISOString()
    });
};

export const updateLog = async (collectionName: string, id: string, data: any) => {
    if (!db) return;
    await updateDoc(doc(db, collectionName, id), data);
};

export const deleteLog = async (collectionName: string, id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, collectionName, id));
};

export const getLogs = async (userId: string, type?: LogType, limitCount: number = 50): Promise<AnyLog[]> => {
    if (!db) {
        let list = getLocalData('mock_logs');
        list = list.filter((l: AnyLog) => l.userId === userId);
        if (type) list = list.filter((l: AnyLog) => l.type === type);
        return list.slice(0, limitCount);
    }
    
    let q = query(collection(db, 'logs'), where('userId', '==', userId));
    if (type) {
        q = query(q, where('type', '==', type));
    }
    q = query(q, orderBy('timestamp', 'desc'), limit(limitCount));
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AnyLog));
};

// --- MONTHLY STATS ---
export const saveMonthlyStats = async (stats: MonthlyStats) => {
    const id = stats.id || `${stats.userId}_${stats.vehicleId}_${stats.monthKey}`;
    const dataToSave = { ...stats, id };
    
    if (!db) return; // No mock fallback for stats in prod to avoid sync issues

    const docRef = doc(db, 'monthly_stats', id);
    await setDoc(docRef, dataToSave);
};

export const getUserMonthlyStats = async (userId: string, monthKey: string): Promise<MonthlyStats[]> => {
    if (!db) return [];
    const q = query(collection(db, 'monthly_stats'), where('userId', '==', userId), where('monthKey', '==', monthKey));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as MonthlyStats);
};

export const getPreviousMonthStats = async (userId: string, vehicleId: string, currentMonthKey: string): Promise<MonthlyStats | null> => {
    if (!db) return null;
    const [y, m] = currentMonthKey.split('-').map(Number);
    // Handle Jan -> Dec previous year logic
    const prevDate = new Date(y, m - 2, 1); 
    const prevKey = prevDate.toISOString().slice(0, 7);
    
    const id = `${userId}_${vehicleId}_${prevKey}`;
    const snap = await getDoc(doc(db, 'monthly_stats', id));
    return snap.exists() ? snap.data() as MonthlyStats : null;
};