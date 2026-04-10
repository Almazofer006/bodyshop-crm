import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Простой пинг к Supabase чтобы база не засыпала
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    if (error) {
      return NextResponse.json({ status: 'error', message: error.message }, { status: 500 })
    }

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      users: count,
    })
  } catch (e) {
    return NextResponse.json({ status: 'error', message: String(e) }, { status: 500 })
  }
}
