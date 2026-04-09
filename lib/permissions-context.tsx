'use client'

import { createContext, useContext } from 'react'
import type { RolePermissions } from '@/lib/types'

export const defaultPermissions: RolePermissions = {
  role: 'master',
  see_dashboard: true,
  see_tv_mode: true,
  see_leonid: true,
  see_vehicles: false,
  see_stats: false,
  see_idle: false,
  see_users: false,
  see_owner_phone: false,
  see_owner_name: false,
  see_due_date: true,
  can_move_vehicles: false,
  can_add_vehicles: false,
  can_manage_services: false,
  can_complete_services: false,
  can_upload_photos: false,
}

const PermissionsContext = createContext<RolePermissions>(defaultPermissions)

export function PermissionsProvider({
  permissions,
  children,
}: {
  permissions: RolePermissions
  children: React.ReactNode
}) {
  return (
    <PermissionsContext.Provider value={permissions}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  return useContext(PermissionsContext)
}
