'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Timer } from 'lucide-react'
import { toast } from 'sonner'

interface IdleControllerProps {
  userId: string
  variant?: 'light' | 'dark' // light = dashboard, dark = TV
}

interface Session {
  id: string
  started_at: string
}

function formatElapsed(secs: number) {
  const h = Math.floor(secs / 3600).toString().padStart(2, '0')
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}

function isWorkingHours() {
  const h = new Date().getHours()
  return h >= 10 && h < 20
}

export function IdleController({ userId, variant = 'light' }: IdleControllerProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [withinHours, setWithinHours] = useState(isWorkingHours())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchSession = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('idle_sessions')
      .select('id, started_at')
      .eq('user_id', userId)
      .is('ended_at', null)
      .maybeSingle()

    if (data) {
      setSession(data)
      const diff = Math.floor((Date.now() - new Date(data.started_at).getTime()) / 1000)
      setElapsed(Math.max(0, diff))
    } else {
      setSession(null)
      setElapsed(0)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchSession() }, [fetchSession])

  // Timer tick
  useEffect(() => {
    if (session) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [session])

  // Working hours refresh
  useEffect(() => {
    const t = setInterval(() => setWithinHours(isWorkingHours()), 30000)
    return () => clearInterval(t)
  }, [])

  const handleStart = async () => {
    if (busy) return
    setBusy(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('idle_sessions')
      .insert({ user_id: userId })
      .select('id, started_at')
      .single()
    if (!error && data) {
      setSession(data)
      setElapsed(0)
    } else {
      toast.error('Ошибка при начале простоя')
    }
    setBusy(false)
  }

  const handleEnd = async () => {
    if (!session || busy) return
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('idle_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', session.id)
    if (!error) {
      setSession(null)
      setElapsed(0)
      toast.success('Простой завершён')
    } else {
      toast.error('Ошибка')
    }
    setBusy(false)
  }

  if (loading) return null

  const isDark = variant === 'dark'

  // Button when DISABLED (outside working hours, no active session)
  if (!withinHours && !session) {
    return (
      <button
        disabled
        title="Доступно с 10:00 до 20:00"
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-not-allowed ${
          isDark
            ? 'text-gray-600 bg-gray-800/50 border border-gray-700/50'
            : 'text-gray-400 bg-gray-100 border border-gray-200'
        }`}
      >
        <Timer className="h-4 w-4" />
        Простой
      </button>
    )
  }

  // Button when ACTIVE (idle running)
  if (session) {
    return (
      <>
        <button
          onClick={handleEnd}
          disabled={busy}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700 border border-red-700 transition-colors shadow-sm"
        >
          <span className="h-2 w-2 rounded-full bg-white animate-pulse shrink-0" />
          {formatElapsed(elapsed)}
        </button>

        {/* Fullscreen overlay */}
        <div className="fixed inset-0 bg-gray-950 z-[9999] flex flex-col items-center justify-center select-none cursor-default">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }}
          />

          <p className="text-white/30 text-base font-medium uppercase tracking-[0.4em] mb-4 z-10">
            рабочее место недоступно
          </p>

          <h1 className="text-[14vw] sm:text-[12vw] font-black text-red-500 uppercase leading-none tracking-tight z-10 drop-shadow-2xl">
            ПРОСТОЙ
          </h1>

          <p className="text-[10vw] sm:text-[8vw] font-mono font-bold text-white mt-6 tabular-nums z-10"
            style={{ textShadow: '0 0 40px rgba(255,255,255,0.2)' }}
          >
            {formatElapsed(elapsed)}
          </p>

          <p className="text-white/30 text-sm mt-4 z-10">
            Начало: {new Date(session.started_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </p>

          <button
            onClick={handleEnd}
            disabled={busy}
            className="mt-12 flex items-center gap-3 px-10 py-5 rounded-2xl text-xl font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all shadow-2xl z-10 border border-blue-500"
          >
            <Timer className="h-6 w-6" />
            {busy ? 'Подождите...' : 'Приступить к работе'}
          </button>

          <p className="mt-4 text-white/20 text-sm z-10">
            Нажмите кнопку чтобы завершить простой
          </p>
        </div>
      </>
    )
  }

  // Button when INACTIVE (ready to start)
  return (
    <button
      onClick={handleStart}
      disabled={busy}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm ${
        isDark
          ? 'text-white bg-blue-600 hover:bg-blue-700 border border-blue-700'
          : 'text-white bg-blue-600 hover:bg-blue-700 border border-blue-700'
      }`}
    >
      <Timer className="h-4 w-4" />
      {busy ? '...' : 'Простой'}
    </button>
  )
}
