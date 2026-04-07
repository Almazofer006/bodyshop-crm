'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Maximize2, ArrowLeft, Clock } from 'lucide-react'

interface Stage { id: number; name: string; order_index: number }
interface Vehicle {
  id: string; plate: string; make: string; model: string
  owner_name: string; created_at: string; status: string
  current_station_id: number | null; notes: string | null; due_date: string | null
}

function getDueInfo(dueDate: string | null) {
  if (!dueDate) return null
  const now = new Date(); now.setHours(0,0,0,0)
  const due = new Date(dueDate)
  const diff = Math.ceil((due.getTime() - now.getTime()) / 86400000)
  const label = due.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
  if (diff < 0) return { label: `${label} ⚠️`, cls: 'bg-red-100 text-red-700 font-bold' }
  if (diff === 0) return { label: `${label} сегодня`, cls: 'bg-orange-100 text-orange-700 font-bold' }
  if (diff === 1) return { label: `${label} завтра`, cls: 'bg-yellow-100 text-yellow-700 font-semibold' }
  return { label, cls: 'text-gray-600' }
}
interface HistoryEntry {
  vehicle_id: string; station_id: number
  started_at: string; ended_at: string | null
  moved_by: string | null
  mover: { full_name: string } | null
}
interface StationRow { id: number; stage_id: number; name: string }

interface LeonidBoardProps {
  stages: Stage[]
  vehicles: Vehicle[]
  history: HistoryEntry[]
  stations: StationRow[]
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function getHours(startedAt: string, endedAt?: string | null) {
  const end = endedAt ? new Date(endedAt) : new Date()
  return (end.getTime() - new Date(startedAt).getTime()) / 3600000
}

export function LeonidBoard({ stages, vehicles, history, stations }: LeonidBoardProps) {
  const [clock, setClock] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const handleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen()
    else document.exitFullscreen()
  }

  // station id → stage id
  const stationToStage = new Map(stations.map(s => [s.id, s.stage_id]))

  // vehicle id → stage id → entries[]
  const vehicleStageMap = new Map<string, Map<number, HistoryEntry[]>>()
  for (const entry of history) {
    const stageId = stationToStage.get(entry.station_id)
    if (!stageId) continue
    if (!vehicleStageMap.has(entry.vehicle_id)) vehicleStageMap.set(entry.vehicle_id, new Map())
    const sm = vehicleStageMap.get(entry.vehicle_id)!
    if (!sm.has(stageId)) sm.set(stageId, [])
    sm.get(stageId)!.push(entry)
  }

