import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getServerPermissions } from '@/lib/supabase/get-permissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Car, CheckCircle, Clock, TrendingUp, AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

function formatHours(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)} мин`
  if (hours < 24) return `${hours.toFixed(1)} ч`
  const days = Math.floor(hours / 24)
  const remaining = hours % 24
  return remaining > 0 ? `${days} д ${Math.round(remaining)} ч` : `${days} д`
}

function getStatusColor(hours: number) {
  if (hours <= 4) return 'bg-green-500'
  if (hours <= 24) return 'bg-blue-500'
  if (hours <= 72) return 'bg-yellow-500'
  return 'bg-red-500'
}

export default async function StatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const result = await getServerPermissions(supabase, user.id)
  if (!result || !result.permissions.see_stats) redirect('/dashboard')

  // Параллельные запросы для скорости
  const [
    { count: activeCount },
    { count: completedCount },
    { count: monthCount },
    { data: historyData },
    { data: activeVehicles },
    { data: currentHistory },
  ] = await Promise.all([
    supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('vehicles').select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    supabase.from('vehicle_history')
      .select('station_id, started_at, ended_at, station:stations(name, stage:stages(name))')
      .not('ended_at', 'is', null),
    supabase.from('vehicles')
      .select('id, plate, make, model, current_station_id, station:stations(name, stage:stages(name))')
      .eq('status', 'active')
      .order('created_at'),
    supabase.from('vehicle_history')
      .select('vehicle_id, started_at')
      .is('ended_at', null),
  ])

  // Calculate avg time per stage
  const stageStats: Record<string, { name: string; stageName: string; totalHours: number; count: number }> = {}

  historyData?.forEach((h) => {
    const station = h.station as unknown as { name: string; stage: { name: string } } | null
    if (!station) return
    const key = String(h.station_id)
    const hours = (new Date(h.ended_at!).getTime() - new Date(h.started_at).getTime()) / 3600000

    if (!stageStats[key]) {
      stageStats[key] = { name: station.name, stageName: station.stage?.name || '', totalHours: 0, count: 0 }
    }
    stageStats[key].totalHours += hours
    stageStats[key].count += 1
  })

  const stageList = Object.values(stageStats)
    .map(s => ({ ...s, avgHours: s.totalHours / s.count }))
    .sort((a, b) => b.avgHours - a.avgHours)

  const currentHistoryMap = new Map(currentHistory?.map(h => [h.vehicle_id, h.started_at]))

  const activeWithTime = activeVehicles?.map(v => ({
    ...v,
    hoursOnStation: currentHistoryMap.has(v.id)
      ? (Date.now() - new Date(currentHistoryMap.get(v.id)!).getTime()) / 3600000
      : 0,
  })).sort((a, b) => b.hoursOnStation - a.hoursOnStation)

  const maxAvg = Math.max(...stageList.map(s => s.avgHours), 1)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Статистика</h1>
        <p className="text-gray-500 mt-1">Аналитика по времени и загрузке участков</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg"><Car className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{activeCount ?? 0}</p>
                <p className="text-xs text-gray-500">В работе</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg"><CheckCircle className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{completedCount ?? 0}</p>
                <p className="text-xs text-gray-500">Завершено всего</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-lg"><TrendingUp className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{monthCount ?? 0}</p>
                <p className="text-xs text-gray-500">В этом месяце</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 p-2 rounded-lg"><Clock className="h-5 w-5 text-orange-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stageList.length > 0
                    ? formatHours(stageList.reduce((s, x) => s + x.avgHours, 0) / stageList.length)
                    : '—'}
                </p>
                <p className="text-xs text-gray-500">Среднее на пост</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Average time per station */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Среднее время на посту
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stageList.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Данных пока нет — нужна история перемещений</p>
            ) : (
              <div className="space-y-3">
                {stageList.map((s) => (
                  <div key={s.name + s.stageName}>
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <span className="text-sm font-medium text-gray-800">{s.name}</span>
                        <span className="text-xs text-gray-400 ml-2">{s.stageName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-700">{formatHours(s.avgHours)}</span>
                        <Badge variant="outline" className="text-xs">{s.count} авто</Badge>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getStatusColor(s.avgHours)}`}
                        style={{ width: `${Math.min((s.avgHours / maxAvg) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="h-2 w-3 rounded bg-green-500 inline-block" /> до 4ч</span>
              <span className="flex items-center gap-1"><span className="h-2 w-3 rounded bg-blue-500 inline-block" /> до 1 дня</span>
              <span className="flex items-center gap-1"><span className="h-2 w-3 rounded bg-yellow-500 inline-block" /> до 3 дней</span>
              <span className="flex items-center gap-1"><span className="h-2 w-3 rounded bg-red-500 inline-block" /> более 3 дней</span>
            </div>
          </CardContent>
        </Card>

        {/* Active vehicles by time on station */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Авто на постах (дольше всего)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!activeWithTime?.length ? (
              <p className="text-sm text-gray-400 text-center py-6">Нет активных автомобилей</p>
            ) : (
              <div className="space-y-2">
                {activeWithTime.slice(0, 10).map((v) => {
                  const station = v.station as unknown as { name: string; stage: { name: string } } | null
                  const urgent = v.hoursOnStation > 48
                  return (
                    <div key={v.id} className={`flex items-center justify-between p-2.5 rounded-lg border ${urgent ? 'border-red-200 bg-red-50' : 'border-gray-100'}`}>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{v.plate}</p>
                        <p className="text-xs text-gray-500">{v.make} {v.model}</p>
                        <p className="text-xs text-gray-400">{station?.stage?.name} → {station?.name}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${urgent ? 'text-red-600' : 'text-gray-700'}`}>
                          {formatHours(v.hoursOnStation)}
                        </p>
                        {urgent && <p className="text-xs text-red-400">Задержка!</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
