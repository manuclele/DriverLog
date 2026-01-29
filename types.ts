export type Role = 'driver' | 'master' | 'owner';

export type SectorType = 'Cisterna' | 'Container' | 'Centina';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: Role;
  assignedVehicleId: string; // The default vehicle for this driver
  assignedSector: SectorType; // The default sector for this driver
}

export interface Vehicle {
  id: string;
  plate: string;
  code: string;
  lastKm: number;
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
  sector: SectorType; // Cisterna, Container, Centina
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
  subType: 'mechanic' | 'tyres'; // Type of maintenance
  description: string; // Selected from dropdown or typed
  workshop: string; // Name of the workshop/mechanic
  notes?: string; // Optional notes
}

export interface MonthlyStats {
  id?: string;
  userId: string;
  vehicleId: string;
  monthKey: string; // Format "YYYY-MM"
  initialKm: number | null;
  finalKm: number | null;
}

export type AnyLog = TripLog | RefuelLog | MaintenanceLog;