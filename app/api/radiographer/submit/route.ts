import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase.server'
import { generateReport } from '@/lib/generateReport'

export async function POST(req: NextRequest) {
  try {
    // Verify the user is authenticated
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // Verify radiographer role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role, name')
      .eq('user_id', user.id)
      .single()
    if (roleData?.role !== 'radiographer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { id, ...fields } = body

    // Update submission with DXA data using admin client (bypasses RLS for status update)
    const admin = createAdminClient()
    const { data: updated, error: updateError } = await admin
      .from('patient_submissions')
      .update({ ...fields, status: 'pending_doctor' })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    // Log audit event
    await admin.from('audit_log').insert({
      user_id: user.id,
      action: 'radiographer_submitted',
      submission_id: id,
      detail: { radiographer_name: roleData?.name },
    })

    // Trigger AI report generation in the background (direct call — no HTTP)
    generateReport(id).catch(err =>
      console.error('Background report generation failed:', err)
    )

    // Send email notification to doctors
    const { data: config } = await admin
      .from('notification_config')
      .select('recipient_emails')
      .eq('event', 'radiographer_submitted')
      .single()

    const recipientEmails: string[] = config?.recipient_emails ?? []

    if (recipientEmails.length > 0 && process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)

      await resend.emails.send({
        from: process.env.FROM_EMAIL ?? 'noreply@yourpractice.com',
        to: recipientEmails,
        subject: `DXA report ready — ${updated.full_name}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 16px">
            <h2 style="color:#1e3a5f;margin-bottom:8px">DXA report ready for review</h2>
            <p style="color:#475569;margin-bottom:24px">
              A bone density report has been completed by the radiographer and is ready
              for your review.
            </p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
              <tr>
                <td style="padding:8px 0;color:#64748b;font-size:14px;border-bottom:1px solid #f1f5f9">Patient</td>
                <td style="padding:8px 0;font-weight:600;font-size:14px;border-bottom:1px solid #f1f5f9">${updated.full_name}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#64748b;font-size:14px;border-bottom:1px solid #f1f5f9">Patient ID</td>
                <td style="padding:8px 0;font-size:14px;border-bottom:1px solid #f1f5f9">${updated.id_number}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#64748b;font-size:14px">Consultation type</td>
                <td style="padding:8px 0;font-size:14px">${updated.consultation_type?.join(', ')}</td>
              </tr>
            </table>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/doctor/patients/${id}"
               style="display:inline-block;background:#1e3a5f;color:white;text-decoration:none;
                      padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">
              View report
            </a>
            <p style="margin-top:24px;color:#94a3b8;font-size:12px">
              This is an automated notification from your DXA reporting system.
              Do not reply to this email.
            </p>
          </div>
        `,
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Radiographer submit error:', err)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
