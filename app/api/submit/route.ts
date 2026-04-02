import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase.server'
import { appUrl } from '@/lib/appUrl'

// ─── Rate limiter ─────────────────────────────────────────────────────────────

const rateMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT    = 5
const RATE_WINDOW   = 10 * 60 * 1000

function isRateLimited(ip: string): boolean {
  const now   = Date.now()
  const entry = rateMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return false
  }
  if (entry.count >= RATE_LIMIT) return true
  entry.count++
  return false
}

// ─── Validation ───────────────────────────────────────────────────────────────

type ValidationError = { field: string; message: string }

function validateSubmission(data: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = []

  if (!data.fullName || typeof data.fullName !== 'string' || !data.fullName.trim())
    errors.push({ field: 'fullName', message: 'Full name is required' })
  else if (data.fullName.length > 200)
    errors.push({ field: 'fullName', message: 'Full name is too long' })

  if (!data.idNumber || typeof data.idNumber !== 'string' || !data.idNumber.trim())
    errors.push({ field: 'idNumber', message: 'Patient ID is required' })
  else if (data.idNumber.length > 50)
    errors.push({ field: 'idNumber', message: 'Patient ID is too long' })

  const validTypes = [
    'Initial Assessment', 'Treatment Initiation', 'Follow-up',
    'Complex Secondary Osteoporosis', 'Drug Holiday Review',
  ]
  if (!Array.isArray(data.consultationType) || data.consultationType.length === 0)
    errors.push({ field: 'consultationType', message: 'Consultation type is required' })
  else if (!data.consultationType.every((t: unknown) => validTypes.includes(t as string)))
    errors.push({ field: 'consultationType', message: 'Invalid consultation type' })

  if (data.dateOfBirth) {
    const dob = new Date(data.dateOfBirth as string)
    if (isNaN(dob.getTime()))
      errors.push({ field: 'dateOfBirth', message: 'Invalid date of birth' })
    else if (dob > new Date())
      errors.push({ field: 'dateOfBirth', message: 'Date of birth cannot be in the future' })
    else if (dob < new Date('1900-01-01'))
      errors.push({ field: 'dateOfBirth', message: 'Date of birth is not realistic' })
  }

  if (data.height) {
    const h = parseFloat(data.height as string)
    if (isNaN(h) || h < 50 || h > 250)
      errors.push({ field: 'height', message: 'Height must be between 50 and 250 cm' })
  }

  if (data.weight) {
    const w = parseFloat(data.weight as string)
    if (isNaN(w) || w < 20 || w > 300)
      errors.push({ field: 'weight', message: 'Weight must be between 20 and 300 kg' })
  }

  if (data.additionalRisks && !Array.isArray(data.additionalRisks))
    errors.push({ field: 'additionalRisks', message: 'Invalid risk factors format' })

  for (const field of ['fragilityFractures', 'vertebralFractures', 'ethnicity', 'sex']) {
    if (data[field] && typeof data[field] === 'string' && (data[field] as string).length > 500)
      errors.push({ field, message: `${field} exceeds maximum length` })
  }

  return errors
}

// ─── Handler — PUBLIC route, no auth required ────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip') ?? 'unknown'

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many submissions. Please wait a few minutes and try again.' },
        { status: 429 },
      )
    }

    const data = await req.json()

    const errors = validateSubmission(data)
    if (errors.length > 0) {
      console.error('Validation failed:', JSON.stringify(errors, null, 2))
      return NextResponse.json(
        { error: `Validation failed: ${errors.map((e: ValidationError) => e.message).join(', ')}`, details: errors },
        { status: 400 },
      )
    }

    const admin = createAdminClient()

    const bmi = data.height && data.weight
      ? parseFloat((parseFloat(data.weight) / Math.pow(parseFloat(data.height) / 100, 2)).toFixed(1))
      : null

    const { data: inserted, error } = await admin
      .from('patient_submissions')
      .insert({
        consultation_type:   data.consultationType,
        full_name:           (data.fullName as string).trim(),
        id_number:           (data.idNumber as string).trim(),
        date_of_birth:       data.dateOfBirth || null,
        sex:                 data.sex,
        ethnicity:           data.ethnicity,
        height_cm:           data.height ? parseFloat(data.height) : null,
        weight_kg:           data.weight ? parseFloat(data.weight) : null,
        bmi,
        fragility_fractures: data.fragilityFractures,
        vertebral_fractures: data.vertebralFractures,
        height_loss_cm:      data.heightLoss ? parseFloat(data.heightLoss) : null,
        recent_fracture:     data.recentFracture,
        additional_risks:    data.additionalRisks,
        falls_last_year:     data.fallsCount,
        status:              'pending_radiographer',
        report_status:       'pending',
      })
      .select('id, full_name, id_number')
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      throw error
    }

    // Get radiographer emails: first from notification_config, then fallback to env var
    const radiographerEmails: string[] = []

    const { data: config } = await admin
      .from('notification_config')
      .select('recipient_emails')
      .eq('event', 'patient_submitted')
      .single()

    if (config?.recipient_emails?.length > 0) {
      radiographerEmails.push(...config.recipient_emails)
    } else if (process.env.RADIOGRAPHER_EMAIL) {
      radiographerEmails.push(process.env.RADIOGRAPHER_EMAIL)
    }

    if (radiographerEmails.length > 0 && process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: process.env.FROM_EMAIL ?? 'noreply@yourpractice.com',
        to: radiographerEmails,
        subject: `New patient form — ${inserted.full_name}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 16px">
            <h2 style="color:#1e3a5f;margin-bottom:8px">New patient form received</h2>
            <p style="color:#475569;margin-bottom:24px">
              A patient has completed their assessment form and is awaiting your DXA data entry.
            </p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
              <tr>
                <td style="padding:8px 0;color:#64748b;font-size:14px;border-bottom:1px solid #f1f5f9">Patient</td>
                <td style="padding:8px 0;font-weight:600;font-size:14px;border-bottom:1px solid #f1f5f9">${inserted.full_name}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#64748b;font-size:14px">Patient ID</td>
                <td style="padding:8px 0;font-size:14px">${inserted.id_number}</td>
              </tr>
            </table>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/radiographer/patients/${inserted.id}"
               style="display:inline-block;background:#1e3a5f;color:white;text-decoration:none;
                      padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">
              Open patient record
            </a>
          </div>`,
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Submission error:', err)
    return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 })
  }
}