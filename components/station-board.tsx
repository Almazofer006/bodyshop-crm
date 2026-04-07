'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { createClient } from '@/lib/supabase/client'
import { DraggableVehicleCard } from '@/components/draggable-vehicle-card'
import { DroppableStation } from '@/components/droppable-station'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { IdleController } from '@/components/idle-controller'
import type { Stage, Profile, Vehicle, Station } from '@/lib/types'

const STAGE_COLORS: Record<string, string> = {
  'Парковка': 'bg-white border-gray-200',
  'Жестяные работы': 'bg-white border-gray-200',
  'Арматурные работы': 'bg-white border-gray-200',
  'Зона подготовки': 'bg-white border-gray-200',
  'Зона ПДР': 'bg-white border-gray-200',
  'Зона Покраска': 'bg-white border-gray-200',
  'Зона Детейлинга': 'bg-white border-gray-200',
  'Зона Мойки': 'bg-white border-gray-200',
  'Зона Бронепленки': 'bg-white border-gray-200',
}

const STAGE_HEADER_COLORS: Record<string, string> = {
  'Парковка': 'bg-gray-950 text-white',
  'Жестяные работы': 'bg-gray-950 text-white',
  'Арматурные работы': 'bg-gray-950 text-white',
  'Зона подготовки': 'bg-gray-950 text-white',
  'Зона ПДР': 'bg-gray-950 text-white',
  'Зона Покраска': 'bg-gray-950 text-white',
  'Зона Детейлинга': 'bg-gray-950 text-white',
  'Зона Мойки': 'bg-gray-950 text-white',
  'Зона Бронепленки': 'bg-gray-950 text-white',
}

interface StationBoardProps {
  stages: Stage[]
  profile: Profile
}

export function StationBoard({ stages: initialStages, profile }: StationBoardProps) {
  const [stages, setStages] = useState(initialStages)
  const [activeVehicle, setActiveVehicle] = useState<Vehicle | null>(null)
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({})

  const toggleCollapse = (id: number) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))

  const canDrag = profile.role === 'admin' || profile.role === 'manager'

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const refetch = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('stages')
      .select('*, stations (*, vehicles (id, plate, make, model, owner_name, status, created_at, current_station_id, due_date))')
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

  const allStations = stages.flatMap(s => s.stations || [])

  const findVehicleById = (id: string): Vehicle | null => {
    for (const stage of stages) {
      for (const station of stage.stations || []) {
        const v = (station.vehicles || []).find((v) => v.id === id)
        if (v) return v as Vehicle
      }
    }
    return null
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveVehicle(findVehicleById(String(event.active.id)))
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveVehicle(null)
    const { active, over } = event
    if (!over) return

    const vehicleId = String(active.id)
    const targetStationId = Number(over.id)
    const vehicle = findVehicleById(vehicleId)

    if (!vehicle || vehicle.current_station_id === targetStationId) return

    // Optimistic UI update
    setStages((prev) =>
      prev.map((stage) => ({
        ...stage,
        stations: (stage.stations || []).map((station) => {
          if (station.id === vehicle.current_station_id) {
            return { ...station, vehicles: (station.vehicles || []).filter((v) => v.id !== vehicleId) }
          }
          if (station.id === targetStationId) {
            return { ...station, vehicles: [...(station.vehicles || []), { ...vehicle, current_station_id: targetStationId }] }
          }
          return station
        }),
      }))
    )

    const supabase = createClient()

    if (vehicle.current_station_id) {
      await supabase
        .from('vehicle_history')
        .update({ ended_at: new Date().toISOString() })
        .eq('vehicle_id', vehicleId)
        .is('ended_at', null)
    }

    const { error } = await supabase
      .from('vehicles')
      .update({ current_station_id: targetStationId })
      .eq('id', vehicleId)

    if (error) {
      toast.error('Ошибка при перемещении')
      refetch()
      return
    }

    await supabase.from('vehicle_history').insert({
      vehicle_id: vehicleId,
      station_id: targetStationId,
      moved_by: profile.id,
    })

    const targetStation = allStations.find(s => s.id === targetStationId)
    toast.success(`${vehicle.plate} → ${targetStation?.name}`)
  }

  const totalActive = stages.flatMap(s => s.stations || []).flatMap(st => st.vehicles || []).length

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              Активных авто: {totalActive}
            </Badge>
            {canDrag && (
              <span className="text-xs text-gray-400 hidden sm:block">Перетащите карточку для перемещения авто</span>
            )}
          </div>
          <IdleController userId={profile.id} variant="light" />
        </div>
        <div className="space-y-6">
          {stages.map((stage) => {
            const stageVehicles = (stage.stations || []).flatMap(s => s.vehicles || [])
            const bgColor = STAGE_COLORS[stage.name] || 'bg-gray-50 border-gray-200'
            const headerColor = STAGE_HEADER_COLORS[stage.name] || 'bg-gray-200 text-gray-800'

            return (
              <div key={stage.id} className={`border-2 rounded-xl overflow-hidden ${bgColor}`}>
                <button onClick={() => toggleCollapse(stage.id)} className={`w-full px-4 py-3 flex items-center justify-between ${headerColor} transition-opacity hover:opacity-90`}>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-base">{stage.name}</h2>
                    <span className="text-xs opacity-60 md:hidden">{collapsed[stage.id] ? "▶" : "▼"}</span>
                  </div>
                  <Badge variant="outline" className="bg-white/50 text-current border-current/30">
                    {stageVehicles.length} авто
                  </Badge>
                </button>
                {!collapsed[stage.id] && (
                <div className="p-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {(stage.stations || []).map((station) => (
                      <DroppableStation
                        key={station.id}
                        station={station as Station}
                        canDrop={canDrag}
                      >
                        {(station.vehicles || []).length === 0 ? (
                          <p className="text-xs text-gray-400 text-center pt-4">Свободно</p>
                        ) : (
                          (station.vehicles || []).map((vehicle) => (
                            <DraggableVehicleCard
                              key={vehicle.id}
                              vehicle={vehicle as Vehicle}
                              profile={profile}
                              stations={allStations}
                              onMoved={refetch}
                              isDragging={activeVehicle?.id === vehicle.id}
                            />
                          ))
                        )}
                      </DroppableStation>
                    ))}
                  </div>
                </div>
              )}
              </div>
            )
          })}
        </div>
      </div>

      <DragOverlay>
        {activeVehicle && (
          <div className="bg-white border-2 border-blue-400 rounded-lg p-2.5 shadow-xl opacity-90 rotate-2 w-48">
            <p className="font-bold text-sm text-gray-900">{activeVehicle.plate}</p>
            <p className="text-xs text-gray-500">{activeVehicle.make} {activeVehicle.model}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
