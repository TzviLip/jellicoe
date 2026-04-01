import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase.server'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id, action } = await req.json() // action: 'claim' | 'release'
  const admin = createAdminClient()

  if (action === 'release') {
    await admin
      .from('patient_submissions')
      .update({ claimed_by: null, claimed_at: null })
      .eq('id', id)
      .eq('claimed_by', user.id) // only release your own claim
    return NextResponse.json({ success: true })
  }

  // Claim — check if already claimed by someone else (within last 30 min)
  const { data: existing } = await admin
    .from('patient_submissions')
    .select('claimed_by, claimed_at')
    .eq('id', id)
    .single()

  const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  const activeClaim =
    existing?.claimed_by &&
    existing.claimed_by !== user.id &&
    existing.claimed_at > thirtyMinsAgo

  await admin
    .from('patient_submissions')
    .update({ claimed_by: user.id, claimed_at: new Date().toISOString() })
    .eq('id', id)

  // Look up the claiming user's name for the warning message
  let claimerName = 'Another radiographer'
  if (activeClaim) {
    const { data: claimerRole } = await admin
      .from('user_roles')
      .select('name')
      .eq('user_id', existing.claimed_by)
      .single()
    claimerName = claimerRole?.name ?? claimerName
  }

  return NextResponse.json({ success: true, activeClaim, claimerName })
}