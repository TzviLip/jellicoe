import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase.server'

export async function POST(req: NextRequest) {
  const auth = await requireRole(['doctor', 'admin'])
  if (auth.error) return auth.error

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing submission id' }, { status: 400 })

  const admin = createAdminClient()
  await admin
    .from('patient_submissions')
    .update({ status: 'complete', finalised_at: new Date().toISOString(), doctor_id: auth.user.id })
    .eq('id', id)

  await admin.from('audit_log').insert({
    user_id: auth.user.id,
    action: 'doctor_finalised',
    submission_id: id,
  })

  return NextResponse.json({ success: true })
}
