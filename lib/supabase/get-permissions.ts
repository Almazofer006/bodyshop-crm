import { defaultPermissions } from '@/lib/permissions-context'
import type { RolePermissions } from '@/lib/types'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Получить права доступа для пользователя на стороне сервера.
 * Использовать в server components где нет доступа к usePermissions().
 */
export async function getServerPermissions(
  supabase: SupabaseClient,
  userId: string
): Promise<{ permissions: RolePermissions; role: string } | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (!profile) return null

  const { data: permsData } = await supabase
    .from('role_permissions')
    .select('*')
    .eq('role', profile.role)
    .maybeSingle()

  const permissions: RolePermissions = permsData
    ? (permsData as RolePermissions)
    : { ...defaultPermissions, role: profile.role }

  return { permissions, role: profile.role }
}
