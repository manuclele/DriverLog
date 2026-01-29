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
import { TripLog, RefuelLog, AnyLog, MonthlyStats, LogType, UserProfile, Vehicle, Workshop, FuelStation, Sector } from '../types';

// --- MOCK DATA HANDLERS (Local Storage) ---
const getLocalData = (key: string) => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
};

const setLocalData = (key: string, data: any[]) => {
    localStorage.setItem(key, JSON.stringify(data));
};

// --- DEMO DATA SEEDER ---
export const seedDemoData = (userId: string) => {
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today); twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    const monthKey = today.toISOString().slice(0, 7); // YYYY-MM
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

    // 1. Mock Vehicles
    const vehicles: Vehicle[] = [
        { id: 'mock-vehicle-1', plate: 'AB 123 CD', code: 'TR-01', type: 'tractor' }, 
        { id: 'mock-vehicle-2', plate: 'XY 987 ZW', code: 'TR-02', type: 'tractor' }, 
        { id: 'mock-vehicle-3', plate: 'RIM-001', code: 'SR-01', type: 'trailer', subType: 'container' }
    ];
    setLocalData('mock_vehicles', vehicles);

    // 2. Mock Fuel Stations
    const stations: FuelStation[] = [
        { id: 'fs1', name: "Pompa Interna Hub", isPartner: true },
        { id: 'fs2', name: "DKV Station Convenzionata", isPartner: true },
        { id: 'fs3', name: "Eni Route Card", isPartner: true },
        { id: 'fs4', name: "Distributore Generico", isPartner: false }
    ];
    setLocalData('mock_fuel_stations', stations);

    // 3. Mock Sectors (NEW DYNAMIC CONFIGURATION)
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
            id: 'sec_cisterna',
            name: 'Cisterna',
            fields: [
                { id: 'f1', label: 'Prodotto', type: 'text', required: true },
                { id: 'f2', label: 'Quantità (Q.li)', type: 'number', required: true },
                { id: 'f3', label: 'Lavaggio', type: 'select', options: ['Non Richiesto', 'Effettuato', 'Da Fare'], required: false }
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
    setLocalData('mock_sectors', sectors);

    // 4. Mock Stats
    const stats: MonthlyStats[] = [
        {
            id: `${userId}_mock-vehicle-1_${monthKey}`,
            userId,
            vehicleId: 'mock-vehicle-1',
            monthKey,
            initialKm: 145000,
            finalKm: 145850
        },
        {
            id: `${userId}_mock-vehicle-2_${monthKey}`,
            userId,
            vehicleId: 'mock-vehicle-2',
            monthKey,
            initialKm: 80000,
            finalKm: 80230 
        }
    ];
    setLocalData('mock_stats', stats);

    // 5. Mock Logs (Trips updated with customData)
    const logs: AnyLog[] = [
        // -- TRIPS --
        {
            id: 'trip_1', type: 'trip', userId, vehicleId: 'mock-vehicle-1',
            date: todayStr, bollaNumber: '2024/A001', sector: 'Container',
            departure: 'Milano Hub', destination: 'Genova Porto', 
            customData: { 'Tipologia': '40 HC', 'Sigillo': 'X998877' },
            timestamp: today.setHours(8, 0, 0), createdAt: new Date().toISOString()
        },
        {
            id: 'trip_2', type: 'trip', userId, vehicleId: 'mock-vehicle-1',
            date: todayStr, bollaNumber: '2024/A002', sector: 'Container',
            departure: 'Genova Porto', destination: 'Piacenza Logistica', 
            customData: { 'Tipologia': '20 Box' },
            timestamp: today.setHours(14, 0, 0), createdAt: new Date().toISOString()
        },
        {
            id: 'trip_3', type: 'trip', userId, vehicleId: 'mock-vehicle-2',
            date: yesterdayStr, bollaNumber: '2024/B999', sector: 'Cisterna',
            departure: 'Torino Interporto', destination: 'Lione (FR)', 
            customData: { 'Prodotto': 'Latte Alimentare', 'Quantità (Q.li)': 280, 'Lavaggio': 'Effettuato' },
            timestamp: yesterday.setHours(6, 30, 0), createdAt: new Date().toISOString()
        },

        // -- REFUELS --
        {
            id: 'refuel_1', type: 'refuel', userId, vehicleId: 'mock-vehicle-1', subType: 'diesel',
            stationName: 'Pompa Interna Hub', liters: 450.50, cost: 0, kmAtRefuel: 145500,
            timestamp: today.setHours(12, 0, 0), createdAt: new Date().toISOString()
        },
        {
            id: 'refuel_2', type: 'refuel', userId, vehicleId: 'mock-vehicle-2', subType: 'adblue',
            stationName: 'Shell Torino Nord', liters: 25, cost: 30.00, kmAtRefuel: 80100,
            timestamp: yesterday.setHours(7, 0, 0), createdAt: new Date().toISOString()
        },

        // -- MAINTENANCE --
        {
            id: 'maint_1', type: 'maintenance', userId, vehicleId: 'mock-vehicle-2', subType: 'tyres',
            description: 'Pneumatici Nuovi (1° Asse)', workshop: 'Gommista Express', notes: 'Sostituzione rapida prima della partenza per la Francia',
            kmAtMaintenance: 80000, timestamp: twoDaysAgo.setHours(16, 0, 0), createdAt: new Date().toISOString()
        }
    ];

    setLocalData('mock_logs', logs);
    
    console.log("Mock DB seeded with demo data.");
};

