import 'server-only'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType,
} from 'docx'
import { createAdminClient } from './supabase.server'

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
  practice_address: '', practice_phone: '', practice_email: '',
  practice_number: '', doctor1_name: '', doctor1_number: '',
  doctor2_name: '', doctor2_number: '',
}

export async function getPracticeSettings(): Promise<PracticeSettings> {
  try {
    const admin = createAdminClient()
    const { data } = await admin.from('practice_settings').select('*').limit(1).single()
    return { ...DEFAULTS, ...data }
  } catch { return DEFAULTS }
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'").trim()
}

function parseInline(html: string): TextRun[] {
  const runs: TextRun[] = []
  const parts = html.split(/(<strong>.*?<\/strong>)/gs)
  for (const part of parts) {
    const bold = part.match(/^<strong>(.*?)<\/strong>$/s)
    if (bold) {
      runs.push(new TextRun({ text: stripTags(bold[1]), bold: true, font: 'Calibri', size: 22 }))
    } else {
      const text = stripTags(part)
      if (text) runs.push(new TextRun({ text, font: 'Calibri', size: 22 }))
    }
  }
  return runs.length ? runs : [new TextRun({ text: '', font: 'Calibri', size: 22 })]
}

function htmlToDocxParagraphs(html: string): Paragraph[] {
  const paragraphs: Paragraph[] = []
  const clean = html.replace(/<!--.*?-->/gs, '').trim()
  const blocks = clean.split(/(?=<h[23])|(?<=<\/h[23]>)|(?=<p)|(?<=<\/p>)|(?=<ul)|(?<=<\/ul>)/).filter(b => b.trim())

  for (const block of blocks) {
    const h2 = block.match(/^<h2[^>]*>(.*?)<\/h2>$/s)
    if (h2) {
      paragraphs.push(new Paragraph({
        text: stripTags(h2[1]), heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 80 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '1e3a5f', space: 4 } },
      })); continue
    }
    const h3 = block.match(/^<h3[^>]*>(.*?)<\/h3>$/s)
    if (h3) {
      paragraphs.push(new Paragraph({
        text: stripTags(h3[1]), heading: HeadingLevel.HEADING_3,
        spacing: { before: 160, after: 60 },
      })); continue
    }
    const p = block.match(/^<p[^>]*>(.*?)<\/p>$/s)
    if (p) {
      paragraphs.push(new Paragraph({
        children: parseInline(p[1]),
        spacing: { after: 120 }, alignment: AlignmentType.JUSTIFIED,
      })); continue
    }
    const ul = block.match(/^<ul>(.*?)<\/ul>$/s)
    if (ul) {
      const items = [...ul[1].matchAll(/<li[^>]*>(.*?)<\/li>/gs)]
      for (const item of items) {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: '• ', font: 'Calibri', size: 22 }), ...parseInline(item[1])],
          spacing: { after: 60 }, indent: { left: 360 },
        }))
      }; continue
    }
    const text = stripTags(block).trim()
    if (text) paragraphs.push(new Paragraph({ children: parseInline(block), spacing: { after: 120 } }))
  }
  return paragraphs
}

function patientInfoTable(patient_name: string, patient_id: string): Table {
  const makeRow = (label: string, value: string) => new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, font: 'Calibri', size: 20, color: '1e3a5f' })] })],
        width: { size: 30, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, fill: 'f8fafc' },
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: value, font: 'Calibri', size: 20 })] })],
        width: { size: 70, type: WidthType.PERCENTAGE },
      }),
    ],
  })
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      makeRow('Patient name', patient_name),
      makeRow('Patient ID', patient_id),
      makeRow('Date', new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })),
    ],
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
  })
}

