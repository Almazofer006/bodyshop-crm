import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StationBoard } from '@/components/station-board'
import type { Stage, Profile } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch stages with stations and current vehicles
  const { data: stages } = await supabase
    .from('stages')
    .select(`
      *,
      stations (
        *,
        vehicles (
          id, plate, make, model, owner_name, status, created_at, current_station_id
        )
      )
    `)
    .order('order_index')
    .order('order_index', { referencedTable: 'stations' })

  const filteredStages = stages?.map((stage) => ({
    ...stage,
    stations: stage.stations?.map((station: { vehicles: { status: string }[] }) => ({
      ...station,
      vehicles: station.vehicles?.filter((v: { status: string }) => v.status === 'active'),
    })),
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Доска ремонта</h1>
        <p className="text-gray-500 mt-1">Текущее состояние всех автомобилей в работе</p>
      </div>
      <StationBoard
        stages={(filteredStages as Stage[]) || []}
        profile={profile as Profile}
      />
    </div>
  )
}