  // current_station_id → stage_id
  const stationStageMap = new Map(stations.map(s => [s.id, s.stage_id]))

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-gray-900 border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-white p-1.5 rounded hover:bg-gray-800 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="font-bold text-white text-base">Экран Вариант Леонида</span>
          <span className="bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs px-2.5 py-0.5 rounded-full">
            {vehicles.length} авто в работе
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-white font-mono text-2xl font-bold">
            <Clock className="h-4 w-4 text-gray-400" />
            {clock.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <button onClick={handleFullscreen} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors">
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="border-collapse text-xs w-full" style={{ minWidth: `${300 + stages.length * 110}px` }}>
          <thead className="sticky top-0 z-20">
            <tr>
              <th className="sticky left-0 z-30 bg-gray-800 text-white px-2 py-2 border border-gray-600 text-center w-8">№</th>
              <th className="sticky left-8 z-30 bg-gray-800 text-white px-2 py-2 border border-gray-600 text-left w-24">Гос. номер</th>
              <th className="bg-gray-800 text-white px-2 py-2 border border-gray-600 text-left w-32">Авто</th>
              <th className="bg-gray-800 text-white px-2 py-2 border border-gray-600 text-left w-28">Клиент</th>
              <th className="bg-gray-800 text-white px-2 py-2 border border-gray-600 text-center w-16">Принят</th>
              <th className="bg-gray-800 text-white px-2 py-2 border border-gray-600 text-center w-20">Срок выдачи</th>
              {stages.map(stage => (
                <th
                  key={stage.id}
                  className="bg-blue-900 text-white px-1 py-2 border border-blue-700 text-center font-medium w-28"
                  style={{ fontSize: '10px', lineHeight: '1.2' }}
                >
                  {stage.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vehicles.map((vehicle, idx) => {
              const stageEntries = vehicleStageMap.get(vehicle.id) || new Map()
              const currentStageId = vehicle.current_station_id
                ? stationStageMap.get(vehicle.current_station_id)
                : null

              return (
                <tr
                  key={vehicle.id}
                  className={`hover:brightness-95 transition-all ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  {/* № */}
                  <td className="sticky left-0 z-10 bg-inherit px-1 py-1 border border-gray-200 text-center text-gray-400 font-medium">
                    {idx + 1}
                  </td>
                  {/* Plate */}
                  <td className="sticky left-8 z-10 bg-inherit px-2 py-1 border border-gray-200 font-black text-gray-900 tracking-wide">
                    {vehicle.plate}
                  </td>
                  {/* Car */}
                  <td className="px-2 py-1 border border-gray-200 text-gray-700">
                    {vehicle.make} {vehicle.model}
                  </td>
                  {/* Owner */}
                  <td className="px-2 py-1 border border-gray-200 text-gray-600 truncate max-w-[110px]">
                    {vehicle.owner_name || '—'}
                  </td>
                  {/* Date */}
                  <td className="px-1 py-1 border border-gray-200 text-center text-gray-500">
                    {fmt(vehicle.created_at)}
                  </td>
                  {/* Due date */}
                  <td className="px-1 py-1 border border-gray-200 text-center">
                    {(() => {
                      const info = getDueInfo(vehicle.due_date)
                      if (!info) return <span className="text-gray-300 text-xs">—</span>
                      return <span className={`text-xs px-1 py-0.5 rounded ${info.cls}`}>{info.label}</span>
                    })()}
                  </td>

                  {/* Stage cells */}
                  {stages.map(stage => {
                    const entries = stageEntries.get(stage.id) || []
                    const isCurrent = currentStageId === stage.id

                    if (entries.length === 0) {
                      return (
                        <td key={stage.id} className="px-1 py-1 border border-gray-100 bg-gray-50" />
                      )
                    }

                    const latest = entries[entries.length - 1]
                    const hours = getHours(latest.started_at, latest.ended_at)
                    const done = !isCurrent && latest.ended_at !== null
                    const overdue = isCurrent && hours > 48

                    let bg = ''
                    let textColor = 'text-gray-800'
                    if (overdue) {
                      bg = 'bg-red-100'; textColor = 'text-red-900'
                    } else if (isCurrent) {
                      bg = 'bg-blue-100'; textColor = 'text-blue-900'
                    } else if (done) {
                      bg = 'bg-green-100'; textColor = 'text-green-900'
                    } else {
                      bg = 'bg-yellow-50'; textColor = 'text-yellow-900'
                    }

                    const workerFirst = latest.mover?.full_name?.split(' ').slice(0, 2).join(' ') || ''

                    return (
                      <td key={stage.id} className={`px-1 py-1 border border-gray-200 ${bg}`}>
                        <div className={`text-center leading-tight ${textColor}`}>
                          <p className="font-semibold" style={{ fontSize: '10px' }}>
                            {fmt(latest.started_at)}
                          </p>
                          {latest.ended_at && (
                            <p className="text-gray-500" style={{ fontSize: '9px' }}>
                              → {fmt(latest.ended_at)}
                            </p>
                          )}
                          {workerFirst && (
                            <p className="truncate" style={{ fontSize: '9px', maxWidth: '100px' }}>
                              {workerFirst}
                            </p>
                          )}
                          {isCurrent && (
                            <p className="font-bold mt-0.5" style={{ fontSize: '9px' }}>
                              {hours < 1
                                ? `${Math.round(hours * 60)}мин`
                                : hours < 24
                                  ? `${hours.toFixed(1)}ч`
                                  : `${Math.floor(hours / 24)}д`}
                              {overdue && ' ⚠️'}
                            </p>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}

            {vehicles.length === 0 && (
              <tr>
                <td colSpan={5 + stages.length} className="text-center py-12 text-gray-400 text-sm">
                  Нет активных автомобилей
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 px-4 py-2 bg-white border-t border-gray-200 shrink-0">
        {[
          { bg: 'bg-green-100', label: 'Завершён этап' },
          { bg: 'bg-blue-100', label: 'Сейчас здесь' },
          { bg: 'bg-red-100', label: 'Задержка >48ч' },
          { bg: 'bg-yellow-50', label: 'Промежуточный' },
        ].map(({ bg, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`h-3 w-6 rounded border border-gray-300 ${bg}`} />
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
        <span className="ml-auto text-xs text-gray-400 capitalize">
          {clock.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>
    </div>
  )
}
