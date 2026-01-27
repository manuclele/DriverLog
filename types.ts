export type Role = 'driver' | 'master';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: Role;
  currentVehicleId?: string;
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
  sector: string;
  departure: string;
  destination: string;
  details?: string;
}

export interface RefuelLog extends BaseLog {
  type: 'refuel';
  stationName: string;
  liters: number;
  cost: number;
  kmAtRefuel: number;
  receiptUrl?: string;
}

export interface MaintenanceLog extends BaseLog {
  type: 'maintenance';
  description: string;
  cost?: number;
}

export type AnyLog = TripLog | RefuelLog | MaintenanceLog;