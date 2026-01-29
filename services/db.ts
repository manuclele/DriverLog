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
import { TripLog, RefuelLog, AnyLog, MonthlyStats, LogType, UserProfile, Vehicle, Workshop, FuelStation } from '../types';

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

    // 1. Mock Vehicles (Ensure they exist)
    const vehicles: Vehicle[] = [
        { id: 'mock-vehicle-1', plate: 'AB 123 CD', code: 'TR-01', type: 'tractor' }, // Assigned
        { id: 'mock-vehicle-2', plate: 'XY 987 ZW', code: 'TR-02', type: 'tractor' }, // Secondary
        { id: 'mock-vehicle-3', plate: 'RIM-001', code: 'SR-01', type: 'trailer', subType: 'container' }
    ];
    setLocalData('mock_vehicles', vehicles);

    // 2. Mock Fuel Stations (NEW)
    const stations: FuelStation[] = [
        { id: 'fs1', name: "Pompa Interna Hub", isPartner: true },
        { id: 'fs2', name: "DKV Station Convenzionata", isPartner: true },
        { id: 'fs3', name: "Eni Route Card", isPartner: true },
        { id: 'fs4', name: "Distributore Generico", isPartner: false }
    ];
    setLocalData('mock_fuel_stations', stations);

    // 3. Mock Stats (Multi-Vehicle)
    // Vehicle 1 (Assigned): High mileage
    // Vehicle 2 (Secondary): Low mileage
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

    // 4. Mock Logs (Trips, Refuel, Maintenance)
    const logs: AnyLog[] = [
        // -- TRIPS --
        // Today: Vehicle 1 (Assigned) - Container
        {
            id: 'trip_1', type: 'trip', userId, vehicleId: 'mock-vehicle-1',
            date: todayStr, bollaNumber: '2024/A001', sector: 'Container',
            departure: 'Milano Hub', destination: 'Genova Porto', details: 'Consegna Standard',
            timestamp: today.setHours(8, 0, 0), createdAt: new Date().toISOString()
        },
        {
            id: 'trip_2', type: 'trip', userId, vehicleId: 'mock-vehicle-1',
            date: todayStr, bollaNumber: '2024/A002', sector: 'Container',
            departure: 'Genova Porto', destination: 'Piacenza Logistica', details: 'Ritiro Merce',
            timestamp: today.setHours(14, 0, 0), createdAt: new Date().toISOString()
        },
        
        // Yesterday: Vehicle 2 (Secondary - Yellow highlight in UI) - Centina
        {
            id: 'trip_3', type: 'trip', userId, vehicleId: 'mock-vehicle-2',
            date: yesterdayStr, bollaNumber: '2024/B999', sector: 'Centina',
            departure: 'Torino Interporto', destination: 'Lione (FR)', details: 'Urgente / Espresso',
            timestamp: yesterday.setHours(6, 30, 0), createdAt: new Date().toISOString()
        },

        // Two Days Ago: Vehicle 1 - Cisterna
        {
            id: 'trip_4', type: 'trip', userId, vehicleId: 'mock-vehicle-1',
            date: twoDaysAgoStr, bollaNumber: 'CH-2024-X', sector: 'Cisterna',
            departure: 'Verona', destination: 'Brennero', details: 'Standard',
            timestamp: twoDaysAgo.setHours(10, 0, 0), createdAt: new Date().toISOString()
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

// Get stats for a specific User on a specific Vehicle for a specific Month
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

// NEW: Get ALL monthly stats for a user (across all vehicles) for a month
export const getUserMonthlyStats = async (userId: string, monthKey: string): Promise<MonthlyStats[]> => {
    // Mock Mode
    if (!db) {
        const allStats = getLocalData('mock_stats');
        return allStats.filter((s: any) => s.userId === userId && s.monthKey === monthKey);
    }

    try {
        const q = query(
            collection(db, 'monthlyStats'),
            where('userId', '==', userId),
            where('monthKey', '==', monthKey)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MonthlyStats));
    } catch (e) {
        console.error("Error fetching user monthly stats:", e);
        return [];
    }
};

// Helper to auto-fill initial Km from previous month
export const getPreviousMonthStats = async (userId: string, vehicleId: string, currentMonthKey: string): Promise<MonthlyStats | null> => {
    // Calculate previous month key (e.g., "2024-02" -> "2024-01")
    const date = new Date(currentMonthKey + "-01");
    date.setMonth(date.getMonth() - 1);
    const prevMonthKey = date.toISOString().slice(0, 7);

    return getMonthlyStats(userId, vehicleId, prevMonthKey);
};

// Helper to get TOTAL Km driven by a user across ALL vehicles for a month
export const getDriverMonthTotal = async (userId: string, monthKey: string): Promise<number> => {
    // Mock Mode
    if (!db) {
        const allStats = getLocalData('mock_stats');
        return allStats
            .filter((s: any) => s.userId === userId && s.monthKey === monthKey)
            .reduce((acc: number, curr: any) => {
                if (curr.finalKm && curr.initialKm && curr.finalKm >= curr.initialKm) {
                    return acc + (curr.finalKm - curr.initialKm);
                }
                return acc;
            }, 0);
    }

    try {
        const q = query(
            collection(db, 'monthlyStats'),
            where('userId', '==', userId),
            where('monthKey', '==', monthKey)
        );
        const snapshot = await getDocs(q);
        
        let total = 0;
        snapshot.forEach(doc => {
            const data = doc.data() as MonthlyStats;
            if (data.finalKm && data.initialKm && data.finalKm >= data.initialKm) {
                total += (data.finalKm - data.initialKm);
            }
        });
        return total;
    } catch (e) {
        console.error("Error calculating total driver stats:", e);
        return 0;
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
        const local = getLocalData('mock_vehicles');
        if (local.length > 0) return local;

        return [
            { id: 'mock-vehicle-1', plate: 'AB 123 CD', code: 'TR-01', type: 'tractor' },
            { id: 'mock-vehicle-2', plate: 'XY 987 ZW', code: 'TR-02', type: 'tractor' },
            { id: 'mock-vehicle-3', plate: 'RIM-001', code: 'SR-01', type: 'trailer', subType: 'container' },
            { id: 'mock-vehicle-4', plate: 'RIM-002', code: 'SR-02', type: 'trailer', subType: 'centina' }
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

export const addVehicle = async (vehicle: Vehicle) => {
    // Mock Mode
    if (!db) {
        const list = await getVehicles();
        const newItem = { ...vehicle, id: 'v_' + Date.now() + Math.random().toString(36).substr(2, 5) };
        list.push(newItem);
        setLocalData('mock_vehicles', list);
        return newItem.id;
    }

    try {
        const docRef = await addDoc(collection(db, 'vehicles'), vehicle);
        return docRef.id;
    } catch (e) {
        console.error("Error adding vehicle:", e);
        throw e;
    }
};

export const updateVehicle = async (id: string, data: Partial<Vehicle>) => {
    // Mock Mode
    if (!db) {
        let list = await getVehicles();
        list = list.map(v => v.id === id ? { ...v, ...data } : v);
        setLocalData('mock_vehicles', list);
        return;
    }

    try {
        const docRef = doc(db, 'vehicles', id);
        await updateDoc(docRef, data);
    } catch (e) {
        console.error("Error updating vehicle:", e);
        throw e;
    }
};

export const deleteVehicle = async (id: string) => {
    // Mock Mode
    if (!db) {
        let list = await getVehicles();
        list = list.filter(v => v.id !== id);
        setLocalData('mock_vehicles', list);
        return;
    }

    try {
        await deleteDoc(doc(db, 'vehicles', id));
    } catch (e) {
        console.error("Error deleting vehicle:", e);
        throw e;
    }
};

export const batchImportVehicles = async (vehicles: Vehicle[]) => {
    // Mock Mode
    if (!db) {
        // In Mock mode, we merge, overwriting if ID exists
        let list = await getVehicles();
        
        vehicles.forEach(v => {
            const index = list.findIndex(existing => existing.id === v.id);
            if (index >= 0) {
                list[index] = v; // Update existing
            } else {
                // If ID is provided use it, otherwise generate one
                const newV = { ...v, id: v.id || ('imp_' + Date.now() + Math.random().toString(36).substr(2, 5)) };
                list.push(newV);
            }
        });
        
        setLocalData('mock_vehicles', list);
        return;
    }

    try {
        const batch = writeBatch(db);
        vehicles.forEach(v => {
            // Use existing ID or auto-generate
            const docRef = v.id ? doc(db, 'vehicles', v.id) : doc(collection(db, 'vehicles'));
            
            // Ensure ID is set in the data as well if we are forcing it in the docRef
            const vehicleData = { ...v, id: docRef.id };
            
            batch.set(docRef, vehicleData);
        });
        await batch.commit();
    } catch (e) {
        console.error("Error batch importing vehicles:", e);
        throw e;
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

// --- FUEL STATIONS (DISTRIBUTORI) ---

export const getFuelStations = async (): Promise<FuelStation[]> => {
    // Mock Mode
    if (!db) {
        const local = getLocalData('mock_fuel_stations');
        if (local.length > 0) return local;

        // Default Mock Data
        return [
            { id: 'fs1', name: "Pompa Interna Hub", isPartner: true },
            { id: 'fs2', name: "DKV Station Convenzionata", isPartner: true },
            { id: 'fs3', name: "Eni Route Card", isPartner: true },
            { id: 'fs4', name: "Distributore Generico", isPartner: false }
        ];
    }

    try {
        const q = query(collection(db, 'fuelStations'), orderBy('name'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FuelStation));
    } catch (e) {
        console.error("Error fetching fuel stations:", e);
        return [];
    }
};

export const addFuelStation = async (station: FuelStation) => {
    // Mock Mode
    if (!db) {
        const list = await getFuelStations();
        const newItem = { ...station, id: 'fs_' + Date.now() };
        list.push(newItem);
        setLocalData('mock_fuel_stations', list);
        return newItem.id;
    }

    try {
        const docRef = await addDoc(collection(db, 'fuelStations'), station);
        return docRef.id;
    } catch (e) {
        console.error("Error adding fuel station:", e);
        throw e;
    }
};

export const deleteFuelStation = async (id: string) => {
    // Mock Mode
    if (!db) {
        let list = await getFuelStations();
        list = list.filter(w => w.id !== id);
        setLocalData('mock_fuel_stations', list);
        return;
    }

    try {
        await deleteDoc(doc(db, 'fuelStations', id));
    } catch (e) {
        console.error("Error deleting fuel station:", e);
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
        localStorage.removeItem('mock_fuel_stations');
        console.log("Mock Database Reset Complete");
        return;
    }

    const batch = writeBatch(db);
    // Be careful with this in production!
    console.log("Database Reset not fully implemented for Production DB safety.");
};