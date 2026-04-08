'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Car, MoveRight, Clock, CalendarClock } from 'lucide-react'
import { toast } from 'sonner'
import { usePermissions } from '@/lib/permissions-context'
import type { Vehicle, Station, Profile } from '@/lib/types'

interface VehicleCardProps {
  vehicle: Vehicle
  profile: Profile
  stations: Station[]
  onMoved: () => void
}

function getDaysInShop(createdAt: string) {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000)
  return days === 0 ? 'сегодня' : `${days} дн.`
}

function getDueDateInfo(dueDate: string | null) {
  if (!dueDate) return null
  const now = new Date()
  const due = new Date(dueDate)
  const diffDays = Math.ceil((due.getTime() - now.setHours(0,0,0,0)) / 86400000)
  const label = due.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })

  if (diffDays < 0) return { label: `${label} — просрочен!`, color: 'text-red-600', bg: 'bg-red-50' }
  if (diffDays === 0) return { label: `${label} — сегодня!`, color: 'text-orange-600', bg: 'bg-orange-50' }
  if (diffDays === 1) return { label: `${label} — завтра`, color: 'text-yellow-600', bg: 'bg-yellow-50' }
  return { label: `${label} (${diffDays}д)`, color: 'text-gray-500', bg: '' }
}

export function VehicleCard({ vehicle, profile, stations, onMoved }: VehicleCardProps) {
  const [open, setOpen] = useState(false)
  const [selectedStation, setSelectedStation] = useState('')
  const [loading, setLoading] = useState(false)

  const perms = usePermissions()
  const canMove = perms.can_move_vehicles
  const dueInfo = perms.see_due_date ? getDueDateInfo(vehicle.due_date) : null

  const handleMove = async () => {
    if (!selectedStation) return
    setLoading(true)
    const supabase = createClient()

    if (vehicle.current_station_id) {
      await supabase.from('vehicle_history')
        .update({ ended_at: new Date().toISOString() })
        .eq('vehicle_id', vehicle.id)
        .is('ended_at', null)
    }

    const { error } = await supabase.from('vehicles')
      .update({ current_station_id: parseInt(selectedStation) })
      .eq('id', vehicle.id)

    if (error) {
      toast.error('Ошибка при перемещении')
      setLoading(false)
      return
    }

    await supabase.from('vehicle_history').insert({
      vehicle_id: vehicle.id,
      station_id: parseInt(selectedStation),
      moved_by: profile.id,
    })

    toast.success('Автомобиль перемещён')
    setOpen(false)
    setLoading(false)
    onMoved()
  }

  return (
    <>
      <div className="group bg-white border border-gray-200 rounded-lg p-2.5 hover:border-blue-300 hover:shadow-sm transition-all">
        <Link href={`/vehicles/${vehicle.id}`} className="block">
          <div className="flex items-start gap-2">
            <Car className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm text-gray-900 leading-tight">{vehicle.plate}</p>
              <p className="text-xs text-gray-500 truncate">{vehicle.make} {vehicle.model}</p>
              {perms.see_owner_name && (
                <p className="text-xs text-gray-400 truncate">{vehicle.owner_name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 mt-1.5">
            <Clock className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-400">{getDaysInShop(vehicle.created_at)}</span>
          </div>
          {dueInfo && (
            <div className={`flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded ${dueInfo.bg}`}>
              <CalendarClock className={`h-3 w-3 ${dueInfo.color} shrink-0`} />
              <span className={`text-xs font-medium ${dueInfo.color}`}>{dueInfo.label}</span>
            </div>
          )}
        </Link>
        {canMove && (
          <Button
            size="sm" variant="outline"
            className="w-full mt-2 h-7 text-xs gap-1"
            onClick={(e) => { e.preventDefault(); setOpen(true) }}
          >
            <MoveRight className="h-3 w-3" />
            Переместить
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Переместить {vehicle.plate}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-500 mb-3">
              {vehicle.make} {vehicle.model} — {vehicle.owner_name}
            </p>
            <Select onValueChange={(v) => v && setSelectedStation(v)} value={selectedStation}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите пост назначения" />
              </SelectTrigger>
              <SelectContent>
                {stations.filter(s => s.id !== vehicle.current_station_id).map(station => (
                  <SelectItem key={station.id} value={String(station.id)}>{station.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
            <Button onClick={handleMove} disabled={!selectedStation || loading}>
              {loading ? 'Перемещение...' : 'Переместить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
