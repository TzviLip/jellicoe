import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase.server'
import { getPracticeSettings, buildFullDocumentHtml } from '@/lib/document'

export async function POST(req: NextRequest) {
  const auth = await requireRole(['doctor', 'admin'])
  if (auth.error) return auth.error

  const { report_html, doctor_report, patient_name, patient_id, id } = await req.json()
  if (!id || !patient_name || !patient_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const practiceSettings = await getPracticeSettings()
  const fullHtml = buildFullDocumentHtml({ practiceSettings, report_html, doctor_report, patient_name, patient_id })

  const htmlDocx = await import('html-docx-js/dist/html-docx')
  const docxBuffer: Buffer = htmlDocx.default.asBlob(fullHtml, {
    orientation: 'portrait',
    margins: { top: 1440, right: 1080, bottom: 1440, left: 1080 },
  })

  const admin = createAdminClient()
  await admin.from('audit_log').insert({
    user_id: auth.user.id,
    action: 'doctor_downloaded',
    submission_id: id,
  })

  return new NextResponse(docxBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="DXA_Report_${patient_id}.docx"`,
    },
  })
}
