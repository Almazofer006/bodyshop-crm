'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { CheckCircle2, Circle, ClipboardList, Plus, Trash2 } from 'lucide-react'
import { usePermissions } from '@/lib/permissions-context'
import type { VehicleService, Service, Profile } from '@/lib/types'

interface ServiceChecklistProps {
  vehicleId: string
  vehicleServices: VehicleService[]
  allServices: Service[]
  profile: Profile
}

export function ServiceChecklist({
  vehicleId,
  vehicleServices: initial,
  allServices,
  profile,
}: ServiceChecklistProps) {
  const [items, setItems] = useState(initial)
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [customName, setCustomName] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)

  const perms = usePermissions()
  const canManage = perms.can_manage_services
  const canComplete = perms.can_complete_services

  const completed = items.filter(i => i.completed).length
  const total = items.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  const handleToggle = async (item: VehicleService) => {
    if (!canComplete) return
    const supabase = createClient()
    const newVal = !item.completed

    setItems(prev => prev.map(i =>
      i.id === item.id
        ? { ...i, completed: newVal, completed_at: newVal ? new Date().toISOString() : null }
        : i
    ))

    const { error } = await supabase
      .from('vehicle_services')
      .update({
        completed: newVal,
        completed_at: newVal ? new Date().toISOString() : null,
        completed_by: newVal ? profile.id : null,
      })
      .eq('id', item.id)

    if (error) {
      toast.error('Ошибка обновления')
      setItems(prev => prev.map(i => i.id === item.id ? item : i))
    }
  }

  const handleAdd = async () => {
    const name = customName.trim() || allServices.find(s => s.id === Number(selectedServiceId))?.name
    if (!name && !selectedServiceId) return
    setLoading(true)

    const supabase = createClient()
    const { data, error } = await supabase
      .from('vehicle_services')
      .insert({
        vehicle_id: vehicleId,
        service_id: selectedServiceId ? Number(selectedServiceId) : null,
        custom_name: customName.trim() || null,
        created_by: profile.id,
      })
      .select('*, service:services(id, name, order_index)')
      .single()

    if (error) {
      toast.error('Ошибка добавления услуги')
    } else {
      setItems(prev => [...prev, data as VehicleService])
      toast.success('Услуга добавлена')
    }

    setSelectedServiceId('')
    setCustomName('')
    setShowAdd(false)
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    setItems(prev => prev.filter(i => i.id !== id))
    await supabase.from('vehicle_services').delete().eq('id', id)
    toast.success('Услуга удалена')
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Список работ
            {total > 0 && (
              <Badge variant={pct === 100 ? 'default' : 'secondary'} className="ml-1">
                {completed}/{total}
              </Badge>
            )}
          </CardTitle>
          {canManage && (
            <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => setShowAdd(!showAdd)}>
              <Plus className="h-3 w-3" />
              Добавить
            </Button>
          )}
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Прогресс</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-2">
        {/* Add form */}
        {showAdd && canManage && (
          <div className="flex gap-2 p-3 bg-gray-50 rounded-lg border mb-3">
            <Select value={selectedServiceId} onValueChange={(v) => { if (v) { setSelectedServiceId(v); setCustomName('') } }}>
              <SelectTrigger className="flex-1 h-8 text-sm">
                <SelectValue placeholder="Из справочника..." />
              </SelectTrigger>
              <SelectContent>
                {allServices.map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-gray-400 self-center">или</span>
            <Input
              placeholder="Своя услуга..."
              value={customName}
              onChange={(e) => { setCustomName(e.target.value); setSelectedServiceId('') }}
              className="flex-1 h-8 text-sm"
            />
            <Button size="sm" className="h-8" onClick={handleAdd} disabled={loading || (!selectedServiceId && !customName.trim())}>
              ОК
            </Button>
          </div>
        )}

        {/* Checklist items */}
        {items.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Работы не добавлены</p>
        ) : (
          items.map((item) => {
            const name = item.custom_name || item.service?.name || '—'
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                  item.completed
                    ? 'bg-blue-50 border-blue-100'
                    : 'bg-white border-gray-100 hover:bg-gray-50'
                }`}
              >
                <button
                  onClick={() => handleToggle(item)}
                  disabled={!canComplete}
                  className="shrink-0 focus:outline-none"
                >
                  {item.completed
                    ? <CheckCircle2 className="h-5 w-5 text-blue-600" />
                    : <Circle className="h-5 w-5 text-gray-300" />
                  }
                </button>
                <span className={`flex-1 text-sm ${item.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                  {name}
                </span>
                {item.completed && item.completed_at && (
                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(item.completed_at).toLocaleDateString('ru-RU')}
                  </span>
                )}
                {canManage && (
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="shrink-0 text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
