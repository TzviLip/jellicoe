import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase.server'

// GET — list all staff
export async function GET(req: NextRequest) {
  const auth = await requireRole(['doctor', 'admin'])
  if (auth.error) return auth.error

  const admin = createAdminClient()

  const { data: roles, error } = await admin
    .from('user_roles')
    .select('user_id, role, name')
    .order('role')

  if (error) return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })

  // Get emails from auth — safe with service role key
  type RoleRow = { user_id: string; role: string; name: string }
  const staffWithEmail = await Promise.all(
    (roles ?? []).map(async (r: RoleRow) => {
      const { data } = await admin.auth.admin.getUserById(r.user_id)
      return {
        user_id: r.user_id,
        role:    r.role,
        name:    r.name,
        email:   data?.user?.email ?? '',
      }
    })
  )

  return NextResponse.json({ staff: staffWithEmail })
}

// POST — invite a new staff member
export async function POST(req: NextRequest) {
  const auth = await requireRole(['doctor', 'admin'])
  if (auth.error) return auth.error

  const { email, name, role } = await req.json()

  if (!email || !email.includes('@'))
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  if (!name?.trim())
    return NextResponse.json({ error: 'Name required' }, { status: 400 })
  if (!['doctor', 'radiographer'].includes(role))
    return NextResponse.json({ error: 'Role must be doctor or radiographer' }, { status: 400 })

  const admin = createAdminClient()

  // Create auth account — sends invite email automatically
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: { name },
  })

  if (createError) {
    const msg = createError.message.includes('already been registered')
      ? 'An account with that email already exists.'
      : createError.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Assign role
  const { error: roleError } = await admin
    .from('user_roles')
    .insert({ user_id: created.user.id, role, name: name.trim() })

  if (roleError) {
    // Clean up — delete the created auth user if role insert fails
    await admin.auth.admin.deleteUser(created.user.id)
    return NextResponse.json({ error: 'Failed to assign role' }, { status: 500 })
  }

  // Audit log
  await admin.from('audit_log').insert({
    user_id:  auth.user.id,
    action:   'staff_invited',
    detail:   { email, name, role },
  })

  return NextResponse.json({ success: true, user_id: created.user.id })
}

// DELETE — remove a staff member
export async function DELETE(req: NextRequest) {
  const auth = await requireRole(['doctor', 'admin'])
  if (auth.error) return auth.error

  const { user_id } = await req.json()
  if (!user_id) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })

  // Prevent self-deletion
  if (user_id === auth.user.id)
    return NextResponse.json({ error: 'You cannot remove your own account' }, { status: 400 })

  const admin = createAdminClient()

  // Get name for audit log before deleting
  const { data: roleData } = await admin
    .from('user_roles').select('name, role').eq('user_id', user_id).single()

  // Delete auth account — cascades to user_roles via FK
  const { error } = await admin.auth.admin.deleteUser(user_id)
  if (error) return NextResponse.json({ error: 'Failed to remove account' }, { status: 500 })

  await admin.from('audit_log').insert({
    user_id:  auth.user.id,
    action:   'staff_removed',
    detail:   { removed_user_id: user_id, name: roleData?.name, role: roleData?.role },
  })

  return NextResponse.json({ success: true })
}