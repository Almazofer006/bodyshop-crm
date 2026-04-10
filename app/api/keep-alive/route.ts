import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Пинг к Supabase чтобы база не засыпала (service role обходит RLS)
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { count, error } = await supabase
      .from('stages')
      .select('*', { count: 'exact', head: true })

    if (error) {
      return NextResponse.json({ status: 'error', message: error.message }, { status: 500 })
    }

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      stages: count,
    })
  } catch (e) {
    return NextResponse.json({ status: 'error', message: String(e) }, { status: 500 })
  }
}
