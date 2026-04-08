import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PermissionsTable } from '@/components/permissions-table'
import { Shield } from 'lucide-react'
import type { RolePermissions } from '@/lib/types'

export default async function PermissionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  const { data: permissions } = await supabase
    .from('role_permissions')
    .select('*')
    .order('role')

  const roleOrder = ['admin', 'manager', 'master', 'client']
  const sorted = (permissions || []).sort(
    (a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role)
  )

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Настройка прав доступа</h1>
          <p className="text-sm text-gray-500">Управление правами для каждой роли</p>
        </div>
      </div>
      <PermissionsTable initialData={sorted as RolePermissions[]} />
    </div>
  )
}
