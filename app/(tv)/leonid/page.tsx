import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LeonidBoard } from '@/components/leonid-board'

export const dynamic = 'force-dynamic'

export default async function LeonidPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/auth/login')

  const { data: stages } = await supabase
    .from('stages')
    .select('id, name, order_index')
    .order('order_index')

  const { data: stations } = await supabase
    .from('stations')
    .select('id, stage_id, name')

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, plate, make, model, owner_name, created_at, status, current_station_id, notes, due_date')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const vehicleIds = (vehicles || []).map(v => v.id)

  let history: unknown[] = []
  if (vehicleIds.length > 0) {
    const { data } = await supabase
      .from('vehicle_history')
      .select('vehicle_id, station_id, started_at, ended_at, moved_by, mover:profiles(full_name)')
      .in('vehicle_id', vehicleIds)
      .order('started_at')
    history = data || []
  }

  return (
    <LeonidBoard
      stages={stages || []}
      vehicles={vehicles || []}
      history={history as Parameters<typeof LeonidBoard>[0]['history']}
      stations={stations || []}
    />
  )
}
