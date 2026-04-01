// Core report generation logic — importable server-side without HTTP
// Used by both the API route (doctor-triggered) and the radiographer submit route (background)
import 'server-only'
import { createAdminClient } from './supabase.server'

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
    await admin.from('patient_submissions').update({ report_status: 'failed' }).eq('id', submissionId)
    throw new Error('Generation failed after retries')
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
}

// ─── Claude call ──────────────────────────────────────────────────────────────

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
  const dxa = (s.dxa_results as Record<string, Record<string, string>>) ?? {}
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
Lowest T-score: ${(dxa as Record<string, string>).lowestTScore ?? '—'} | WHO: ${(dxa as Record<string, string>).whoClass ?? '—'}

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
