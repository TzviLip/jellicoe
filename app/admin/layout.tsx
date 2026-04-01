import { createServerSupabaseClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'

// Server-side auth guard for the entire /admin section
// Runs before any admin page renders — no client-side flicker possible
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!roleData || !['doctor', 'admin'].includes(roleData.role)) {
    redirect('/login')
  }

  return <>{children}</>
}
