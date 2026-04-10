import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/navbar'
import { PermissionsProvider, defaultPermissions } from '@/lib/permissions-context'
import type { Profile, RolePermissions } from '@/lib/types'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Запрашиваем профиль и idle-сессию параллельно
  const [{ data: profile }, { data: activeIdleSession }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('idle_sessions').select('*').eq('user_id', user.id).is('ended_at', null).maybeSingle(),
  ])

  if (!profile) redirect('/auth/login')

  // Теперь запрашиваем права (зависит от profile.role)
  const { data: permsData } = await supabase
    .from('role_permissions')
    .select('*')
    .eq('role', profile.role)
    .maybeSingle()

  const permissions: RolePermissions = permsData
    ? (permsData as RolePermissions)
    : { ...defaultPermissions, role: profile.role }

  return (
    <PermissionsProvider permissions={permissions}>
      <div className="min-h-screen flex flex-col">
        <Navbar profile={profile as Profile} activeIdleSession={activeIdleSession ?? null} />
        <main className="flex-1 p-3 sm:p-4 max-w-screen-2xl mx-auto w-full">
          {children}
        </main>
      </div>
    </PermissionsProvider>
  )
}
