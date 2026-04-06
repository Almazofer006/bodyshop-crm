'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Users } from 'lucide-react'
import type { Profile, Role } from '@/lib/types'

const roleLabel: Record<Role, string> = {
  admin: 'Администратор',
  manager: 'Менеджер',
  master: 'Мастер',
  client: 'Клиент',
}

const roleVariant: Record<Role, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  admin: 'destructive',
  manager: 'default',
  master: 'secondary',
  client: 'outline',
}

interface UsersTableProps {
  users: Profile[]
}

export function UsersTable({ users: initialUsers }: UsersTableProps) {
  const [users, setUsers] = useState(initialUsers)

  const handleRoleChange = async (userId: string, newRole: Role) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) {
      toast.error('Ошибка при изменении роли')
      return
    }

    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u))
    toast.success('Роль обновлена')
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Пользователи системы ({users.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
              <div>
                <p className="font-medium text-sm">{user.full_name || '—'}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={roleVariant[user.role]}>
                  {roleLabel[user.role]}
                </Badge>
                <Select value={user.role} onValueChange={(v) => v && handleRoleChange(user.id, v as Role)}>
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Администратор</SelectItem>
                    <SelectItem value="manager">Менеджер</SelectItem>
                    <SelectItem value="master">Мастер</SelectItem>
                    <SelectItem value="client">Клиент</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Нет пользователей</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
