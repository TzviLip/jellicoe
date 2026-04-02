import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase.server'
import { getPracticeSettings, buildDocxBuffer } from '@/lib/document'

export async function POST(req: NextRequest) {
  const auth = await requireRole(['doctor', 'admin'])
  if (auth.error) return auth.error

  const { report_html, doctor_report, patient_name, patient_id, id } = await req.json()
  if (!id || !patient_name || !patient_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const practiceSettings = await getPracticeSettings()
  const buffer = await buildDocxBuffer({
    practiceSettings,
    report_html,
    doctor_report,
    patient_name,
    patient_id,
    signingDoctorId: auth.user.id, // sign as the logged-in doctor
  })

  const admin = createAdminClient()
  await admin.from('audit_log').insert({
    user_id: auth.user.id,
    action: 'doctor_downloaded',
    submission_id: id,
  })

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="DXA_Report_${patient_id}.docx"`,
    },
  })
}
