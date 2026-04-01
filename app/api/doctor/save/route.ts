import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase.server'

export async function POST(req: NextRequest) {
  const auth = await requireRole(['doctor', 'admin'])
  if (auth.error) return auth.error

  const { id, report_html, doctor_report } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing submission id' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('patient_submissions')
    .update({ report_html, doctor_report })
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Save failed' }, { status: 500 })

  await admin.from('audit_log').insert({
    user_id: auth.user.id,
    action: 'doctor_saved_draft',
    submission_id: id,
  })

  return NextResponse.json({ success: true })
}
