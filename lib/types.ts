export type Role = 'admin' | 'manager' | 'master' | 'client'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: Role
  zone: string | null
  created_at: string
}

export interface Stage {
  id: number
  name: string
  order_index: number
  stations?: Station[]
}

export interface Station {
  id: number
  stage_id: number
  name: string
  order_index: number
  vehicles?: Vehicle[]
}

export interface Vehicle {
  id: string
  plate: string
  make: string
  model: string
  owner_name: string
  owner_phone: string | null
  status: 'active' | 'completed' | 'cancelled'
  current_station_id: number | null
  notes: string | null
  created_at: string
  created_by: string
  station?: Station
  photos?: VehiclePhoto[]
}

export interface VehicleHistory {
  id: string
  vehicle_id: string
  station_id: number
  started_at: string
  ended_at: string | null
  moved_by: string
  notes: string | null
  station?: Station
  mover?: Profile
}

export interface VehiclePhoto {
  id: string
  vehicle_id: string
  url: string
  uploaded_at: string
  uploaded_by: string
}

export interface Service {
  id: number
  name: string
  order_index: number
}

export interface VehicleService {
  id: string
  vehicle_id: string
  service_id: number | null
  custom_name: string | null
  completed: boolean
  completed_at: string | null
  completed_by: string | null
  created_at: string
  service?: Service
  completer?: Profile
}
