// Shared auth helpers for API routes
import { createServerSupabaseClient } from './supabase.server'
import { NextResponse } from 'next/server'

type Role = 'doctor' | 'radiographer' | 'admin'

export async function requireRole(allowedRoles: Role[]): Promise<
  { user: { id: string }; role: string; error?: never } |
  { error: NextResponse; user?: never; role?: never }
> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorised' }, { status: 401 }) }
  }

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!roleData || !allowedRoles.includes(roleData.role as Role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user, role: roleData.role }
}