// --- SECTORS (CRUD) ---

export const getSectors = async (): Promise<Sector[]> => {
    // Mock Mode
    if (!db) {
        const local = getLocalData('mock_sectors');
        if (local.length > 0) return local;

        // Fallback defaults if no seed ran
        return [
            { id: 'def1', name: 'Container', fields: [{ id: 'f1', label: 'Tipo', type: 'select', options: ['20', '40', '40HC'], required: true }] },
            { id: 'def2', name: 'Cisterna', fields: [{ id: 'f1', label: 'Prodotto', type: 'text', required: true }] }
        ];
    }

    try {
        const q = query(collection(db, 'sectors'), orderBy('name'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sector));
    } catch (e) {
        console.error("Error fetching sectors:", e);
        return [];
    }
};

export const addSector = async (sector: Sector) => {
    // Mock Mode
    if (!db) {
        const list = await getSectors();
        const newItem = { ...sector, id: 'sec_' + Date.now() };
        list.push(newItem);
        setLocalData('mock_sectors', list);
        return newItem.id;
    }

    try {
        const docRef = await addDoc(collection(db, 'sectors'), sector);
        return docRef.id;
    } catch (e) {
        console.error("Error adding sector:", e);
        throw e;
    }
};

export const updateSector = async (id: string, data: Partial<Sector>) => {
    // Mock Mode
    if (!db) {
        let list = await getSectors();
        list = list.map(s => s.id === id ? { ...s, ...data } : s);
        setLocalData('mock_sectors', list);
        return;
    }

    try {
        const docRef = doc(db, 'sectors', id);
        await updateDoc(docRef, data);
    } catch (e) {
        console.error("Error updating sector:", e);
        throw e;
    }
};

export const deleteSector = async (id: string) => {
    // Mock Mode
    if (!db) {
        let list = await getSectors();
        list = list.filter(s => s.id !== id);
        setLocalData('mock_sectors', list);
        return;
    }

    try {
        await deleteDoc(doc(db, 'sectors', id));
    } catch (e) {
        console.error("Error deleting sector:", e);
        throw e;
    }
};

// --- USER MANAGEMENT ---

export const syncUserProfile = async (uid: string, email: string | null, displayName: string | null): Promise<UserProfile> => {
    const initialProfile: UserProfile = {
        uid,
        email,
        displayName,
        role: 'driver',
        status: 'pending',
        assignedVehicleId: '',
        assignedSector: 'Container'
    };

    if (!db) {
        const users = getLocalData('mock_users');
        const existing = users.find((u: UserProfile) => u.uid === uid);
        if (existing) return existing;
        
        // Auto-activate first user in mock mode as master if list is empty
        if (users.length === 0) {
             initialProfile.role = 'master';
             initialProfile.status = 'active';
        }
        
        users.push(initialProfile);
        setLocalData('mock_users', users);
        return initialProfile;
    }

    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        return userSnap.data() as UserProfile;
    } else {
        await setDoc(userRef, initialProfile);
        return initialProfile;
    }
};

