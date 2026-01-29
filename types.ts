export type Role = 'driver' | 'master' | 'owner';

export type UserStatus = 'pending' | 'active' | 'suspended';

export type SectorType = 'Cisterna' | 'Container' | 'Centina';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: Role;
  status: UserStatus; // New field for approval process
  assignedVehicleId: string;
  assignedSector: SectorType;
}

export type VehicleType = 'tractor' | 'trailer'; // Motrice o Rimorchio
export type TrailerSubType = 'container' | 'centina' | 'cisterna' | null;

export interface Vehicle {
  id: string;
  plate: string;
  code: string;
  type: VehicleType;
  subType?: TrailerSubType; // Only for trailers
  defaultTrailerId?: string; // Only for tractors (Default pairing)
}

export interface Workshop {
  id?: string;
  name: string;
  province: string;
}

export interface FuelStation {
  id?: string;
  name: string;
  isPartner: boolean; // True = Convenzionato (Pagamento differito/Fattura)
}

export type LogType = 'trip' | 'refuel' | 'maintenance';

export interface BaseLog {
  id?: string;
  type: LogType;
  userId: string;
  vehicleId: string;
  timestamp: number; // Unix timestamp
  createdAt: string; // ISO string
}

export interface TripLog extends BaseLog {
  type: 'trip';
  date: string;
  bollaNumber: string;
  sector: SectorType;
  departure: string;
  destination: string;
  details?: string;
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
  kmAtMaintenance?: number; // Optional: Only for tractors
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