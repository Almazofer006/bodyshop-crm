'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Car, UserPlus, CheckCircle } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'client',
        },
      },
    })

    if (error) {
      if (error.message.includes('already registered')) {
        setError('Пользователь с таким email уже зарегистрирован')
      } else {
        setError(error.message)
      }
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => {
      router.push('/dashboard')
      router.refresh()
    }, 1500)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Регистрация прошла успешно!</h2>
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
        <div className="mt-12 grid grid-cols-2 gap-4 w-full max-w-sm">
          {['Контроль', 'Учёт', 'История', 'Аналитика'].map((item) => (
            <div key={item} className="bg-blue-500/40 rounded-xl p-4 text-center">
              <p className="text-white font-semibold">{item}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - Register form */}
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
            <UserPlus className="h-6 w-6 text-blue-500" />
            <h2 className="text-3xl font-bold text-white">Регистрация</h2>
          </div>
          <p className="text-gray-400 mb-8">Создайте аккаунт для доступа к системе</p>

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-gray-300">ФИО</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Иванов Иван Иванович"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500 h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500 h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">Пароль</Label>
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
              {loading ? 'Регистрация...' : 'Зарегистрироваться'}
            </Button>
          </form>

          <p className="text-center text-gray-500 mt-6">
            Уже есть аккаунт?{' '}
            <Link href="/auth/login" className="text-blue-500 hover:text-blue-400 font-medium">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
