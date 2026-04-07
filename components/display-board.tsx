'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Clock, Car, Maximize2, X, MoveRight, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { Stage, Station, Vehicle, Profile } from '@/lib/types'

function formatHours(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)} мин`
  if (hours < 24) return `${hours.toFixed(1)} ч`
  const days = Math.floor(hours / 24)
  const remaining = hours % 24
  return remaining > 0 ? `${days}д ${Math.round(remaining)}ч` : `${days}д`
}

function getTimeColors(hours: number) {
  if (hours <= 4) return { bg: 'bg-green-500/10', border: 'border-green-500/50', text: 'text-green-400', dot: 'bg-green-500', label: 'text-green-300' }
  if (hours <= 24) return { bg: 'bg-blue-500/10', border: 'border-blue-500/50', text: 'text-blue-400', dot: 'bg-blue-500', label: 'text-blue-300' }
  if (hours <= 72) return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/50', text: 'text-yellow-400', dot: 'bg-yellow-500', label: 'text-yellow-300' }
  return { bg: 'bg-red-500/10', border: 'border-red-600/50', text: 'text-red-400', dot: 'bg-red-500', label: 'text-red-300' }
}

interface DisplayBoardProps {
  stages: Stage[]
  profile: Profile
  currentHistory: { vehicle_id: string; started_at: string }[]
}

interface SelectedVehicle {
  vehicle: Vehicle
  station: Station
  hoursOnStation: number
}

export function DisplayBoard({ stages: initialStages, profile, currentHistory: initialHistory }: DisplayBoardProps) {
  const [stages, setStages] = useState(initialStages)
  const [historyMap, setHistoryMap] = useState(() => new Map(initialHistory.map(h => [h.vehicle_id, h.started_at])))
  const [clock, setClock] = useState(new Date())
  const [selected, setSelected] = useState<SelectedVehicle | null>(null)
  const [moveToStation, setMoveToStation] = useState('')
  const [moving, setMoving] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const canManage = profile.role === 'admin' || profile.role === 'manager'
  const canComplete = profile.role === 'admin' || profile.role === 'manager'

  const refetch = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('stages')
      .select('*, stations (*, vehicles (id, plate, make, model, owner_name, status, created_at, current_station_id))')
      .order('order_index')
      .order('order_index', { referencedTable: 'stations' })

    if (data) {
      const filtered = data.map(stage => ({
        ...stage,
        stations: (stage.stations || []).map((station: { vehicles?: { status: string }[] }) => ({
          ...station,
          vehicles: (station.vehicles || []).filter((v: { status: string }) => v.status === 'active'),
        })),
      }))
      setStages(filtered as Stage[])
    }

    const { data: history } = await supabase
      .from('vehicle_history')
      .select('vehicle_id, started_at')
      .is('ended_at', null)
    if (history) setHistoryMap(new Map(history.map(h => [h.vehicle_id, h.started_at])))
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('display-vehicles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => refetch())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [refetch])

  const allStations = stages.flatMap(s => s.stations || [])
  const totalActive = allStations.flatMap(s => s.vehicles || []).length

  const getHours = (vehicleId: string) => {
    const started = historyMap.get(vehicleId)
    if (!started) return 0
    return (Date.now() - new Date(started).getTime()) / 3600000
  }

  const handleVehicleClick = (vehicle: Vehicle, station: Station) => {
    if (!canManage) return
    setSelected({ vehicle, station, hoursOnStation: getHours(vehicle.id) })
    setMoveToStation('')
  }

  const handleMove = async () => {
    if (!selected || !moveToStation) return
    setMoving(true)
    const supabase = createClient()

    if (selected.vehicle.current_station_id) {
      await supabase.from('vehicle_history')
        .update({ ended_at: new Date().toISOString() })
        .eq('vehicle_id', selected.vehicle.id)
        .is('ended_at', null)
    }

    const { error } = await supabase.from('vehicles')
      .update({ current_station_id: Number(moveToStation) })
      .eq('id', selected.vehicle.id)

    if (!error) {
      await supabase.from('vehicle_history').insert({
        vehicle_id: selected.vehicle.id,
        station_id: Number(moveToStation),
        moved_by: profile.id,
      })
      const target = allStations.find(s => s.id === Number(moveToStation))
      toast.success(`${selected.vehicle.plate} → ${target?.name}`)
      setSelected(null)
      refetch()
    } else {
      toast.error('Ошибка при перемещении')
    }
    setMoving(false)
  }

  const handleComplete = async () => {
    if (!selected) return
    setMoving(true)
    const supabase = createClient()

    await supabase.from('vehicle_history')
      .update({ ended_at: new Date().toISOString() })
      .eq('vehicle_id', selected.vehicle.id)
      .is('ended_at', null)

    const { error } = await supabase.from('vehicles')
      .update({ status: 'completed', current_station_id: null })
      .eq('id', selected.vehicle.id)

    if (!error) {
      toast.success(`${selected.vehicle.plate} — ремонт завершён!`)
      setSelected(null)
      refetch()
    } else {
      toast.error('Ошибка')
    }
    setMoving(false)
  }

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const selectedColors = selected ? getTimeColors(selected.hoursOnStation) : null

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Car className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">Кузовной центр</span>
          <div className="bg-blue-600/20 border border-blue-500/30 text-blue-400 text-sm px-3 py-0.5 rounded-full font-medium">
            {totalActive} авто в работе
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="flex items-center gap-2 text-white font-mono text-4xl font-bold tracking-widest leading-none">
              <Clock className="h-5 w-5 text-gray-400 shrink-0" />
              {clock.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <p className="text-gray-500 text-xs capitalize text-right mt-1">
              {clock.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button
            onClick={handleFullscreen}
            title={isFullscreen ? 'Выйти из полного экрана' : 'Полный экран'}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-auto p-3">
        <div className="space-y-3">
          {stages.map(stage => {
            const stageVehicles = (stage.stations || []).flatMap(s => s.vehicles || [])
            return (
              <div key={stage.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                {/* Zone header */}
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800/80">
                  <h2 className="font-bold text-sm uppercase tracking-wider text-gray-300">{stage.name}</h2>
                  <span className="text-xs text-gray-500">{stageVehicles.length > 0 ? `${stageVehicles.length} авто` : 'Свободно'}</span>
                </div>

                {/* Stations grid */}
                <div className="p-2.5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-9 gap-2">
                    {(stage.stations || []).map(station => {
                      const vehicles = station.vehicles || []
                      return (
                        <div key={station.id} className="bg-gray-800/40 rounded-lg border border-gray-700/50 overflow-hidden min-h-[100px]">
                          <div className="px-2.5 py-1.5 border-b border-gray-700/50">
                            <p className="text-xs font-semibold text-gray-400 truncate">{station.name}</p>
                          </div>
                          <div className="p-1.5 space-y-1.5">
                            {vehicles.length === 0 ? (
                              <div className="flex items-center justify-center h-14">
                                <p className="text-xs text-gray-700 font-medium">Свободно</p>
                              </div>
                            ) : (
                              vehicles.map(vehicle => {
                                const hours = getHours(vehicle.id)
                                const colors = getTimeColors(hours)
                                return (
                                  <button
                                    key={vehicle.id}
                                    onClick={() => handleVehicleClick(vehicle as Vehicle, station as Station)}
                                    disabled={!canManage}
                                    className={`w-full text-left p-2 rounded-lg border transition-all ${colors.bg} ${colors.border} ${canManage ? 'hover:brightness-125 cursor-pointer active:scale-95' : 'cursor-default'}`}
                                  >
                                    <p className="font-bold text-sm text-white leading-none tracking-wide">{vehicle.plate}</p>
                                    <p className="text-xs text-gray-400 mt-0.5 truncate">{vehicle.make} {vehicle.model}</p>
                                    <div className="flex items-center gap-1 mt-1.5">
                                      <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${colors.dot}`} />
                                      <span className={`text-xs font-bold ${colors.text}`}>{formatHours(hours)}</span>
                                    </div>
                                  </button>
                                )
                              })
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 px-1">
          <span className="text-xs text-gray-600">Время на посту:</span>
          {[
            { dot: 'bg-green-500', label: 'до 4 часов' },
            { dot: 'bg-blue-500', label: 'до 1 дня' },
            { dot: 'bg-yellow-500', label: 'до 3 дней' },
            { dot: 'bg-red-500', label: 'более 3 дней' },
          ].map(({ dot, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className={`h-2 w-2 rounded-full ${dot}`} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Vehicle management modal */}
      {selected && selectedColors && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className={`px-5 py-4 border-b border-gray-800 ${selectedColors.bg}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-black text-white tracking-wider">{selected.vehicle.plate}</p>
                  <p className="text-gray-300 font-medium">{selected.vehicle.make} {selected.vehicle.model}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{selected.vehicle.owner_name}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white p-1 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <div className={`h-2 w-2 rounded-full ${selectedColors.dot}`} />
                <span className="text-sm text-gray-400">{selected.station.name}</span>
                <span className={`text-sm font-bold ml-auto ${selectedColors.text}`}>
                  {formatHours(selected.hoursOnStation)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-5 space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Переместить на пост</p>
                <Select value={moveToStation} onValueChange={v => v && setMoveToStation(v)}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white h-10">
                    <SelectValue placeholder="Выберите пост..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {stages.map(stage => (
                      <div key={stage.id}>
                        <p className="px-2 pt-2 pb-1 text-xs text-gray-500 font-semibold uppercase">{stage.name}</p>
                        {(stage.stations || [])
                          .filter(s => s.id !== selected.station.id)
                          .map(s => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.name}
                            </SelectItem>
                          ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleMove}
                disabled={!moveToStation || moving}
                className="w-full gap-2 bg-blue-600 hover:bg-blue-700 h-10"
              >
                <MoveRight className="h-4 w-4" />
                {moving ? 'Перемещение...' : 'Переместить'}
              </Button>

              {canComplete && (
                <Button
                  onClick={handleComplete}
                  disabled={moving}
                  variant="outline"
                  className="w-full gap-2 border-green-600/50 text-green-400 hover:bg-green-600/10 hover:border-green-500 h-10"
                >
                  <CheckCircle className="h-4 w-4" />
                  Завершить ремонт
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
