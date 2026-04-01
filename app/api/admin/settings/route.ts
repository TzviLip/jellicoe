import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase.server'

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Only doctors and admins can change settings
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!roleData || !['doctor', 'admin'].includes(roleData.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const admin = createAdminClient()

  if (body.type === 'letterhead') {
    // Update practice_settings (upsert the single row)
    const { settings } = body
    const { error } = await admin
      .from('practice_settings')
      .update({
        practice_name:    settings.practice_name,
        practice_sub:     settings.practice_sub,
        practice_address: settings.practice_address,
        practice_phone:   settings.practice_phone,
        practice_email:   settings.practice_email,
        practice_number:  settings.practice_number,
        doctor1_name:     settings.doctor1_name,
        doctor1_number:   settings.doctor1_number,
        doctor2_name:     settings.doctor2_name,
        doctor2_number:   settings.doctor2_number,
        updated_at:       new Date().toISOString(),
      })
      .eq('id', settings.id)

    if (error) {
      console.error('Settings save error:', error)
      return NextResponse.json({ error: 'Save failed' }, { status: 500 })
    }
  }

  if (body.type === 'emails') {
    const { doctorEmails, radiographerEmail } = body

    // Update doctor notification emails
    await admin
      .from('notification_config')
      .upsert({
        event: 'radiographer_submitted',
        recipient_emails: doctorEmails,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'event' })

    // Update radiographer notification email
    await admin
      .from('notification_config')
      .upsert({
        event: 'patient_submitted',
        recipient_emails: radiographerEmail ? [radiographerEmail] : [],
        updated_at: new Date().toISOString(),
      }, { onConflict: 'event' })
  }

  await admin.from('audit_log').insert({
    user_id: user.id,
    action: 'admin_settings_updated',
    detail: { type: body.type },
  })

  return NextResponse.json({ success: true })
}
