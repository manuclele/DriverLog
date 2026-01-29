export type Role = 'driver' | 'master' | 'owner';

export type UserStatus = 'pending' | 'active' | 'suspended';

// REMOVED hardcoded SectorType, now dynamic.
// Kept for backward compatibility if needed, but logic uses string names now.
export type SectorType = string; 

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: Role;
  status: UserStatus; 
  assignedVehicleId: string;
  assignedSector: string; // Changed to string to match dynamic sector names
}

export type VehicleType = 'tractor' | 'trailer'; 
export type TrailerSubType = 'container' | 'centina' | 'cisterna' | null;

export interface Vehicle {
  id: string;
  plate: string;
  code: string;
  type: VehicleType;
  subType?: TrailerSubType; 
  defaultTrailerId?: string; 
}

export interface Workshop {
  id?: string;
  name: string;
  province: string;
}

export interface FuelStation {
  id?: string;
  name: string;
  isPartner: boolean; 
}

// --- DYNAMIC SECTORS ---
export type FieldType = 'text' | 'number' | 'select';

export interface SectorField {
    id: string;
    label: string; // e.g. "Tipo Container" or "Quantità"
    type: FieldType;
    options?: string[]; // Only for 'select' type (e.g. ["20", "40", "40HC"])
    required: boolean;
}

export interface Sector {
    id?: string;
    name: string; // e.g. "Container"
    fields: SectorField[];
}

export type LogType = 'trip' | 'refuel' | 'maintenance';

export interface BaseLog {
  id?: string;
  type: LogType;
  userId: string;
  vehicleId: string;
  timestamp: number; 
  createdAt: string; 
}

export interface TripLog extends BaseLog {
  type: 'trip';
  date: string;
  bollaNumber: string;
  sector: string; // Sector Name
  sectorId?: string; // Reference to Sector Config
  departure: string;
  destination: string;
  customData?: Record<string, string | number>; // Dynamic answers { "Tipo Container": "40HC" }
}

export interface RefuelLog extends BaseLog {
  type: 'refuel';
  subType?: 'diesel' | 'adblue';
  stationName: string;
  liters: number;
  cost: number;
  kmAtRefuel: number;
  receiptUrl?: string;
  receiptData?: string;
}

export interface MaintenanceLog extends BaseLog {
  type: 'maintenance';
  subType: 'mechanic' | 'tyres';
  description: string;
  workshop: string;
  notes?: string;
  kmAtMaintenance?: number; 
}

export interface MonthlyStats {
  id?: string;
  userId: string;
  vehicleId: string;
  monthKey: string;
  initialKm: number | null;
  finalKm: number | null;
}

export type AnyLog = TripLog | RefuelLog | MaintenanceLog;