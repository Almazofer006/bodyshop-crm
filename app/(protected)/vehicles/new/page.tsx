'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewVehiclePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    plate: '',
    make: '',
    model: '',
    owner_name: '',
    owner_phone: '',
    notes: '',
    due_date: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get first station (Парковка)
    const { data: parkingStation } = await supabase
      .from('stations')
      .select('id')
      .eq('name', 'Парковка 1')
      .single()

    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .insert({
        plate: form.plate.toUpperCase(),
        make: form.make,
        model: form.model,
        owner_name: form.owner_name,
        owner_phone: form.owner_phone || null,
        notes: form.notes || null,
        due_date: form.due_date || null,
        status: 'active',
        current_station_id: parkingStation?.id || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      toast.error('Ошибка при создании: ' + error.message)
      setLoading(false)
      return
    }

    if (parkingStation && vehicle) {
      await supabase.from('vehicle_history').insert({
        vehicle_id: vehicle.id,
        station_id: parkingStation.id,
        moved_by: user.id,
      })
    }

    toast.success('Автомобиль добавлен в систему')
    router.push(`/vehicles/${vehicle.id}`)
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/vehicles">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Назад
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Добавить автомобиль</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Данные автомобиля</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="plate">Госномер *</Label>
                <Input
                  id="plate" placeholder="А123БВ777"
                  value={form.plate} onChange={set('plate')}
                  required className="uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="make">Марка *</Label>
                <Input id="make" placeholder="Toyota" value={form.make} onChange={set('make')} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Модель *</Label>
                <Input id="model" placeholder="Camry" value={form.model} onChange={set('model')} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_name">ФИО владельца *</Label>
              <Input id="owner_name" placeholder="Иванов Иван Иванович" value={form.owner_name} onChange={set('owner_name')} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner_phone">Телефон</Label>
              <Input id="owner_phone" placeholder="+7 (999) 000-00-00" value={form.owner_phone} onChange={set('owner_phone')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Срок выдачи автомобиля</Label>
              <Input
                id="due_date" type="date"
                value={form.due_date} onChange={set('due_date')}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Описание повреждений / заметки</Label>
              <Textarea
                id="notes" placeholder="Вмятина на переднем крыле, царапины..."
                value={form.notes} onChange={set('notes')} rows={3}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Сохранение...' : 'Добавить автомобиль'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
