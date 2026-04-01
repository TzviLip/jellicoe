import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { generateReport } from '@/lib/generateReport'

// This route is only called by the doctor (force regeneration).
// Background generation from radiographer/submit calls generateReport() directly.
export async function POST(req: NextRequest) {
  const auth = await requireRole(['doctor', 'admin'])
  if (auth.error) return auth.error

  const { submissionId } = await req.json()
  if (!submissionId) return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 })

  try {
    await generateReport(submissionId)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Regeneration failed:', err)
    return NextResponse.json({ error: 'Failed to regenerate report' }, { status: 500 })
  }
}
