import 'server-only'
import { createAdminClient } from './supabase.server'
import { appUrl } from './appUrl'

const MAX_RETRIES = 2

export async function generateReport(submissionId: string): Promise<void> {
  const admin = createAdminClient()

  const { data: s, error } = await admin
    .from('patient_submissions').select('*').eq('id', submissionId).single()
  if (error || !s) throw new Error('Submission not found')

  await admin
    .from('patient_submissions')
    .update({ report_html: null, report_status: 'generating' })
    .eq('id', submissionId)

  let reportHtml: string | null = null
  let attempt = 0

  while (attempt < MAX_RETRIES && !reportHtml) {
    attempt++
    try {
      const raw  = await callClaude(buildPrompt(s))
      const html = markdownToHtml(raw)
      const v    = validateOutput(html, s)

      if (v.ok) {
        reportHtml = html
      } else {
        console.warn(`Report attempt ${attempt} failed validation: ${v.reason}`)
        if (attempt === MAX_RETRIES) {
          reportHtml = `<!-- VALIDATION WARNING: ${v.reason} -->\n${html}`
        }
      }
    } catch (err) {
      console.error(`Report attempt ${attempt} threw:`, err)
    }
  }

  if (!reportHtml) {
    // AI failed — generate a structured fallback so the doctor always has something
    console.warn('AI generation failed — saving structured fallback report')
    const fallback = buildFallbackReport(s)
    await admin
      .from('patient_submissions')
      .update({ report_html: fallback, report_status: 'fallback' })
      .eq('id', submissionId)

    await admin.from('audit_log').insert({
      action: 'ai_report_fallback',
      submission_id: submissionId,
      detail: { attempts: attempt },
    })

    // Notify doctors with a note that it's a structured summary
    await sendDoctorNotification(
      submissionId,
      String(s.full_name ?? ''),
      String(s.id_number ?? ''),
      (s.consultation_type as string[]) ?? [],
      'fallback',
    ).catch((err: unknown) => console.error('Doctor fallback notification failed:', err))
    return
  }

  await admin
    .from('patient_submissions')
    .update({ report_html: reportHtml, report_status: 'ready' })
    .eq('id', submissionId)

  await admin.from('audit_log').insert({
    action: 'ai_report_generated',
    submission_id: submissionId,
    detail: { attempts: attempt },
  })

  // Notify doctors now that the report is actually ready
  await sendDoctorNotification(
    submissionId,
    String(s.full_name ?? ''),
    String(s.id_number ?? ''),
    (s.consultation_type as string[]) ?? [],
    'ready',
  ).catch((err: unknown) => console.error('Doctor notification failed:', err))
}

// ─── Fallback structured report ───────────────────────────────────────────────
// Used when AI is unavailable. Lays out all clinical data in a clean format
// so the doctor can still complete and send the report.

type DxaResults = {
  l1l4?: Record<string, string>
  femoralNeck?: Record<string, string>
  totalHip?: Record<string, string>
  lowestTScore?: string
  whoClass?: string
}

