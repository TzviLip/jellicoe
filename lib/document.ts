import 'server-only'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType, type FileChild,
} from 'docx'
import { createAdminClient } from './supabase.server'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Doctor = {
  name:     string
  number:   string
  user_id?: string
  email?:   string
}

export type PracticeSettings = {
  practice_name:    string
  practice_sub:     string
  practice_address: string
  practice_phone:   string
  practice_email:   string
  practice_number:  string
  doctors:          Doctor[]
}

const DEFAULTS: PracticeSettings = {
  practice_name:    'Bone Density & Osteoporosis Clinic',
  practice_sub:     'Subspecialist in Osteoporosis & Bone Health',
  practice_address: '',
  practice_phone:   '',
  practice_email:   '',
  practice_number:  '',
  doctors:          [],
}

export async function getPracticeSettings(): Promise<PracticeSettings> {
  try {
    const admin = createAdminClient()
    const { data } = await admin.from('practice_settings').select('*').limit(1).single()
    if (!data) return DEFAULTS
    return { ...DEFAULTS, ...data, doctors: Array.isArray(data.doctors) ? data.doctors : [] }
  } catch { return DEFAULTS }
}

// ─── HTML helpers ─────────────────────────────────────────────────────────────

// Block-level strip: used for headings, standalone paragraphs — trim is fine
function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&middot;/g, '·').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim()
}

// Inline strip: used inside <p> content — preserve leading/trailing spaces
// so "Name:</strong> Test Name" keeps the space between label and value
function stripTagsInline(html: string): string {
  return html.replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&middot;/g, '·').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ') // collapse multiple spaces but keep single
}

function parseInline(html: string): TextRun[] {
  const runs: TextRun[] = []
  const parts = html.split(/(<strong>.*?<\/strong>)/gs)
  for (const part of parts) {
    const bold = part.match(/^<strong>(.*?)<\/strong>$/s)
    if (bold) {
      // Bold label — trim is fine here
      const text = stripTags(bold[1])
      if (text) runs.push(new TextRun({ text, bold: true, font: 'Calibri', size: 22 }))
    } else {
      // Value after label — use inline strip to preserve leading space
      const text = stripTagsInline(part)
      if (text) runs.push(new TextRun({ text, font: 'Calibri', size: 22 }))
    }
  }
  return runs.length ? runs : [new TextRun({ text: '', font: 'Calibri', size: 22 })]
}

// ─── HTML → docx blocks ───────────────────────────────────────────────────────
// Handles <h2>, <h3>, <p>, <ul>/<li>, and <table>/<tr>/<td>

function dataTable(rows: Array<[string, string]>, shade = true): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    rows: rows.map(([label, value], i) => new TableRow({
      children: [
        new TableCell({
          width: { size: 32, type: WidthType.PERCENTAGE },
          shading: shade && i % 2 === 0
            ? { type: ShadingType.CLEAR, fill: 'f8fafc' }
            : { type: ShadingType.CLEAR, fill: 'ffffff' },
          children: [new Paragraph({
            children: [new TextRun({ text: label, bold: true, font: 'Calibri', size: 20, color: '475569' })],
          })],
        }),
        new TableCell({
          width: { size: 68, type: WidthType.PERCENTAGE },
          shading: shade && i % 2 === 0
            ? { type: ShadingType.CLEAR, fill: 'f8fafc' }
            : { type: ShadingType.CLEAR, fill: 'ffffff' },
          children: [new Paragraph({
            children: [new TextRun({ text: value || '—', font: 'Calibri', size: 20, color: '1a202c' })],
          })],
        }),
      ],
    })),
  })
}

function sectionHeading(text: string, color = '1e3a5f'): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, font: 'Calibri', size: 24, color })],
    spacing: { before: 280, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color, space: 4 } },
  })
}

