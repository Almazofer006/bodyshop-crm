import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // Проверяем что запрашивающий — admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await request.json()
  if (!userId) return NextResponse.json({ error: 'userId обязателен' }, { status: 400 })

  // Нельзя удалить самого себя
  if (userId === user.id) {
    return NextResponse.json({ error: 'Нельзя удалить самого себя' }, { status: 400 })
  }

  // Создаём admin-клиент с service role key (реальный Supabase URL, не прокси)
  const adminSupabase = createSupabaseClient(
    process.env.SUPABASE_URL || 'https://tdsexwuyjpcxhumnxxpi.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Удаляем профиль из таблицы profiles
  await adminSupabase.from('profiles').delete().eq('id', userId)

  // Удаляем пользователя из Supabase Auth
  const { error } = await adminSupabase.auth.admin.deleteUser(userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
