'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { UserPlus } from 'lucide-react'

export function InviteUserForm() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('master')
  const [loading, setLoading] = useState(false)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.functions.invoke('invite-user', {
      body: { email, full_name: name, role },
    })

    if (error) {
      // Fallback: create via admin API is not available from client
      // Show instructions instead
      toast.error('Для приглашения используйте Supabase Dashboard → Authentication → Invite user')
      setLoading(false)
      return
    }

    toast.success(`Приглашение отправлено на ${email}`)
    setEmail('')
    setName('')
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Пригласить пользователя
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-800">
          <p className="font-medium mb-1">Как пригласить пользователя:</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-700">
            <li>Перейдите в <strong>Supabase Dashboard</strong> → <strong>Authentication</strong> → <strong>Users</strong></li>
            <li>Нажмите <strong>&quot;Invite user&quot;</strong> → введите email</li>
            <li>После регистрации — назначьте роль в таблице ниже</li>
          </ol>
        </div>
        <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2 space-y-1">
            <Label>Email</Label>
            <Input type="email" placeholder="user@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>Имя</Label>
            <Input placeholder="Иван Петров" value={name} onChange={(e) => setName(e.target.value)} />
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
            <Button type="submit" disabled={loading} className="gap-2">
              <UserPlus className="h-4 w-4" />
              {loading ? 'Отправка...' : 'Отправить приглашение'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