function dividerParagraph(label: string): FileChild[] {
  return [
    new Paragraph({ text: '', spacing: { before: 200 } }),
    new Paragraph({
      children: [new TextRun({ text: `— ${label} —`, bold: true, font: 'Calibri', size: 20, color: '94a3b8' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
    }),
  ]
}

export function htmlToDocxBlocks(html: string): FileChild[] {
  const blocks: FileChild[] = []
  const clean = html.replace(/<!--[\s\S]*?-->/g, '').trim()

  // Split into top-level block elements
  const topBlocks = clean.split(/(?=<(?:h[23]|p|ul|table)[^>]*>)/).filter(b => b.trim())

  for (const block of topBlocks) {

    // H2 section heading
    const h2 = block.match(/^<h2[^>]*>([\s\S]*?)<\/h2>/)
    if (h2) {
      blocks.push(sectionHeading(stripTags(h2[1])))
      continue
    }

    // H3 sub-heading
    const h3 = block.match(/^<h3[^>]*>([\s\S]*?)<\/h3>/)
    if (h3) {
      blocks.push(new Paragraph({
        children: [new TextRun({ text: stripTags(h3[1]), bold: true, font: 'Calibri', size: 22, color: '334155' })],
        spacing: { before: 160, after: 60 },
      }))
      continue
    }

    // Paragraph (may contain <strong> for label: value pairs)
    const p = block.match(/^<p[^>]*>([\s\S]*?)<\/p>/)
    if (p) {
      blocks.push(new Paragraph({
        children: parseInline(p[1]),
        spacing: { after: 100 },
      }))
      continue
    }

    // Unordered list
    const ul = block.match(/^<ul>([\s\S]*?)<\/ul>/)
    if (ul) {
      const items = [...ul[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)]
      for (const item of items) {
        blocks.push(new Paragraph({
          children: [new TextRun({ text: '•  ', font: 'Calibri', size: 22, color: '475569' }), ...parseInline(item[1])],
          spacing: { after: 60 }, indent: { left: 360 },
        }))
      }
      continue
    }

    // Table — convert <tr><td>Label</td><td>Value</td></tr> to a styled 2-col table
    if (block.trim().startsWith('<table')) {
      const rows = [...block.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
      const pairs: Array<[string, string]> = []
      for (const row of rows) {
        const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
        if (cells.length >= 2) {
          pairs.push([stripTags(cells[0][1]), stripTags(cells[1][1])])
        }
      }
      if (pairs.length > 0) blocks.push(dataTable(pairs))
      continue
    }

    // Fallback plain text
    const text = stripTags(block)
    if (text) blocks.push(new Paragraph({ children: [new TextRun({ text, font: 'Calibri', size: 22 })], spacing: { after: 100 } }))
  }

  return blocks
}

// ─── Patient info header table ────────────────────────────────────────────────

function patientInfoTable(patient_name: string, patient_id: string): Table {
  return dataTable([
    ['Patient name', patient_name],
    ['Patient ID',   patient_id],
    ['Date',         new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })],
  ], true)
}

// ─── Signature block ──────────────────────────────────────────────────────────

function buildSignatureBlock(s: PracticeSettings, signingDoctorId?: string): Paragraph[] {
  const paras: Paragraph[] = [
    new Paragraph({ text: '', spacing: { before: 400 } }),
    new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'cbd5e1', space: 8 } }, text: '', spacing: { after: 120 } }),
  ]
  const signingDoctor = signingDoctorId ? s.doctors.find(d => d.user_id === signingDoctorId) : undefined
  const doctorsToShow = signingDoctor ? [signingDoctor] : s.doctors

  for (const doctor of doctorsToShow) {
    if (!doctor?.name) continue
    paras.push(new Paragraph({ children: [new TextRun({ text: doctor.name, bold: true, font: 'Calibri', size: 22, color: '1e3a5f' })], spacing: { after: 40 } }))
    paras.push(new Paragraph({ children: [new TextRun({ text: s.practice_sub, font: 'Calibri', size: 20, color: '475569' })], spacing: { after: 40 } }))
    if (doctor.number) paras.push(new Paragraph({ children: [new TextRun({ text: `Practice no: ${doctor.number}`, font: 'Calibri', size: 18, color: '64748b' })], spacing: { after: 160 } }))
  }
  return paras
}

// ─── Main document builder ────────────────────────────────────────────────────

export async function buildDocxBuffer({
  practiceSettings, report_html, doctor_report, patient_name, patient_id, signingDoctorId,
}: {
  practiceSettings: PracticeSettings
  report_html:      string
  doctor_report:    string
  patient_name:     string
  patient_id:       string
  signingDoctorId?: string
}): Promise<Buffer> {
  const s = practiceSettings
  const contactParts = [
    s.practice_address,
    s.practice_phone  ? `Tel: ${s.practice_phone}` : '',
    s.practice_email,
    s.practice_number ? `Practice no: ${s.practice_number}` : '',
  ].filter(Boolean)

  const children: FileChild[] = []

  // Letterhead
  children.push(new Paragraph({ children: [new TextRun({ text: s.practice_name || 'Bone Density & Osteoporosis Clinic', bold: true, font: 'Calibri', size: 36, color: '1e3a5f' })], spacing: { after: 60 } }))
  children.push(new Paragraph({ children: [new TextRun({ text: s.practice_sub, font: 'Calibri', size: 22, color: '475569' })], spacing: { after: 40 } }))
  if (contactParts.length) {
    children.push(new Paragraph({ children: [new TextRun({ text: contactParts.join('  ·  '), font: 'Calibri', size: 18, color: '64748b' })], spacing: { after: 0 } }))
  }
  children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: '1e3a5f', space: 8 } }, text: '', spacing: { before: 120, after: 240 } }))

  // Patient header table
  children.push(patientInfoTable(patient_name, patient_id))
  children.push(new Paragraph({ text: '', spacing: { after: 240 } }))

  // Report body (AI letter or fallback structured summary)
  if (report_html) children.push(...htmlToDocxBlocks(report_html))

  // Doctor commentary
  const hasCommentary = doctor_report?.trim() &&
    !doctor_report.includes('Begin typing') &&
    stripTags(doctor_report).trim().length > 0
  if (hasCommentary) {
    children.push(new Paragraph({ text: '', spacing: { before: 240 } }))
    children.push(new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 8, color: '1e3a5f', space: 8 } },
      children: [new TextRun({ text: 'CLINICAL COMMENTARY', font: 'Calibri', size: 18, color: '64748b', bold: true })],
      spacing: { after: 120 },
    }))
    children.push(...htmlToDocxBlocks(doctor_report))
  }

  // Signature
  children.push(...buildSignatureBlock(s, signingDoctorId))

  const doc = new Document({
    creator: s.practice_name,
    title:   `DXA Report — ${patient_name}`,
    sections: [{
      properties: { page: { margin: { top: 1080, right: 900, bottom: 1080, left: 900 } } },
      children,
    }],
  })

  return Buffer.from(await Packer.toBuffer(doc))
}