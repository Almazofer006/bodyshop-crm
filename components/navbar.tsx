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
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-blue-600 text-lg">
            <Car className="h-6 w-6" />
            <span className="hidden sm:block">Кузовной центр</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden md:block">Доска</span>
              </Button>
            </Link>
            {(profile.role === 'admin' || profile.role === 'manager') && (
              <>
                <Link href="/vehicles">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Car className="h-4 w-4" />
                    <span className="hidden md:block">Автомобили</span>
                  </Button>
                </Link>
                <Link href="/vehicles/new">
                  <Button variant="ghost" size="sm" className="gap-2 text-blue-600">
                    <PlusCircle className="h-4 w-4" />
                    <span className="hidden md:block">Добавить авто</span>
                  </Button>
                </Link>
              </>
            )}
            {profile.role === 'admin' && (
              <Link href="/admin/users">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden md:block">Пользователи</span>
                </Button>
              </Link>
            )}
          </nav>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-gray-100 transition-colors">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium leading-none">
                {profile.full_name || profile.email}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
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
