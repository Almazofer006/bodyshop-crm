import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/navbar'
import type { Profile } from '@/lib/types'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  const { data: activeIdleSession } = await supabase
    .from('idle_sessions')
    .select('*')
    .eq('user_id', user.id)
    .is('ended_at', null)
    .single()

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar profile={profile as Profile} activeIdleSession={activeIdleSession ?? null} />
      <main className="flex-1 p-3 sm:p-4 max-w-screen-2xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
