import { createAdminClient } from './supabase'

export type PracticeSettings = {
  practice_name:    string
  practice_sub:     string
  practice_address: string
  practice_phone:   string
  practice_email:   string
  practice_number:  string
  doctor1_name:     string
  doctor1_number:   string
  doctor2_name:     string
  doctor2_number:   string
}

const DEFAULTS: PracticeSettings = {
  practice_name:    'Bone Density & Osteoporosis Clinic',
  practice_sub:     'Subspecialist in Osteoporosis & Bone Health',
  practice_address: '',
  practice_phone:   '',
  practice_email:   '',
  practice_number:  '',
  doctor1_name:     '',
  doctor1_number:   '',
  doctor2_name:     '',
  doctor2_number:   '',
}

export async function getPracticeSettings(): Promise<PracticeSettings> {
  try {
    const admin = createAdminClient()
    const { data } = await admin.from('practice_settings').select('*').limit(1).single()
    return { ...DEFAULTS, ...data }
  } catch {
    return DEFAULTS
  }
}

export function buildLetterheadHtml(s: PracticeSettings): string {
  const contactLines = [
    s.practice_address,
    s.practice_phone   ? `Tel: ${s.practice_phone}` : '',
    s.practice_email,
    s.practice_number  ? `Practice no: ${s.practice_number}` : '',
  ].filter(Boolean).join(' &nbsp;·&nbsp; ')

  return `
    <div class="letterhead">
      <p class="practice-name">${s.practice_name}</p>
      <p class="practice-sub">${s.practice_sub}</p>
      ${contactLines ? `<p class="practice-contact">${contactLines}</p>` : ''}
    </div>`
}

export function buildSignatureHtml(s: PracticeSettings): string {
  const sig = (name: string, number: string) =>
    name ? `
      <div class="sig-block">
        <p class="sig-name">${name}</p>
        <p class="sig-role">${s.practice_sub}</p>
        ${number ? `<p class="sig-number">Practice no: ${number}</p>` : ''}
      </div>` : ''

  return `
    <div class="signature-section">
      ${sig(s.doctor1_name, s.doctor1_number)}
      ${sig(s.doctor2_name, s.doctor2_number)}
    </div>`
}

export function buildFullDocumentHtml({
  practiceSettings,
  report_html,
  doctor_report,
  patient_name,
  patient_id,
}: {
  practiceSettings: PracticeSettings
  report_html: string
  doctor_report: string
  patient_name: string
  patient_id: string
}): string {
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const letterhead  = buildLetterheadHtml(practiceSettings)
  const signature   = buildSignatureHtml(practiceSettings)
  const hasDoctor   = doctor_report && doctor_report.trim() && !doctor_report.includes('Begin typing')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #1a1a1a; margin: 0; }

  .letterhead { border-bottom: 3pt solid #1e3a5f; padding-bottom: 14pt; margin-bottom: 18pt; }
  .practice-name    { font-size: 17pt; font-weight: bold; color: #1e3a5f; margin: 0 0 3pt; }
  .practice-sub     { font-size: 10pt; color: #475569; margin: 0 0 4pt; }
  .practice-contact { font-size: 9pt;  color: #64748b; margin: 0; }

  .date-line { font-size: 10pt; color: #64748b; margin-bottom: 14pt; }

  .patient-box { border: 1pt solid #cbd5e1; padding: 8pt 12pt; margin-bottom: 18pt; background: #f8fafc; }
  .patient-box p { margin: 2pt 0; font-size: 10pt; }

  h2 { font-size: 12pt; color: #1e3a5f; font-weight: bold; margin: 14pt 0 5pt;
       border-bottom: 0.5pt solid #e2e8f0; padding-bottom: 2pt; }
  h3 { font-size: 11pt; color: #334155; font-weight: bold; margin: 10pt 0 3pt; }
  p  { margin: 0 0 7pt; line-height: 1.65; }
  ul { margin: 3pt 0 7pt 16pt; padding: 0; }
  li { margin-bottom: 2pt; line-height: 1.5; }
  strong { font-weight: bold; }

  .doctor-section { margin-top: 22pt; border-top: 1.5pt solid #1e3a5f; padding-top: 14pt; }
  .doctor-label   { font-size: 9pt; color: #64748b; text-transform: uppercase;
                    letter-spacing: 0.06em; margin-bottom: 8pt; }

  .signature-section { margin-top: 30pt; border-top: 0.5pt solid #cbd5e1; padding-top: 14pt;
                        display: flex; gap: 40pt; }
  .sig-block  { margin: 0; }
  .sig-name   { font-size: 11pt; font-weight: bold; color: #1e3a5f; margin: 0 0 1pt; }
  .sig-role   { font-size: 9pt; color: #475569; margin: 0 0 1pt; }
  .sig-number { font-size: 9pt; color: #64748b; margin: 0; }
</style>
</head>
<body>

${letterhead}

<p class="date-line">${today}</p>

<div class="patient-box">
  <p><strong>Patient name:</strong> ${patient_name}</p>
  <p><strong>Patient ID:</strong> ${patient_id}</p>
</div>

${report_html}

${hasDoctor ? `
<div class="doctor-section">
  <p class="doctor-label">Clinical commentary</p>
  ${doctor_report}
</div>` : ''}

${signature}

</body>
</html>`
}
