import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase.server'
import { generateReport } from '@/lib/generateReport'

export async function POST(req: NextRequest) {
  try {
    // Verify the user is authenticated
    const supabase = await createServerSupabaseClient()
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

    // Email is sent by generateReport() once the report is ready — not here
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Radiographer submit error:', err)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}