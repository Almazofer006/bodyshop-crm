import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PlusCircle, Car, Phone, MapPin } from 'lucide-react'
import type { Profile } from '@/lib/types'

export const dynamic = 'force-dynamic'

const statusLabel: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  active: { label: 'В работе', variant: 'default' },
  completed: { label: 'Завершён', variant: 'secondary' },
  cancelled: { label: 'Отменён', variant: 'destructive' },
}

export default async function VehiclesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'manager')) {
    redirect('/dashboard')
  }

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*, station:stations(name, stage:stages(name))')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Автомобили</h1>
          <p className="text-gray-500 mt-1">Все автомобили в системе</p>
        </div>
        {(profile as Profile).role !== 'client' && (
          <Link href="/vehicles/new">
            <Button className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Добавить авто
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-3">
        {vehicles?.map((vehicle) => {
          const s = statusLabel[vehicle.status] || statusLabel.active
          return (
            <Link key={vehicle.id} href={`/vehicles/${vehicle.id}`}>
              <Card className="hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-50 p-2 rounded-lg">
                        <Car className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{vehicle.plate}</span>
                          <Badge variant={s.variant}>{s.label}</Badge>
                        </div>
                        <p className="text-sm text-gray-600">{vehicle.make} {vehicle.model}</p>
                        <p className="text-sm text-gray-500">{vehicle.owner_name}</p>
                        {vehicle.owner_phone && (
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                            <Phone className="h-3 w-3" />
                            {vehicle.owner_phone}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {vehicle.station && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="h-3 w-3" />
                          <span>
                            {(vehicle.station as { stage: { name: string }; name: string }).stage?.name} → {vehicle.station.name}
                          </span>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(vehicle.created_at).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
        {!vehicles?.length && (
          <div className="text-center py-12 text-gray-400">
            <Car className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Автомобили не найдены</p>
          </div>
        )}
      </div>
    </div>
  )
}
