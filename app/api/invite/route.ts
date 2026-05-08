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

  const { email, full_name, role } = await request.json()
  if (!email) return NextResponse.json({ error: 'Email обязателен' }, { status: 400 })

  // Создаём admin-клиент с service role key (используем реальный Supabase URL, не прокси)
  const adminSupabase = createSupabaseClient(
    process.env.SUPABASE_URL || 'https://tdsexwuyjpcxhumnxxpi.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Определяем URL для редиректа после подтверждения приглашения
  const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://avaloncrm.ru'

  const { error } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name: full_name || '', role: role || 'master' },
    redirectTo: `${siteUrl}/auth/callback?next=/auth/set-password`,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
