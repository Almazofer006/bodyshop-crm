'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { MoveRight, CheckCircle, XCircle } from 'lucide-react'
import type { Vehicle, Profile } from '@/lib/types'

interface VehicleActionsProps {
  vehicle: { id: string; status: string; current_station_id: number | null }
  stations: { id: number; name: string; stage?: { name: string } }[]
  profile: Profile
}

export function VehicleActions({ vehicle, stations, profile }: VehicleActionsProps) {
  const router = useRouter()
  const [selectedStation, setSelectedStation] = useState('')
  const [loading, setLoading] = useState(false)

  const handleMove = async () => {
    if (!selectedStation) return
    setLoading(true)
    const supabase = createClient()

    if (vehicle.current_station_id) {
      await supabase
        .from('vehicle_history')
        .update({ ended_at: new Date().toISOString() })
        .eq('vehicle_id', vehicle.id)
        .is('ended_at', null)
    }

    await supabase
      .from('vehicles')
      .update({ current_station_id: parseInt(selectedStation) })
      .eq('id', vehicle.id)

    await supabase.from('vehicle_history').insert({
      vehicle_id: vehicle.id,
      station_id: parseInt(selectedStation),
      moved_by: profile.id,
    })

    toast.success('Автомобиль перемещён')
    setSelectedStation('')
    setLoading(false)
    router.refresh()
  }

  const handleStatusChange = async (status: 'completed' | 'cancelled') => {
    setLoading(true)
    const supabase = createClient()

    if (vehicle.current_station_id) {
      await supabase
        .from('vehicle_history')
        .update({ ended_at: new Date().toISOString() })
        .eq('vehicle_id', vehicle.id)
        .is('ended_at', null)
    }

    await supabase
      .from('vehicles')
      .update({ status, current_station_id: null })
      .eq('id', vehicle.id)

    toast.success(status === 'completed' ? 'Ремонт завершён' : 'Заказ отменён')
    setLoading(false)
    router.refresh()
  }

  if (vehicle.status !== 'active') return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Управление</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Select onValueChange={(v) => v && setSelectedStation(v)} value={selectedStation}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Выберите пост для перемещения" />
            </SelectTrigger>
            <SelectContent>
              {stations
                .filter((s) => s.id !== vehicle.current_station_id)
                .map((station) => (
                  <SelectItem key={station.id} value={String(station.id)}>
                    {station.stage?.name ? `${station.stage.name} → ` : ''}{station.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button onClick={handleMove} disabled={!selectedStation || loading} className="gap-2 shrink-0">
            <MoveRight className="h-4 w-4" />
            Переместить
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2 text-green-700 border-green-200 hover:bg-green-50"
            onClick={() => handleStatusChange('completed')}
            disabled={loading}
          >
            <CheckCircle className="h-4 w-4" />
            Завершить ремонт
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2 text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => handleStatusChange('cancelled')}
            disabled={loading}
          >
            <XCircle className="h-4 w-4" />
            Отменить
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
