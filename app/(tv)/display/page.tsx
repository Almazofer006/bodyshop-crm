import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DisplayBoard } from '@/components/display-board'
import type { Profile } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function DisplayPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/auth/login')

  const { data: stages } = await supabase
    .from('stages')
    .select('*, stations (*, vehicles (id, plate, make, model, owner_name, status, created_at, current_station_id))')
    .order('order_index')
    .order('order_index', { referencedTable: 'stations' })

  const filtered = (stages || []).map(stage => ({
    ...stage,
    stations: (stage.stations || []).map((station: { vehicles?: { status: string }[] }) => ({
      ...station,
      vehicles: (station.vehicles || []).filter((v: { status: string }) => v.status === 'active'),
    })),
  }))

  const { data: currentHistory } = await supabase
    .from('vehicle_history')
    .select('vehicle_id, started_at')
    .is('ended_at', null)

  return (
    <DisplayBoard
      stages={filtered as Parameters<typeof DisplayBoard>[0]['stages']}
      profile={profile as Profile}
      currentHistory={currentHistory || []}
    />
  )
}
