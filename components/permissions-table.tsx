'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { RolePermissions } from '@/lib/types'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  manager: 'Менеджер',
  master: 'Мастер',
  client: 'Клиент',
}

interface PermissionGroup {
  label: string
  keys: { key: keyof RolePermissions; label: string }[]
}

const GROUPS: PermissionGroup[] = [
  {
    label: 'Страницы',
    keys: [
      { key: 'see_dashboard', label: 'Доска' },
      { key: 'see_tv_mode', label: 'TV режим' },
      { key: 'see_leonid', label: 'Таблица' },
      { key: 'see_vehicles', label: 'Автомобили' },
      { key: 'see_stats', label: 'Статистика' },
      { key: 'see_idle', label: 'Простои' },
      { key: 'see_users', label: 'Пользователи' },
    ],
  },
  {
    label: 'Видимость данных',
    keys: [
      { key: 'see_owner_phone', label: 'Телефон владельца' },
      { key: 'see_owner_name', label: 'Имя владельца' },
      { key: 'see_due_date', label: 'Срок выдачи' },
    ],
  },
  {
    label: 'Действия',
    keys: [
      { key: 'can_move_vehicles', label: 'Перемещать авто' },
      { key: 'can_add_vehicles', label: 'Добавлять авто' },
      { key: 'can_manage_services', label: 'Управлять работами' },
      { key: 'can_complete_services', label: 'Выполнять работы' },
      { key: 'can_upload_photos', label: 'Загружать фото' },
    ],
  },
]

interface PermissionsTableProps {
  initialData: RolePermissions[]
}

export function PermissionsTable({ initialData }: PermissionsTableProps) {
  const [data, setData] = useState<RolePermissions[]>(initialData)
  const [saving, setSaving] = useState<string | null>(null)

  const roles = data.map(d => d.role)

  const handleToggle = async (role: string, key: keyof RolePermissions) => {
    if (key === 'role') return
    const row = data.find(d => d.role === role)
    if (!row) return

    const newValue = !row[key]

    // Optimistic update
    setData(prev =>
      prev.map(d => d.role === role ? { ...d, [key]: newValue } : d)
    )

    setSaving(role)
    const supabase = createClient()
    const { error } = await supabase
      .from('role_permissions')
      .update({ [key]: newValue })
      .eq('role', role)

    if (error) {
      toast.error('Ошибка сохранения')
      // Revert
      setData(prev =>
        prev.map(d => d.role === role ? { ...d, [key]: !newValue } : d)
      )
    }
    setSaving(null)
  }

  return (
    <div className="space-y-6">
      {GROUPS.map(group => (
        <div key={group.label} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
            <h3 className="font-semibold text-sm text-gray-700">{group.label}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-2.5 w-48">Право</th>
                  {roles.map(role => (
                    <th key={role} className="text-center text-xs font-medium text-gray-500 px-4 py-2.5 min-w-[120px]">
                      <div className="flex items-center justify-center gap-1.5">
                        {ROLE_LABELS[role] || role}
                        {saving === role && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {group.keys.map(({ key, label }) => (
                  <tr key={key} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="text-sm text-gray-700 px-4 py-2.5 font-medium">{label}</td>
                    {roles.map(role => {
                      const row = data.find(d => d.role === role)
                      const checked = row ? !!row[key] : false
                      return (
                        <td key={role} className="text-center px-4 py-2.5">
                          <label className="inline-flex items-center justify-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleToggle(role, key)}
                              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-colors"
                            />
                          </label>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <p className="text-xs text-gray-400 text-center">
        Изменения сохраняются автоматически. Для применения пользователям нужно обновить страницу.
      </p>
    </div>
  )
}
