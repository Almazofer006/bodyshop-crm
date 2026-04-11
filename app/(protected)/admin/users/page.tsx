import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getServerPermissions } from '@/lib/supabase/get-permissions'
import { InviteUserForm } from '@/components/invite-user-form'
import { UsersTable } from '@/components/users-table'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const result = await getServerPermissions(supabase, user.id)
  if (!result || !result.permissions.see_users) redirect('/dashboard')

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Управление пользователями</h1>
        <p className="text-gray-500 mt-1">Приглашение и настройка прав</p>
      </div>
      <div className="grid gap-6">
        {result.role === 'admin' && <InviteUserForm />}
        <UsersTable users={users || []} />
      </div>
    </div>
  )
}