export const getUsers = async (): Promise<UserProfile[]> => {
    if (!db) return getLocalData('mock_users');
    const q = query(collection(db, 'users'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as UserProfile);
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>) => {
    if (!db) {
        let users = getLocalData('mock_users');
        users = users.map((u: UserProfile) => u.uid === uid ? { ...u, ...data } : u);
        setLocalData('mock_users', users);
        return;
    }
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, data);
};

export const deleteUserProfile = async (uid: string) => {
    if (!db) {
        let users = getLocalData('mock_users');
        users = users.filter((u: UserProfile) => u.uid !== uid);
        setLocalData('mock_users', users);
        return;
    }
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
    if (!db) {
        const list = getLocalData('mock_vehicles');
        const newItem = { ...vehicle, id: 'v_' + Date.now() };
        list.push(newItem);
        setLocalData('mock_vehicles', list);
        return newItem.id;
    }
    const docRef = await addDoc(collection(db, 'vehicles'), vehicle);
    return docRef.id;
};

export const updateVehicle = async (id: string, data: Partial<Vehicle>) => {
    if (!db) {
        let list = getLocalData('mock_vehicles');
        list = list.map((v: Vehicle) => v.id === id ? { ...v, ...data } : v);
        setLocalData('mock_vehicles', list);
        return;
    }
    await updateDoc(doc(db, 'vehicles', id), data);
};

export const deleteVehicle = async (id: string) => {
    if (!db) {
        let list = getLocalData('mock_vehicles');
        list = list.filter((v: Vehicle) => v.id !== id);
        setLocalData('mock_vehicles', list);
        return;
    }
    await deleteDoc(doc(db, 'vehicles', id));
};

export const batchImportVehicles = async (vehicles: Vehicle[]) => {
    if (!db) {
        const list = getLocalData('mock_vehicles');
        vehicles.forEach(v => {
            const exists = list.find((ex: Vehicle) => ex.id === v.id || ex.plate === v.plate);
            if (!exists) list.push(v);
        });
        setLocalData('mock_vehicles', list);
        return;
    }
    const batch = writeBatch(db);
    vehicles.forEach(v => {
        const ref = v.id ? doc(db, 'vehicles', v.id) : doc(collection(db, 'vehicles'));
        batch.set(ref, v); 
    });
    await batch.commit();
};

// --- WORKSHOPS ---

export const getWorkshops = async (): Promise<Workshop[]> => {
    if (!db) return getLocalData('mock_workshops');
    const q = query(collection(db, 'workshops'), orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workshop));
};

export const addWorkshop = async (workshop: Workshop) => {
    if (!db) {
        const list = getLocalData('mock_workshops');
        const newItem = { ...workshop, id: 'w_' + Date.now() };
        list.push(newItem);
        setLocalData('mock_workshops', list);
        return;
    }
    await addDoc(collection(db, 'workshops'), workshop);
};

export const deleteWorkshop = async (id: string) => {
    if (!db) {
        let list = getLocalData('mock_workshops');
        list = list.filter((w: Workshop) => w.id !== id);
        setLocalData('mock_workshops', list);
        return;
    }
    await deleteDoc(doc(db, 'workshops', id));
};

// --- FUEL STATIONS ---

export const getFuelStations = async (): Promise<FuelStation[]> => {
    if (!db) return getLocalData('mock_fuel_stations');
    const q = query(collection(db, 'fuel_stations'), orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FuelStation));
};

export const addFuelStation = async (station: FuelStation) => {
    if (!db) {
        const list = getLocalData('mock_fuel_stations');
        const newItem = { ...station, id: 'fs_' + Date.now() };
        list.push(newItem);
        setLocalData('mock_fuel_stations', list);
        return;
    }
    await addDoc(collection(db, 'fuel_stations'), station);
};

export const deleteFuelStation = async (id: string) => {
    if (!db) {
        let list = getLocalData('mock_fuel_stations');
        list = list.filter((s: FuelStation) => s.id !== id);
        setLocalData('mock_fuel_stations', list);
        return;
    }
    await deleteDoc(doc(db, 'fuel_stations', id));
};

// --- LOGS (Trips, Refuels, Maintenance) ---

