'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
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
  permissions: initialPermissions,
  children,
}: {
  permissions: RolePermissions
  children: React.ReactNode
}) {
  const [permissions, setPermissions] = useState(initialPermissions)

  const refreshPermissions = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (!profile) return

    const { data: permsData } = await supabase
      .from('role_permissions')
      .select('*')
      .eq('role', profile.role)
      .maybeSingle()

    if (permsData) {
      setPermissions(permsData as RolePermissions)
    } else {
      setPermissions({ ...defaultPermissions, role: profile.role })
    }
  }, [])

  useEffect(() => {
    // Обновляем права когда пользователь возвращается на вкладку
    const handleFocus = () => refreshPermissions()
    window.addEventListener('focus', handleFocus)

    // Также подписываемся на realtime-изменения профилей и прав
    const supabase = createClient()
    const channel = supabase
      .channel('permissions-refresh')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
      }, () => refreshPermissions())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'role_permissions',
      }, () => refreshPermissions())
      .subscribe()

    return () => {
      window.removeEventListener('focus', handleFocus)
      supabase.removeChannel(channel)
    }
  }, [refreshPermissions])

  return (
    <PermissionsContext.Provider value={permissions}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  return useContext(PermissionsContext)
}
