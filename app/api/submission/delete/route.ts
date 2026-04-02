import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase.server'

export async function POST(req: NextRequest) {
  const auth = await requireRole(['radiographer', 'doctor', 'admin'])
  if (auth.error) return auth.error

  const { id, reason } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing submission id' }, { status: 400 })

  const admin = createAdminClient()

  // Audit before deleting (submission_id will become null after delete — that's fine)
  await admin.from('audit_log').insert({
    user_id:       auth.user.id,
    action:        'submission_deleted',
    submission_id: id,
    detail:        { reason: reason ?? 'No reason given', role: auth.role },
  })

  const { error } = await admin
    .from('patient_submissions')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