function buildFallbackReport(s: Record<string, unknown>): string {
  const dxa      = ((s.dxa_results ?? {}) as DxaResults)
  const risks    = (s.additional_risks as string[]) ?? []
  const strategy = (s.therapeutic_strategy as string[]) ?? []

  const val = (v: unknown, suffix = '') =>
    (v !== null && v !== undefined && String(v).trim())
      ? `${String(v).trim()}${suffix}`
      : 'Not recorded'

  // Helper: build an HTML table section
  const section = (heading: string, rows: Array<[string, string]>) =>
    `<h2>${heading}</h2>
<table>${rows.map(([l, v]) => `<tr><td>${l}</td><td>${v}</td></tr>`).join('')}</table>`

  const dxaSiteLine = (r?: Record<string, string>): string => {
    if (!r) return 'Not recorded'
    const parts = [
      r.bmd    ? `BMD ${r.bmd} g/cm²`      : null,
      r.tScore ? `T-score ${r.tScore}`      : null,
      r.zScore ? `Z-score ${r.zScore}`      : null,
      r.pctChange ? `Change ${r.pctChange}%` : null,
    ].filter(Boolean)
    return parts.length ? parts.join('  ·  ') : 'Not recorded'
  }

  return [
    // ── Patient information (filled by patient) ───────────────────────────────
    section('Patient information', [
      ['Consultation type',  (s.consultation_type as string[])?.join(', ') || 'Not recorded'],
      ['Full name',          val(s.full_name)],
      ['Date of birth',      val(s.date_of_birth)],
      ['Sex',                val(s.sex)],
      ['Ethnicity',          val(s.ethnicity)],
      ['Height',             val(s.height_cm, ' cm')],
      ['Weight',             val(s.weight_kg, ' kg')],
      ['BMI',                val(s.bmi)],
    ]),

    section('Fracture history', [
      ['Fragility fractures',        val(s.fragility_fractures)],
      ['Vertebral fractures',        val(s.vertebral_fractures)],
      ['Height loss',                val(s.height_loss_cm, ' cm')],
      ['Recent fracture (past year)', val(s.recent_fracture)],
    ]),

    section('Risk factors', [
      ['Additional risks',        risks.length ? risks.join(', ') : 'None reported'],
      ['Falls in past 12 months', val(s.falls_last_year)],
    ]),

    // Divider between patient and radiographer sections
    '<h2 class="section-break">Radiographer Assessment</h2>',

    // ── Radiographer data (filled by radiographer) ────────────────────────────
    section('DXA technical details', [
      ['Manufacturer',      val(s.dxa_manufacturer)],
      ['Model',             val(s.dxa_model)],
      ['Software version',  val(s.dxa_software)],
      ['Reference database', val(s.dxa_reference_db)],
      ['Study date',        val(s.study_date)],
      ['Prior study date',  val(s.prior_study_date)],
      ['Artefacts',         s.dxa_artefacts ? String(s.dxa_artefacts) : 'None'],
    ]),

    section('DXA results', [
      ['L1–L4',             dxaSiteLine(dxa.l1l4)],
      ['Femoral neck',      dxaSiteLine(dxa.femoralNeck)],
      ['Total hip',         dxaSiteLine(dxa.totalHip)],
      ['Lowest T-score',    val(dxa.lowestTScore)],
      ['WHO classification', val(dxa.whoClass)],
    ]),

    section('Trabecular bone score (TBS)', [
      ['TBS value',                     val(s.tbs_value)],
      ['Interpretation',                val(s.tbs_interpretation)],
      ['TBS-adjusted FRAX (major/hip)', val(s.tbs_adjusted_frax)],
    ]),

    section('Vertebral fracture assessment (VFA)', [
      ['Indication',           val(s.vfa_indication)],
      ['Fractures identified',  val(s.vfa_fractures)],
      ['Summary',              val(s.vfa_summary)],
    ]),

    section('Laboratory summary', [
      ['Results', val(s.lab_summary)],
    ]),

    section('Fracture risk stratification', [
      ['Risk category',  val(s.risk_category)],
      ['FRAX (major/hip)', val(s.frax_major_hip)],
      ['Rationale',      val(s.risk_rationale)],
    ]),

    section('Therapeutic strategy', [
      ['Strategy',            strategy.length ? strategy.join(', ') : 'Not recorded'],
      ['Treatment rationale', val(s.treatment_rationale)],
    ]),

    section('Longitudinal plan', [
      ['Repeat DXA',    val(s.repeat_dxa_years, ' years')],
      ['Repeat TBS',    val(s.repeat_tbs)],
      ['Monitoring plan', val(s.monitoring_plan)],
    ]),
  ].join('\n')
}




// ─── Doctor email notification ────────────────────────────────────────────────

async function sendDoctorNotification(
  submissionId: string,
  patientName: string,
  patientId: string,
  consultationType: string[],
  reportStatus: 'ready' | 'fallback',
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return

  const admin = createAdminClient()

  // Read recipient emails from linked doctors in practice_settings
  const { data: ps } = await admin
    .from('practice_settings')
    .select('doctors')
    .limit(1)
    .single()

  type DoctorEntry = { name?: string; email?: string; user_id?: string }
  const doctors: DoctorEntry[] = ps?.doctors ?? []
  const recipients = doctors
    .filter((d: DoctorEntry) => d.user_id && d.email)
    .map((d: DoctorEntry) => d.email as string)

  if (recipients.length === 0) return

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)
  const isFallback = reportStatus === 'fallback'

  await resend.emails.send({
    from: process.env.FROM_EMAIL ?? 'noreply@yourpractice.com',
    to: recipients,
    subject: isFallback
      ? `DXA report ready (structured summary) — ${patientName}`
      : `DXA report ready — ${patientName}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 16px">
        <h2 style="color:#1e3a5f;margin-bottom:8px">DXA report ready for review</h2>
        ${isFallback ? '<p style="color:#92400e;background:#fef3c7;border:1px solid #fde68a;border-radius:6px;padding:10px 14px;font-size:13px;margin-bottom:20px">The AI report could not be generated. A structured summary has been prepared instead.</p>' : ''}
        <p style="color:#475569;margin-bottom:20px">
          The report for <strong>${patientName}</strong> (ID: ${patientId}) is ready.
          Consultation: ${consultationType.join(', ')}
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/doctor/patients/${submissionId}"
           style="display:inline-block;background:#1e3a5f;color:white;text-decoration:none;
                  padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">
          Open report
        </a>
        <p style="margin-top:24px;color:#94a3b8;font-size:12px">
          Automated notification — do not reply.
        </p>
      </div>`,
  })
}

// ─── Claude API call ──────────────────────────────────────────────────────────

