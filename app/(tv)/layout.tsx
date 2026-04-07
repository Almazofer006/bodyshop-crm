import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function TVLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {children}
    </div>
  )
}
