'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Timer, TimerOff } from 'lucide-react'
import type { IdleSession } from '@/lib/types'

interface IdleButtonProps {
  userId: string
  activeSession: IdleSession | null
}

function isWorkingHours() {
  const h = new Date().getHours()
  return h >= 10 && h < 20
}

export function IdleButton({ userId, activeSession: initialSession }: IdleButtonProps) {
  const router = useRouter()
  const [session, setSession] = useState<IdleSession | null>(initialSession)
  const [loading, setLoading] = useState(false)
  const [withinHours, setWithinHours] = useState(isWorkingHours())

  useEffect(() => {
    const t = setInterval(() => setWithinHours(isWorkingHours()), 30000)
    return () => clearInterval(t)
  }, [])

  const handleToggle = async () => {
    if (!withinHours || loading) return
    setLoading(true)
    const supabase = createClient()

    if (session) {
      const { error } = await supabase
        .from('idle_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', session.id)
      if (!error) {
        toast.success('Простой завершён')
        setSession(null)
        router.refresh()
      } else {
        toast.error('Ошибка')
      }
    } else {
      const { data, error } = await supabase
        .from('idle_sessions')
        .insert({ user_id: userId })
        .select()
        .single()
      if (!error && data) {
        toast.success('Простой начат')
        setSession(data as IdleSession)
        router.refresh()
      } else {
        toast.error('Ошибка')
      }
    }
    setLoading(false)
  }

  if (!withinHours) {
    return (
      <button
        disabled
        title="Доступно с 10:00 до 20:00"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-800/50 cursor-not-allowed border border-gray-700/50"
      >
        <Timer className="h-3.5 w-3.5" />
        Простой
      </button>
    )
  }

  if (session) {
    return (
      <button
        onClick={handleToggle}
        disabled={loading}
        title="Нажми чтобы завершить простой"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 transition-colors"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
        {loading ? '...' : 'В простое'}
        <TimerOff className="h-3.5 w-3.5" />
      </button>
    )
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      title="Нажми чтобы начать простой"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 bg-gray-800 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 border border-gray-700 transition-colors"
    >
      <Timer className="h-3.5 w-3.5" />
      {loading ? '...' : 'Простой'}
    </button>
  )
}