async function callClaude(prompt: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!response.ok) throw new Error(`Claude API ${response.status}`)
  const data = await response.json()
  const text: string = data.content?.[0]?.text ?? ''
  if (!text) throw new Error('Empty response from Claude')
  return text
}

// ─── Validation ───────────────────────────────────────────────────────────────

type V = { ok: true } | { ok: false; reason: string }

function validateOutput(html: string, s: Record<string, unknown>): V {
  if (html.replace(/<[^>]+>/g, '').trim().length < 200)
    return { ok: false, reason: 'Output too short — likely truncated' }
  if (!html.includes('<p') && !html.includes('<h2'))
    return { ok: false, reason: 'No HTML structure found' }
  const bad = ['PATIENT DETAILS\n', 'DXA RESULTS\n', 'Write the full formal report']
  for (const b of bad)
    if (html.includes(b)) return { ok: false, reason: 'Prompt text leaked into output' }
  const first = String(s.full_name ?? '').split(' ')[0]
  if (first?.length > 2 && !html.toLowerCase().includes(first.toLowerCase()))
    return { ok: false, reason: `Patient name (${first}) not found in output` }
  return { ok: true }
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(s: Record<string, unknown>): string {
  const dxa = ((s.dxa_results ?? {}) as DxaResults)
  const row = (site: string, r?: Record<string, string>) =>
    r ? `${site}: BMD ${r.bmd ?? '—'} g/cm², T-score ${r.tScore ?? '—'}, Z-score ${r.zScore ?? '—'}, change ${r.pctChange ?? '—'}%, significant: ${r.significant ?? '—'}` : ''

  return `You are a subspecialist in osteoporosis and bone health writing a formal clinical report letter.

CRITICAL INSTRUCTIONS:
- Write in the third person throughout
- Use formal medical language suitable for sending to a GP or specialist colleague
- Do NOT include a salutation or sign-off
- Do NOT reproduce these instructions or any section headings from this prompt
- Output ONLY valid HTML using: <h2>, <p>, <strong>, <ul>, <li>
- Every section must have an <h2> heading, all body text in <p> tags
- Minimum length: 400 words

REQUIRED SECTIONS:
<h2>Clinical background</h2>
<h2>DXA findings</h2>
<h2>Trabecular bone score and fracture risk</h2>
<h2>Vertebral fracture assessment</h2>
<h2>Laboratory investigations</h2>
<h2>Risk stratification and clinical impression</h2>
<h2>Management recommendations</h2>
<h2>Follow-up plan</h2>

PATIENT DATA:
Name: ${s.full_name} | DOB: ${s.date_of_birth} | Sex: ${s.sex} | Ethnicity: ${s.ethnicity}
Height: ${s.height_cm} cm | Weight: ${s.weight_kg} kg | BMI: ${s.bmi}
Consultation: ${(s.consultation_type as string[])?.join(', ')}

FRACTURE HISTORY:
Fragility: ${s.fragility_fractures} | Vertebral: ${s.vertebral_fractures}
Height loss: ${s.height_loss_cm} cm | Recent fracture: ${s.recent_fracture}

RISK FACTORS: ${(s.additional_risks as string[])?.join(', ') || 'None'}
Falls (12 months): ${s.falls_last_year}

DXA: ${s.dxa_manufacturer} ${s.dxa_model} | Date: ${s.study_date} | Prior: ${s.prior_study_date}
Artefacts: ${s.dxa_artefacts || 'None'}
${row('L1–L4', dxa.l1l4)}
${row('Femoral neck', dxa.femoralNeck)}
${row('Total hip', dxa.totalHip)}
Lowest T-score: ${dxa.lowestTScore ?? '—'} | WHO: ${dxa.whoClass ?? '—'}

TBS: ${s.tbs_value} (${s.tbs_interpretation}) | FRAX adjusted: ${s.tbs_adjusted_frax}
VFA: ${s.vfa_indication} | Fractures: ${s.vfa_fractures} | Summary: ${s.vfa_summary}
Labs: ${s.lab_summary || 'Not provided'}

RISK: ${s.risk_category} | FRAX: ${s.frax_major_hip} | Rationale: ${s.risk_rationale}
THERAPY: ${(s.therapeutic_strategy as string[])?.join(', ')} | Rationale: ${s.treatment_rationale}
PLAN: Repeat DXA ${s.repeat_dxa_years} years | TBS: ${s.repeat_tbs} | ${s.monitoring_plan}

Begin with the first <h2> heading. Output only HTML.`
}

// ─── Markdown fallback ────────────────────────────────────────────────────────

function markdownToHtml(text: string): string {
  if (text.trim().startsWith('<')) return text.trim()
  return text
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[^<]+<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    .split(/\n\n+/)
    .map(b => b.startsWith('<') ? b : `<p>${b.replace(/\n/g, ' ')}</p>`)
    .join('\n')
    .trim()
}