export const addLog = async (collectionName: string, data: any) => {
    if (!db) {
        const list = getLocalData('mock_logs');
        const newItem = { ...data, id: 'log_' + Date.now(), createdAt: new Date().toISOString() };
        list.unshift(newItem); 
        setLocalData('mock_logs', list);
        return { id: newItem.id };
    }
    const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: new Date().toISOString()
    });
    return docRef;
};

export const updateLog = async (collectionName: string, id: string, data: any) => {
    if (!db) {
        let list = getLocalData('mock_logs');
        list = list.map((l: any) => l.id === id ? { ...l, ...data } : l);
        setLocalData('mock_logs', list);
        return;
    }
    await updateDoc(doc(db, collectionName, id), data);
};

export const deleteLog = async (collectionName: string, id: string) => {
    if (!db) {
        let list = getLocalData('mock_logs');
        list = list.filter((l: any) => l.id !== id);
        setLocalData('mock_logs', list);
        return;
    }
    await deleteDoc(doc(db, collectionName, id));
};

export const getLogs = async (userId: string, type?: LogType, limitCount: number = 50): Promise<AnyLog[]> => {
    if (!db) {
        let list = getLocalData('mock_logs');
        list = list.filter((l: AnyLog) => l.userId === userId);
        if (type) list = list.filter((l: AnyLog) => l.type === type);
        return list.sort((a: AnyLog, b: AnyLog) => b.timestamp - a.timestamp).slice(0, limitCount);
    }
    
    let q = query(collection(db, 'logs'), where('userId', '==', userId));
    if (type) {
        q = query(q, where('type', '==', type));
    }
    q = query(q, orderBy('timestamp', 'desc'), limit(limitCount));
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AnyLog));
};

export const getAllLogs = async (): Promise<AnyLog[]> => {
    if (!db) return getLocalData('mock_logs').sort((a: AnyLog, b: AnyLog) => b.timestamp - a.timestamp);
    const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(200));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AnyLog));
};

// --- MONTHLY STATS ---

export const saveMonthlyStats = async (stats: MonthlyStats) => {
    const id = stats.id || `${stats.userId}_${stats.vehicleId}_${stats.monthKey}`;
    const dataToSave = { ...stats, id };
    
    if (!db) {
        let list = getLocalData('mock_stats');
        const idx = list.findIndex((s: MonthlyStats) => s.id === id);
        if (idx >= 0) list[idx] = dataToSave;
        else list.push(dataToSave);
        setLocalData('mock_stats', list);
        return;
    }

    const docRef = doc(db, 'monthly_stats', id);
    await setDoc(docRef, dataToSave);
};

export const getUserMonthlyStats = async (userId: string, monthKey: string): Promise<MonthlyStats[]> => {
    if (!db) {
        const list = getLocalData('mock_stats');
        return list.filter((s: MonthlyStats) => s.userId === userId && s.monthKey === monthKey);
    }
    const q = query(collection(db, 'monthly_stats'), where('userId', '==', userId), where('monthKey', '==', monthKey));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as MonthlyStats);
};

export const getMonthlyStats = async (userId: string, vehicleId: string, monthKey: string): Promise<MonthlyStats | null> => {
    if (!db) {
        const list = getLocalData('mock_stats');
        return list.find((s: MonthlyStats) => s.userId === userId && s.vehicleId === vehicleId && s.monthKey === monthKey) || null;
    }
    const id = `${userId}_${vehicleId}_${monthKey}`;
    const docRef = doc(db, 'monthly_stats', id);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() as MonthlyStats : null;
};

export const getPreviousMonthStats = async (userId: string, vehicleId: string, currentMonthKey: string): Promise<MonthlyStats | null> => {
    const [y, m] = currentMonthKey.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevKey = prevDate.toISOString().slice(0, 7);
    return getMonthlyStats(userId, vehicleId, prevKey);
};

export const getDriverMonthTotal = async (userId: string, monthKey: string): Promise<number> => {
    const stats = await getUserMonthlyStats(userId, monthKey);
    return stats.reduce((acc, curr) => {
        if (curr.initialKm && curr.finalKm && curr.finalKm >= curr.initialKm) {
            return acc + (curr.finalKm - curr.initialKm);
        }
        return acc;
    }, 0);
};

export const resetDatabase = () => {
    localStorage.clear();
    window.location.reload();
};