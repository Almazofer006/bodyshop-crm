import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getServerPermissions } from '@/lib/supabase/get-permissions'
import { IdleReport } from '@/components/idle-report'

export const dynamic = 'force-dynamic'

export default async function IdlePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const result = await getServerPermissions(supabase, user.id)
  if (!result || !result.permissions.see_idle) redirect('/dashboard')

  const since = new Date()
  since.setDate(since.getDate() - 30)

  const [{ data: employees }, { data: sessions }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .in('role', ['admin', 'manager', 'master'])
      .order('full_name'),
    supabase
      .from('idle_sessions')
      .select('id, user_id, started_at, ended_at')
      .gte('started_at', since.toISOString())
      .order('started_at', { ascending: false }),
  ])

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Учёт простоев</h1>
        <p className="text-gray-500 text-sm mt-1">Отчёт за последние 30 дней · рабочее время 10:00–20:00</p>
      </div>
      <IdleReport employees={employees || []} sessions={sessions || []} />
    </div>
  )
}
