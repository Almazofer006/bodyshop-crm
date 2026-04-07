'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { CalendarClock, Pencil, Check, X } from 'lucide-react'

interface DueDateEditorProps {
  vehicleId: string
  dueDate: string | null
  canEdit: boolean
}

export function DueDateEditor({ vehicleId, dueDate, canEdit }: DueDateEditorProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(dueDate || '')
  const [saving, setSaving] = useState(false)

  const displayDate = dueDate
    ? new Date(dueDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null

  const getDueColor = () => {
    if (!dueDate) return 'text-gray-400'
    const now = new Date(); now.setHours(0,0,0,0)
    const due = new Date(dueDate)
    const diff = Math.ceil((due.getTime() - now.getTime()) / 86400000)
    if (diff < 0) return 'text-red-600 font-bold'
    if (diff === 0) return 'text-orange-600 font-bold'
    if (diff <= 1) return 'text-yellow-600 font-semibold'
    return 'text-gray-800'
  }

  const getDueLabel = () => {
    if (!dueDate) return 'Не указан'
    const now = new Date(); now.setHours(0,0,0,0)
    const due = new Date(dueDate)
    const diff = Math.ceil((due.getTime() - now.getTime()) / 86400000)
    if (diff < 0) return `${displayDate} — просрочен!`
    if (diff === 0) return `${displayDate} — сегодня!`
    if (diff === 1) return `${displayDate} — завтра`
    return `${displayDate} (через ${diff} дн.)`
  }

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('vehicles')
      .update({ due_date: value || null })
      .eq('id', vehicleId)

    if (error) {
      toast.error('Ошибка при сохранении')
    } else {
      toast.success('Срок выдачи обновлён')
      setEditing(false)
    }
    setSaving(false)
  }

  return (
    <div>
      <p className="text-gray-500 flex items-center gap-1 text-sm mb-1">
        <CalendarClock className="h-3 w-3" />
        Срок выдачи
      </p>
      {editing ? (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={value}
            onChange={e => setValue(e.target.value)}
            className="h-8 text-sm w-40"
          />
          <Button size="sm" className="h-8 px-2" onClick={handleSave} disabled={saving}>
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => { setEditing(false); setValue(dueDate || '') }}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <p className={`font-medium text-sm ${getDueColor()}`}>{getDueLabel()}</p>
          {canEdit && (
            <button
              onClick={() => setEditing(true)}
              className="text-gray-400 hover:text-blue-500 transition-colors"
              title="Изменить срок"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