function buildSignatureBlock(s: PracticeSettings): Paragraph[] {
  const paras: Paragraph[] = [
    new Paragraph({ text: '', spacing: { before: 400 } }),
    new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'cbd5e1', space: 8 } }, text: '', spacing: { after: 120 } }),
  ]
  const addSig = (name: string, number: string) => {
    if (!name) return
    paras.push(new Paragraph({ children: [new TextRun({ text: name, bold: true, font: 'Calibri', size: 22, color: '1e3a5f' })], spacing: { after: 40 } }))
    paras.push(new Paragraph({ children: [new TextRun({ text: s.practice_sub, font: 'Calibri', size: 20, color: '475569' })], spacing: { after: 40 } }))
    if (number) paras.push(new Paragraph({ children: [new TextRun({ text: `Practice no: ${number}`, font: 'Calibri', size: 18, color: '64748b' })], spacing: { after: 160 } }))
  }
  addSig(s.doctor1_name, s.doctor1_number)
  addSig(s.doctor2_name, s.doctor2_number)
  return paras
}

export async function buildDocxBuffer({
  practiceSettings, report_html, doctor_report, patient_name, patient_id,
}: {
  practiceSettings: PracticeSettings
  report_html: string
  doctor_report: string
  patient_name: string
  patient_id: string
}): Promise<Buffer> {
  const s = practiceSettings
  const contactParts = [
    s.practice_address,
    s.practice_phone   ? `Tel: ${s.practice_phone}` : '',
    s.practice_email,
    s.practice_number  ? `Practice no: ${s.practice_number}` : '',
  ].filter(Boolean)

  const children: (Paragraph | Table)[] = []

  // Letterhead
  children.push(new Paragraph({ children: [new TextRun({ text: s.practice_name, bold: true, font: 'Calibri', size: 36, color: '1e3a5f' })], spacing: { after: 60 } }))
  children.push(new Paragraph({ children: [new TextRun({ text: s.practice_sub, font: 'Calibri', size: 22, color: '475569' })], spacing: { after: 40 } }))
  if (contactParts.length) {
    children.push(new Paragraph({ children: [new TextRun({ text: contactParts.join('  ·  '), font: 'Calibri', size: 18, color: '64748b' })], spacing: { after: 0 } }))
  }
  // Navy divider
  children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: '1e3a5f', space: 8 } }, text: '', spacing: { before: 120, after: 240 } }))

  // Patient table
  children.push(patientInfoTable(patient_name, patient_id))
  children.push(new Paragraph({ text: '', spacing: { after: 240 } }))

  // AI report
  if (report_html) children.push(...htmlToDocxParagraphs(report_html))

  // Doctor commentary
  const hasCommentary = doctor_report?.trim() && !doctor_report.includes('Begin typing') && stripTags(doctor_report).trim().length > 0
  if (hasCommentary) {
    children.push(new Paragraph({ text: '', spacing: { before: 240 } }))
    children.push(new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 8, color: '1e3a5f', space: 8 } },
      children: [new TextRun({ text: 'CLINICAL COMMENTARY', font: 'Calibri', size: 18, color: '64748b', bold: true })],
      spacing: { after: 120 },
    }))
    children.push(...htmlToDocxParagraphs(doctor_report))
  }

  // Signature
  children.push(...buildSignatureBlock(s))

  const doc = new Document({
    creator: s.practice_name,
    title: `DXA Report — ${patient_name}`,
    styles: {
      default: { document: { run: { font: 'Calibri', size: 22 } } },
      paragraphStyles: [
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', run: { font: 'Calibri', size: 26, bold: true, color: '1e3a5f' }, paragraph: { spacing: { before: 240, after: 80 } } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', run: { font: 'Calibri', size: 24, bold: true, color: '334155' }, paragraph: { spacing: { before: 160, after: 60 } } },
      ],
    },
    sections: [{
      properties: { page: { margin: { top: 1080, right: 900, bottom: 1080, left: 900 } } },
      children: children as Paragraph[],
    }],
  })

  return Buffer.from(await Packer.toBuffer(doc))
}
