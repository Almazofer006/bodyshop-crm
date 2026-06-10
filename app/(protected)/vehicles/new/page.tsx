'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { ArrowLeft, Upload, X, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function NewVehiclePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    plate: '',
    make: '',
    model: '',
    owner_name: '',
    owner_phone: '',
    notes: '',
    due_date: '',
  })

  const handlePhotosSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const newFiles = Array.from(files)
    setPhotos(prev => [...prev, ...newFiles])
    setPreviews(prev => [...prev, ...newFiles.map(f => URL.createObjectURL(f))])
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(previews[index])
    setPhotos(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }

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

    // Upload photos
    if (photos.length > 0) {
      let uploaded = 0
      for (const file of photos) {
        const ext = file.name.split('.').pop()
        const path = `${vehicle.id}/${Date.now()}-${uploaded}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('vehicle-photos')
          .upload(path, file)
        if (uploadError) continue
        const { data: urlData } = supabase.storage
          .from('vehicle-photos')
          .getPublicUrl(path)
        await supabase.from('vehicle_photos').insert({
          vehicle_id: vehicle.id,
          url: urlData.publicUrl,
          uploaded_by: user.id,
        })
        uploaded++
      }
      if (uploaded > 0) toast.success(`Загружено фото: ${uploaded}`)
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

            <div className="space-y-2">
              <Label>Фото при приёмке</Label>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotosSelected}
              />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Выбрать фото
              </button>
              {previews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {previews.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {photos.length > 0 ? 'Сохранение и загрузка фото...' : 'Сохранение...'}
                </span>
              ) : (
                `Добавить автомобиль${photos.length > 0 ? ` (+ ${photos.length} фото)` : ''}`
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
