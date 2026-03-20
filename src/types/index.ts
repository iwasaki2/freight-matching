// ============================================================
// Enum mirrors
// ============================================================
export type UserRole = 'driver' | 'staff' | 'shipper' | 'admin';
export type VehicleStatus = 'active' | 'inactive' | 'maintenance';
export type SlotStatus = 'open' | 'matched' | 'expired' | 'closed';
export type ShipmentStatus = 'waiting' | 'matched' | 'completed' | 'cancelled';
export type MatchStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
export type NotificationChannel = 'line' | 'sms' | 'email';
export type NotificationStatus = 'sent' | 'failed' | 'pending';

// ============================================================
// Domain types
// ============================================================
export interface User {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  user_id: string;
  plate_number: string;
  vehicle_type: string;
  max_load_kg: number;
  status: VehicleStatus;
  created_at: string;
  updated_at: string;
}

export interface CargoType {
  id: number;
  name: string;
  icon: string | null;
}

export interface Shipper {
  id: string;
  user_id: string | null;
  company: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface AvailableSlot {
  id: string;
  vehicle_id: string;
  driver_id: string;
  prefecture: string;
  available_from: string;
  available_until: string;
  available_load_kg: number;
  status: SlotStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
  // joined
  vehicle?: Vehicle;
  driver?: User;
  cargo_types?: CargoType[];
}

export interface Shipment {
  id: string;
  shipper_id: string;
  cargo_type_id: number;
  prefecture: string;
  pickup_time: string;
  weight_kg: number;
  destination: string;
  status: ShipmentStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
  // joined
  shipper?: Shipper;
  cargo_type?: CargoType;
}

export interface Match {
  id: string;
  slot_id: string;
  shipment_id: string;
  score: number | null;
  status: MatchStatus;
  confirmed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // joined
  slot?: AvailableSlot;
  shipment?: Shipment;
}

export interface Operation {
  id: string;
  match_id: string;
  operator_id: string | null;
  action: string;
  note: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  match_id: string | null;
  channel: NotificationChannel;
  template: string;
  body: string;
  status: NotificationStatus;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Form input types
// ============================================================
export interface SlotFormInput {
  vehicle_id: string;
  driver_id: string;
  prefecture: string;
  available_from: string;
  available_until: string;
  available_load_kg: number;
  cargo_type_ids: number[];
  note?: string;
}

export interface ShipmentFormInput {
  shipper_id: string;
  cargo_type_id: number;
  prefecture: string;
  pickup_time: string;
  weight_kg: number;
  destination: string;
  note?: string;
}
