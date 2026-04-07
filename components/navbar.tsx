'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Car, LayoutDashboard, Users, LogOut, PlusCircle, Menu, X, BarChart2, Monitor, Table2, Timer } from 'lucide-react'
import type { Profile, IdleSession } from '@/lib/types'
import { IdleButton } from '@/components/idle-button'

interface NavbarProps { profile: Profile; activeIdleSession: IdleSession | null }

export function Navbar({ profile, activeIdleSession }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const initials = profile.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : profile.email[0].toUpperCase()

  const roleLabel: Record<string, string> = {
    admin: 'Администратор', manager: 'Менеджер', master: 'Мастер', client: 'Клиент',
  }

  const isActive = (href: string) => pathname === href

  const navLinks = [
    { href: '/dashboard', label: 'Доска', icon: LayoutDashboard, show: true },
    { href: '/display', label: 'TV режим', icon: Monitor, show: true },
    { href: '/leonid', label: 'Таблица', icon: Table2, show: true },
    { href: '/vehicles', label: 'Автомобили', icon: Car, show: profile.role === 'admin' || profile.role === 'manager' },
    { href: '/stats', label: 'Статистика', icon: BarChart2, show: profile.role === 'admin' || profile.role === 'manager' },
    { href: '/idle', label: 'Простои', icon: Timer, show: profile.role === 'admin' || profile.role === 'manager' },
    { href: '/admin/users', label: 'Пользователи', icon: Users, show: profile.role === 'admin' },
  ].filter(l => l.show)

  return (
    <header className="bg-gray-950 border-b border-gray-800">
      <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-white text-lg" onClick={() => setMobileOpen(false)}>
            <div className="bg-blue-600 p-1.5 rounded-lg shrink-0">
              <Car className="h-5 w-5 text-white" />
            </div>
            <span className="hidden sm:block tracking-tight">Центр Кузовного ремонта Авалон</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <Button
                  variant="ghost" size="sm"
                  className={`gap-2 ${isActive(href) ? 'bg-gray-800 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              </Link>
            ))}
            {(profile.role === 'admin' || profile.role === 'manager') && (
              <Link href="/vehicles/new">
                <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white ml-1">
                  <PlusCircle className="h-4 w-4" />
                  Добавить авто
                </Button>
              </Link>
            )}
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Idle button */}
          {profile.role !== 'client' && (
            <IdleButton userId={profile.id} activeSession={activeIdleSession} />
          )}
          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-800 transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-blue-600 text-white text-sm font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium leading-none text-white">{profile.full_name || profile.email}</p>
                <p className="text-xs text-gray-400 mt-0.5">{roleLabel[profile.role]}</p>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                <LogOut className="h-4 w-4 mr-2" />Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-gray-900 border-t border-gray-800 px-4 py-3 space-y-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setMobileOpen(false)}>
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive(href) ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}>
                <Icon className="h-5 w-5" />
                <span className="font-medium">{label}</span>
              </div>
            </Link>
          ))}
          {(profile.role === 'admin' || profile.role === 'manager') && (
            <Link href="/vehicles/new" onClick={() => setMobileOpen(false)}>
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-600 text-white mt-2">
                <PlusCircle className="h-5 w-5" />
                <span className="font-medium">Добавить авто</span>
              </div>
            </Link>
          )}
          <div className="pt-2 border-t border-gray-800 mt-2">
            <p className="text-xs text-gray-500 px-3 pb-1">{profile.email}</p>
            <button
              onClick={() => { handleLogout(); setMobileOpen(false) }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-gray-800 w-full transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Выйти</span>
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
