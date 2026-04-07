'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { UserPlus, CheckCircle2 } from 'lucide-react'

export function InviteUserForm() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('master')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, full_name: name, role }),
    })

    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error || 'Ошибка при отправке приглашения')
      setLoading(false)
      return
    }

    toast.success(`Приглашение отправлено на ${email}`)
    setSent(true)
    setEmail('')
    setName('')
    setRole('master')
    setLoading(false)
    setTimeout(() => setSent(false), 4000)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Пригласить сотрудника
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2 space-y-1">
            <Label>Email *</Label>
            <Input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Имя</Label>
            <Input
              placeholder="Иван Петров"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Роль</Label>
            <Select value={role} onValueChange={(v) => v && setRole(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Администратор</SelectItem>
                <SelectItem value="manager">Менеджер</SelectItem>
                <SelectItem value="master">Мастер</SelectItem>
                <SelectItem value="client">Клиент</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-4">
            <Button type="submit" disabled={loading || !email} className="gap-2">
              {sent
                ? <><CheckCircle2 className="h-4 w-4" /> Отправлено!</>
                : <><UserPlus className="h-4 w-4" /> {loading ? 'Отправка...' : 'Отправить приглашение'}</>
              }
            </Button>
          </div>
        </form>
        <p className="text-xs text-gray-400 mt-3">
          На указанный email придёт письмо со ссылкой для входа. Роль будет назначена автоматически.
        </p>
      </CardContent>
    </Card>
  )
}
