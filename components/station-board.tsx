'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { VehicleCard } from '@/components/vehicle-card'
import { Badge } from '@/components/ui/badge'
import type { Stage, Profile, Vehicle } from '@/lib/types'

const STAGE_COLORS: Record<string, string> = {
  'Парковка': 'bg-gray-100 border-gray-300',
  'Жестяные работы': 'bg-orange-50 border-orange-300',
  'Арматурные работы': 'bg-yellow-50 border-yellow-300',
  'Зона подготовки': 'bg-blue-50 border-blue-300',
  'Зона ПДР': 'bg-purple-50 border-purple-300',
  'Зона Покраска': 'bg-red-50 border-red-300',
  'Зона Детейлинга': 'bg-green-50 border-green-300',
  'Зона Мойки': 'bg-cyan-50 border-cyan-300',
  'Зона Бронепленки': 'bg-indigo-50 border-indigo-300',
}

const STAGE_HEADER_COLORS: Record<string, string> = {
  'Парковка': 'bg-gray-200 text-gray-800',
  'Жестяные работы': 'bg-orange-200 text-orange-900',
  'Арматурные работы': 'bg-yellow-200 text-yellow-900',
  'Зона подготовки': 'bg-blue-200 text-blue-900',
  'Зона ПДР': 'bg-purple-200 text-purple-900',
  'Зона Покраска': 'bg-red-200 text-red-900',
  'Зона Детейлинга': 'bg-green-200 text-green-900',
  'Зона Мойки': 'bg-cyan-200 text-cyan-900',
  'Зона Бронепленки': 'bg-indigo-200 text-indigo-900',
}

interface StationBoardProps {
  stages: Stage[]
  profile: Profile
}

export function StationBoard({ stages: initialStages, profile }: StationBoardProps) {
  const [stages, setStages] = useState(initialStages)

  const refetch = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
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

    if (data) {
      const filtered = data.map((stage) => ({
        ...stage,
        stations: stage.stations?.map((station: { vehicles: { status: string }[] }) => ({
          ...station,
          vehicles: station.vehicles?.filter((v: { status: string }) => v.status === 'active'),
        })),
      }))
      setStages(filtered as Stage[])
    }
  }, [])

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('vehicles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => {
        refetch()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [refetch])

  const totalActive = stages.flatMap(s => s.stations || []).flatMap(st => st.vehicles || []).length

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Badge variant="secondary" className="text-sm px-3 py-1">
          Активных авто: {totalActive}
        </Badge>
      </div>
      <div className="space-y-6">
        {stages.map((stage) => {
          const stageVehicles = (stage.stations || []).flatMap(s => s.vehicles || [])
          const bgColor = STAGE_COLORS[stage.name] || 'bg-gray-50 border-gray-200'
          const headerColor = STAGE_HEADER_COLORS[stage.name] || 'bg-gray-200 text-gray-800'

          return (
            <div key={stage.id} className={`border-2 rounded-xl overflow-hidden ${bgColor}`}>
              <div className={`px-4 py-3 flex items-center justify-between ${headerColor}`}>
                <h2 className="font-bold text-base">{stage.name}</h2>
                <Badge variant="outline" className="bg-white/50 text-current border-current/30">
                  {stageVehicles.length} авто
                </Badge>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {(stage.stations || []).map((station) => (
                    <div key={station.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          {station.name}
                        </p>
                      </div>
                      <div className="p-2 space-y-2 min-h-[80px]">
                        {(station.vehicles || []).length === 0 ? (
                          <p className="text-xs text-gray-400 text-center pt-4">Свободно</p>
                        ) : (
                          (station.vehicles || []).map((vehicle) => (
                            <VehicleCard
                              key={vehicle.id}
                              vehicle={vehicle as Vehicle}
                              profile={profile}
                              stations={stages.flatMap(s => s.stations || [])}
                              onMoved={refetch}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
