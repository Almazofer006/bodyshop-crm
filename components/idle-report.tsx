'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronDown, ChevronRight, Timer, Users, AlertCircle } from 'lucide-react'

interface Employee {
  id: string
  full_name: string | null
  email: string
  role: string
}

interface Session {
  id: string
  user_id: string
  started_at: string
  ended_at: string | null
}

interface IdleReportProps {
  employees: Employee[]
  sessions: Session[]
}

function formatMinutes(minutes: number) {
  if (minutes < 1) return '< 1 мин'
  if (minutes < 60) return `${Math.round(minutes)} мин`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m > 0 ? `${h}ч ${m}мин` : `${h}ч`
}

function getDuration(started: string, ended: string | null): number {
  const end = ended ? new Date(ended) : new Date()
  return (end.getTime() - new Date(started).getTime()) / 60000
}

const roleLabel: Record<string, string> = {
  admin: 'Администратор', manager: 'Менеджер', master: 'Мастер', client: 'Клиент',
}

export function IdleReport({ employees, sessions }: IdleReportProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const currentlyIdle = sessions.filter(s => !s.ended_at)

  const sessionsByUser = new Map<string, Session[]>()
  for (const s of sessions) {
    if (!sessionsByUser.has(s.user_id)) sessionsByUser.set(s.user_id, [])
    sessionsByUser.get(s.user_id)!.push(s)
  }

  const todayMinutes = (userId: string) =>
    (sessionsByUser.get(userId) || [])
      .filter(s => new Date(s.started_at) >= today)
      .reduce((sum, s) => sum + getDuration(s.started_at, s.ended_at), 0)

  const sessionsByDay = (userId: string) => {
    const userSessions = sessionsByUser.get(userId) || []
    const byDay = new Map<string, Session[]>()
    for (const s of userSessions) {
      const day = new Date(s.started_at).toLocaleDateString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
      if (!byDay.has(day)) byDay.set(day, [])
      byDay.get(day)!.push(s)
    }
    return Array.from(byDay.entries()).sort((a, b) => {
      const parse = (d: string) => {
        const [dd, mm, yyyy] = d.split('.')
        return new Date(`${yyyy}-${mm}-${dd}`).getTime()
      }
      return parse(b[0]) - parse(a[0])
    })
  }

  const totalTodayMinutes = employees.reduce((sum, e) => sum + todayMinutes(e.id), 0)

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-gray-500 mb-1">Сейчас в простое</p>
            <p className={`text-3xl font-bold ${currentlyIdle.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>
              {currentlyIdle.length}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">сотрудников</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-gray-500 mb-1">Сегодня суммарно</p>
            <p className="text-3xl font-bold text-gray-900">{formatMinutes(totalTodayMinutes)}</p>
            <p className="text-xs text-gray-400 mt-0.5">все сотрудники</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-gray-500 mb-1">Кнопка активна</p>
            <p className="text-lg font-bold text-gray-900">10:00 – 20:00</p>
            <p className="text-xs text-gray-400 mt-0.5">ежедневно</p>
          </CardContent>
        </Card>
      </div>

      {/* Employees */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Сотрудники
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {employees.length === 0 ? (
            <p className="text-sm text-gray-400 p-6 text-center">Нет сотрудников</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {employees.map(emp => {
                const isIdle = currentlyIdle.some(s => s.user_id === emp.id)
                const todayMin = todayMinutes(emp.id)
                const isExp = expanded === emp.id
                const days = sessionsByDay(emp.id)

                return (
                  <div key={emp.id}>
                    <button
                      onClick={() => setExpanded(isExp ? null : emp.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      {isExp
                        ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                        : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {emp.full_name || emp.email}
                        </p>
                        <p className="text-xs text-gray-400">{roleLabel[emp.role] || emp.role}</p>
                      </div>
                      <div className="text-right shrink-0 mr-2">
                        <p className="text-sm font-semibold text-gray-800">{formatMinutes(todayMin)}</p>
                        <p className="text-xs text-gray-400">сегодня</p>
                      </div>
                      <div className="shrink-0">
                        {isIdle ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                            <AlertCircle className="h-3 w-3" />
                            Простой
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                            Активен
                          </span>
                        )}
                      </div>
                    </button>

                    {isExp && (
                      <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                        {days.length === 0 ? (
                          <p className="text-sm text-gray-400 py-4 text-center">Нет записей за 30 дней</p>
                        ) : (
                          <div className="space-y-4 pt-3">
                            {days.map(([day, daySessions]) => {
                              const dayTotal = daySessions.reduce(
                                (sum, s) => sum + getDuration(s.started_at, s.ended_at), 0
                              )
                              return (
                                <div key={day}>
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{day}</p>
                                    <p className="text-xs font-bold text-gray-800 bg-gray-200 px-2 py-0.5 rounded-full">
                                      {formatMinutes(dayTotal)}
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    {daySessions.map(s => (
                                      <div
                                        key={s.id}
                                        className="flex items-center gap-3 text-xs bg-white rounded-lg px-3 py-2 border border-gray-200"
                                      >
                                        <Timer className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                        <span className="font-semibold text-gray-700">
                                          {new Date(s.started_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <span className="text-gray-400">→</span>
                                        <span className="font-semibold text-gray-700">
                                          {s.ended_at
                                            ? new Date(s.ended_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                                            : <span className="text-red-500 animate-pulse">сейчас</span>
                                          }
                                        </span>
                                        <span className="ml-auto font-bold text-gray-600">
                                          {formatMinutes(getDuration(s.started_at, s.ended_at))}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
