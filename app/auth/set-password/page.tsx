'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Car, Lock, Loader2, CheckCircle } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'

export default function SetPasswordPage() {
  const router = useRouter()
  const supabaseRef = useRef<SupabaseClient | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [userName, setUserName] = useState('')
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabaseRef.current = supabase

    // Listen for auth state change from the invite token in hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, session?.user?.email)
        if (session?.user) {
          const name = session.user.user_metadata?.full_name || ''
          setUserName(name)
          setSessionReady(true)
          setChecking(false)
        }
      }
    )

    // Also check if already has a session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const name = session.user.user_metadata?.full_name || ''
        setUserName(name)
        setSessionReady(true)
        setChecking(false)
      } else {
        // No session yet — wait for onAuthStateChange to fire from hash
        setTimeout(() => {
          setChecking(false)
        }, 5000)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов')
      return
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают')
      return
    }

    setLoading(true)
    const supabase = supabaseRef.current || createClient()

    // Проверяем что сессия активна
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Сессия истекла. Запросите новое приглашение.')
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      console.error('Update password error:', updateError)
      setError(`Ошибка: ${updateError.message}`)
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => {
      router.push('/dashboard')
      router.refresh()
    }, 1500)
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Пароль установлен!</h2>
          <p className="text-gray-400">Перенаправление...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-gray-950">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-blue-600 p-12">
        <Car className="h-20 w-20 text-white mb-6" />
        <h1 className="text-4xl font-bold text-white text-center leading-tight">
          Центр Кузовного ремонта Авалон
        </h1>
        <p className="text-blue-100 text-lg mt-4 text-center">
          Система управления ремонтом автомобилей
        </p>
      </div>

      {/* Right panel - Set password form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Car className="h-6 w-6 text-white" />
            </div>
            <span className="text-white font-bold text-xl">Центр Кузовного ремонта Авалон</span>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <Lock className="h-6 w-6 text-blue-500" />
            <h2 className="text-3xl font-bold text-white">Установите пароль</h2>
          </div>
          {userName && (
            <p className="text-gray-400 mb-2">Добро пожаловать, {userName}!</p>
          )}
          <p className="text-gray-500 mb-8">Придумайте пароль для входа в систему</p>

          <form onSubmit={handleSetPassword} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">Новый пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="Минимум 6 символов"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500 h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-gray-300">Повторите пароль</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="Повторите пароль"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500 h-12"
              />
            </div>
            {error && (
              <p className="text-sm text-red-400 bg-red-900/30 border border-red-800 px-4 py-3 rounded-lg">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base"
              disabled={loading}
            >
              {loading ? 'Сохранение...' : 'Установить пароль'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
