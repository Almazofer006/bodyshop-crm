'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Car, LayoutDashboard, Users, LogOut, PlusCircle } from 'lucide-react'
import type { Profile } from '@/lib/types'

interface NavbarProps {
  profile: Profile
}

export function Navbar({ profile }: NavbarProps) {
  const router = useRouter()

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
    admin: 'Администратор',
    manager: 'Менеджер',
    master: 'Мастер',
    client: 'Клиент',
  }

  return (
    <header className="bg-gray-950 border-b border-gray-800 px-4 py-3">
      <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
        {/* Logo + Nav */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-white text-lg">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Car className="h-5 w-5 text-white" />
            </div>
            <span className="hidden sm:block tracking-tight">Кузовной центр</span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2 text-gray-300 hover:text-white hover:bg-gray-800">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden md:block">Доска</span>
              </Button>
            </Link>
            {(profile.role === 'admin' || profile.role === 'manager') && (
              <>
                <Link href="/vehicles">
                  <Button variant="ghost" size="sm" className="gap-2 text-gray-300 hover:text-white hover:bg-gray-800">
                    <Car className="h-4 w-4" />
                    <span className="hidden md:block">Автомобили</span>
                  </Button>
                </Link>
                <Link href="/vehicles/new">
                  <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white ml-1">
                    <PlusCircle className="h-4 w-4" />
                    <span className="hidden md:block">Добавить авто</span>
                  </Button>
                </Link>
              </>
            )}
            {profile.role === 'admin' && (
              <Link href="/admin/users">
                <Button variant="ghost" size="sm" className="gap-2 text-gray-300 hover:text-white hover:bg-gray-800">
                  <Users className="h-4 w-4" />
                  <span className="hidden md:block">Пользователи</span>
                </Button>
              </Link>
            )}
          </nav>
        </div>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-800 transition-colors">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-blue-600 text-white text-sm font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium leading-none text-white">
                {profile.full_name || profile.email}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {roleLabel[profile.role]}
              </p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
              <LogOut className="h-4 w-4 mr-2" />
              Выйти
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
