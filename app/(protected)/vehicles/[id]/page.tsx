import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Car, Phone, MapPin, Clock, User } from 'lucide-react'
import { VehicleActions } from '@/components/vehicle-actions'
import { PhotoUpload } from '@/components/photo-upload'
import { ServiceChecklist } from '@/components/service-checklist'
import type { Profile } from '@/lib/types'

export const dynamic = 'force-dynamic'

const statusLabel: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  active: { label: 'В работе', variant: 'default' },
  completed: { label: 'Завершён', variant: 'secondary' },
  cancelled: { label: 'Отменён', variant: 'destructive' },
}

export default async function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('*, station:stations(name, stage:stages(name))')
    .eq('id', id)
    .single()

  if (!vehicle) notFound()

  const { data: history } = await supabase
    .from('vehicle_history')
    .select('*, station:stations(name, stage:stages(name)), mover:profiles(full_name, email)')
    .eq('vehicle_id', id)
    .order('started_at', { ascending: false })

  const { data: photos } = await supabase
    .from('vehicle_photos')
    .select('*')
    .eq('vehicle_id', id)
    .order('uploaded_at', { ascending: false })

  const { data: stations } = await supabase
    .from('stations')
    .select('*, stage:stages(name)')
    .order('order_index')

  const { data: vehicleServices } = await supabase
    .from('vehicle_services')
    .select('*, service:services(id, name, order_index)')
    .eq('vehicle_id', id)
    .order('created_at')

  const { data: allServices } = await supabase
    .from('services')
    .select('*')
    .order('order_index')

  const s = statusLabel[vehicle.status] || statusLabel.active

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/vehicles">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Назад
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{vehicle.plate}</h1>
          <Badge variant={s.variant}>{s.label}</Badge>
        </div>
      </div>

      <div className="grid gap-4">
        {/* Vehicle info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="h-4 w-4" />
              Информация об автомобиле
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Марка / Модель</p>
                <p className="font-medium">{vehicle.make} {vehicle.model}</p>
              </div>
              <div>
                <p className="text-gray-500">Госномер</p>
                <p className="font-medium">{vehicle.plate}</p>
              </div>
              <div>
                <p className="text-gray-500 flex items-center gap-1"><User className="h-3 w-3" />Владелец</p>
                <p className="font-medium">{vehicle.owner_name}</p>
              </div>
              {vehicle.owner_phone && (
                <div>
                  <p className="text-gray-500 flex items-center gap-1"><Phone className="h-3 w-3" />Телефон</p>
                  <p className="font-medium">{vehicle.owner_phone}</p>
                </div>
              )}
              <div>
                <p className="text-gray-500 flex items-center gap-1"><MapPin className="h-3 w-3" />Текущий пост</p>
                <p className="font-medium">
                  {vehicle.station
                    ? `${(vehicle.station as { stage: { name: string }; name: string }).stage?.name} → ${vehicle.station.name}`
                    : 'Не назначен'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 flex items-center gap-1"><Clock className="h-3 w-3" />Дата поступления</p>
                <p className="font-medium">{new Date(vehicle.created_at).toLocaleDateString('ru-RU')}</p>
              </div>
            </div>
            {vehicle.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-gray-500 text-sm mb-1">Заметки</p>
                  <p className="text-sm">{vehicle.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Actions (move, complete, cancel) */}
        {(profile?.role === 'admin' || profile?.role === 'manager') && (
          <VehicleActions
            vehicle={vehicle}
            stations={stations || []}
            profile={profile as Profile}
          />
        )}

        {/* Services checklist */}
        <ServiceChecklist
          vehicleId={vehicle.id}
          vehicleServices={vehicleServices || []}
          allServices={allServices || []}
          profile={profile as Profile}
        />

        {/* Photos */}
        <PhotoUpload
          vehicleId={vehicle.id}
          photos={photos || []}
          profile={profile as Profile}
        />

        {/* History */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">История перемещений</CardTitle>
          </CardHeader>
          <CardContent>
            {history?.length ? (
              <div className="space-y-3">
                {history.map((h, idx) => (
                  <div key={h.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`h-3 w-3 rounded-full mt-1 ${idx === 0 ? 'bg-blue-500' : 'bg-gray-300'}`} />
                      {idx < history.length - 1 && <div className="w-0.5 bg-gray-200 flex-1 my-1" />}
                    </div>
                    <div className="pb-3 flex-1">
                      <p className="text-sm font-medium">
                        {(h.station as { stage: { name: string }; name: string })?.stage?.name} → {h.station?.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(h.started_at).toLocaleString('ru-RU')}
                        {h.ended_at && ` — ${new Date(h.ended_at).toLocaleString('ru-RU')}`}
                      </p>
                      {h.mover && (
                        <p className="text-xs text-gray-400">
                          {(h.mover as { full_name: string | null; email: string })?.full_name || h.mover?.email}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">История пуста</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
