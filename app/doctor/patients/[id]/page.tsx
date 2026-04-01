'use client'

import { useState, useEffect, useRef, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

// ─── Rich text toolbar ────────────────────────────────────────────────────────

function EditorToolbar({ target }: { target: string }) {
  const exec = (cmd: string, val?: string) => {
    const el = document.getElementById(target)
    if (!el) return
    el.focus()
    document.execCommand(cmd, false, val)
  }

  const Btn = ({ label, cmd, val }: { label: string; cmd: string; val?: string }) => (
    <button
      onClick={() => exec(cmd, val)}
      className="px-3 py-1.5 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
    >
      {label}
    </button>
  )

  return (
    <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-slate-200 bg-slate-50 rounded-t-xl">
      <Btn label="B" cmd="bold" />
      <Btn label="I" cmd="italic" />
      <Btn label="U" cmd="underline" />
      <div className="w-px bg-slate-200 mx-1" />
      <Btn label="H2" cmd="formatBlock" val="<h2>" />
      <Btn label="¶" cmd="formatBlock" val="<p>" />
      <div className="w-px bg-slate-200 mx-1" />
      <Btn label="• List" cmd="insertUnorderedList" />
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Submission = {
  id: string
  full_name: string
  id_number: string
  date_of_birth: string
  status: string
  report_html: string | null
  report_status: string | null
  doctor_report: string | null
  finalised_at: string | null
  consultation_type: string[]
}

// ─── Sanitise HTML (client-side DOMPurify) ────────────────────────────────────

function sanitiseHtml(html: string): string {
  // Strip any validation warning comments before display
  const stripped = html.replace(/<!--[\s\S]*?-->/g, '').trim()

  // Basic tag allowlist — remove anything that could execute
  return stripped
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
}

function hasValidationWarning(html: string): string | null {
  const match = html.match(/<!--\s*VALIDATION WARNING:\s*(.*?)\s*-->/)
  return match ? match[1] : null
}

// ─── Regenerate confirmation modal ────────────────────────────────────────────

function RegenerateModal({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Regenerate report?</h3>
        <p className="text-sm text-slate-500 mb-6">
          This will ask the AI to write a formal clinical letter using the patient data.
          Your clinical commentary will not be affected.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-50"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            {loading ? 'Regenerating...' : 'Regenerate'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Email modal ──────────────────────────────────────────────────────────────

function EmailModal({
  onSend,
  onClose,
}: {
  onSend: (to: string) => Promise<void>
  onClose: () => void
}) {
  const [emailTo, setEmailTo]     = useState('')
  const [sending, setSending]     = useState(false)
  const [sent, setSent]           = useState(false)

  const handleSend = async () => {
    if (!emailTo.trim()) return
    setSending(true)
    await onSend(emailTo.trim())
    setSending(false)
    setSent(true)
    setTimeout(onClose, 1800)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Email this report</h3>
        <p className="text-sm text-slate-500 mb-5">Report will be attached as a .docx file.</p>
        <label className="block text-sm font-medium text-slate-600 mb-2">Recipient email</label>
        <input
          type="email"
          value={emailTo}
          onChange={e => setEmailTo(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="recipient@example.com"
          autoFocus
          className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-800 text-base
                     focus:outline-none focus:border-blue-500 transition-colors mb-4"
        />
        {sent ? (
          <div className="flex items-center gap-2 text-green-700 font-medium py-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sent successfully
          </div>
        ) : (
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !emailTo.trim()}
              className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-50"
              style={{ backgroundColor: '#1e3a5f' }}
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DoctorPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [submission, setSubmission]     = useState<Submission | null>(null)
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [finalised, setFinalised]       = useState(false)
  const [finalising, setFinalising]     = useState(false)

  // Modals
  const [showRegenerate, setShowRegenerate] = useState(false)
  const [regenerating, setRegenerating]     = useState(false)
  const [showEmail, setShowEmail]           = useState(false)

  // Validation warning from AI output
  const [validationWarning, setValidationWarning] = useState<string | null>(null)

  const mainReportRef   = useRef<HTMLDivElement>(null)
  const doctorReportRef = useRef<HTMLDivElement>(null)

  const fmt = (iso: string) =>
    iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

  // ── Load submission ──────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('patient_submissions').select('*').eq('id', id).single()
      if (data) {
        setSubmission(data as Submission)
        setFinalised(data.status === 'complete')
        if (data.report_html) {
          setValidationWarning(hasValidationWarning(data.report_html))
        }
      }
      setLoading(false)
    }
    load()
  }, [id])

  // ── Poll while report is generating ─────────────────────────────────────────

  useEffect(() => {
    if (!submission) return
    const isGenerating = !submission.report_html || submission.report_status === 'generating'
    if (!isGenerating) return

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('patient_submissions')
        .select('report_html, report_status')
        .eq('id', id)
        .single()

      const done = ['ready', 'fallback', 'failed'].includes(data?.report_status ?? '')
      if (done) {
        setSubmission(prev => prev ? {
          ...prev,
          report_html: data?.report_html ?? prev.report_html,
          report_status: data?.report_status ?? prev.report_status,
        } : prev)
        if (data?.report_html) setValidationWarning(hasValidationWarning(data.report_html))
        clearInterval(interval)
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [submission?.report_status, id])

  // ── Save ─────────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setSaving(true)
    await fetch('/api/doctor/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: id,
        report_html: mainReportRef.current?.innerHTML ?? submission?.report_html ?? '',
        doctor_report: doctorReportRef.current?.innerHTML ?? '',
      }),
    })
    setSaving(false)
  }, [id, submission?.report_html])

  // ── Regenerate ───────────────────────────────────────────────────────────────

  const handleRegenerate = async () => {
    setRegenerating(true)
    setShowRegenerate(false)

    // Optimistically show the generating state
    setSubmission(prev => prev ? { ...prev, report_html: null, report_status: 'generating' } : prev)
    setValidationWarning(null)

    const res = await fetch('/api/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionId: id, force: true }),
    })

    setRegenerating(false)

    if (!res.ok) {
      alert('Regeneration failed. Please try again in a moment.')
      // Restore previous state
      setSubmission(prev => prev ? { ...prev, report_status: 'failed' } : prev)
    }
    // Polling useEffect will pick up the new report_html automatically
  }

  // ── Finalise ─────────────────────────────────────────────────────────────────

  const handleFinalise = async () => {
    setFinalising(true)
    await handleSave()
    await fetch('/api/doctor/finalise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id }),
    })
    setFinalised(true)
    setFinalising(false)
  }

  // ── Download ─────────────────────────────────────────────────────────────────

  const handleDownload = async () => {
    await handleSave()
    const res = await fetch('/api/doctor/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: id,
        report_html: mainReportRef.current?.innerHTML ?? submission?.report_html ?? '',
        doctor_report: doctorReportRef.current?.innerHTML ?? submission?.doctor_report ?? '',
        patient_name: submission?.full_name,
        patient_id: submission?.id_number,
      }),
    })
    if (!res.ok) { alert('Download failed. Please try again.'); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `DXA_Report_${submission?.id_number ?? 'report'}.docx`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Email send ────────────────────────────────────────────────────────────────

  const handleSendEmail = async (to: string) => {
    await handleSave()
    const res = await fetch('/api/doctor/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: id,
        to,
        report_html: mainReportRef.current?.innerHTML ?? submission?.report_html ?? '',
        doctor_report: doctorReportRef.current?.innerHTML ?? submission?.doctor_report ?? '',
        patient_name: submission?.full_name,
        patient_id: submission?.id_number,
      }),
    })
    if (!res.ok) throw new Error('Email failed')
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) return <div className="py-20 text-center text-slate-400">Loading report...</div>
  if (!submission) return <div className="py-20 text-center text-slate-400">Report not found.</div>

  const isGenerating = !submission.report_html || submission.report_status === 'generating'
  const isFailed     = submission.report_status === 'failed'
  const isFallback   = submission.report_status === 'fallback'
  const safeHtml     = submission.report_html ? sanitiseHtml(submission.report_html) : ''

  return (
    <div>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/doctor')}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">{submission.full_name}</h1>
            <p className="text-sm text-slate-500">
              ID: {submission.id_number}
              {submission.date_of_birth && ` · DOB: ${fmt(submission.date_of_birth)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={saving || isGenerating}
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-40"
          >
            {saving ? 'Saving...' : 'Save draft'}
          </button>
          <button
            onClick={() => setShowEmail(true)}
            disabled={isGenerating}
            className="px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors disabled:opacity-40"
            style={{ backgroundColor: '#2c5282' }}
          >
            Email report
          </button>
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className="px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors disabled:opacity-40"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            Download .docx
          </button>
        </div>
      </div>

      {/* ── Finalised banner ─────────────────────────────────────────────────── */}
      {finalised && (
        <div className="mb-6 px-5 py-4 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3">
          <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p className="text-sm text-green-800 font-medium">
            Finalised{submission.finalised_at && ` on ${fmt(submission.finalised_at)}`}.
            {' '}You can still edit and re-download.
          </p>
        </div>
      )}

      {/* ── Generating banner ────────────────────────────────────────────────── */}
      {isGenerating && !isFailed && (
        <div className="mb-6 px-5 py-5 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-4">
          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">Generating AI draft report...</p>
            <p className="text-xs text-blue-600 mt-0.5">This usually takes 20–30 seconds. This page updates automatically.</p>
          </div>
        </div>
      )}

      {/* ── Failed banner (no report at all) ──────────────────────────────────── */}
      {isFailed && (
        <div className="mb-6 px-5 py-5 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-red-800">Report generation failed.</p>
            <p className="text-xs text-red-600 mt-0.5">The AI service was unavailable. Try again when ready.</p>
          </div>
          <button
            onClick={() => setShowRegenerate(true)}
            className="px-4 py-2 text-sm font-semibold text-white rounded-xl flex-shrink-0"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            Try again
          </button>
        </div>
      )}

      {/* ── Fallback banner (structured summary shown, AI retry available) ────── */}
      {isFallback && (
        <div className="mb-6 px-5 py-5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-amber-900">AI generation failed — structured summary shown below</p>
            <p className="text-xs text-amber-700 mt-1">
              All clinical data is present and the report can be downloaded or emailed as-is.
              You can retry AI generation when ready — it will replace the summary with a written letter.
            </p>
          </div>
          <button
            onClick={() => setShowRegenerate(true)}
            className="px-4 py-2 text-sm font-semibold text-amber-900 bg-amber-100 border border-amber-300
                       rounded-xl flex-shrink-0 hover:bg-amber-200 transition-colors whitespace-nowrap"
          >
            Retry AI
          </button>
        </div>
      )}

      {/* ── Validation warning ───────────────────────────────────────────────── */}
      {validationWarning && (
        <div className="mb-6 px-5 py-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24">
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800">AI output quality check flagged an issue</p>
              <p className="text-xs text-amber-700 mt-0.5">{validationWarning}</p>
              <p className="text-xs text-amber-600 mt-1">Please review the report carefully before downloading. You can regenerate if needed.</p>
            </div>
          </div>
          <button
            onClick={() => setShowRegenerate(true)}
            className="px-4 py-2 text-sm font-semibold text-amber-800 bg-amber-100 border border-amber-300 rounded-xl flex-shrink-0 hover:bg-amber-200 transition-colors"
          >
            Regenerate
          </button>
        </div>
      )}

      {/* ── AI report editor ─────────────────────────────────────────────────── */}
      {safeHtml && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              {isFallback ? 'Structured summary' : 'AI-generated draft'}
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">Click anywhere to edit</span>
              <button
                onClick={() => setShowRegenerate(true)}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors underline underline-offset-2"
              >
                Regenerate
              </button>
            </div>
          </div>
          <div className="rounded-2xl border-2 border-slate-200 overflow-hidden">
            <EditorToolbar target="main-report-editor" />
            <div
              id="main-report-editor"
              ref={mainReportRef}
              contentEditable
              suppressContentEditableWarning
              dangerouslySetInnerHTML={{ __html: safeHtml }}
              className="min-h-96 px-8 py-6 bg-white text-slate-800 text-sm leading-relaxed focus:outline-none"
              style={{ fontFamily: 'Georgia, serif', lineHeight: '1.8' }}
            />
          </div>
        </div>
      )}

      {/* ── Doctor commentary ────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Your clinical commentary
          </h2>
          <span className="text-xs text-slate-400">Appended to the final document</span>
        </div>
        <div className="rounded-2xl border-2 overflow-hidden" style={{ borderColor: '#1e3a5f' }}>
          <EditorToolbar target="doctor-report-editor" />
          <div
            id="doctor-report-editor"
            ref={doctorReportRef}
            contentEditable
            suppressContentEditableWarning
            dangerouslySetInnerHTML={{
              __html: sanitiseHtml(submission.doctor_report ?? '<p></p>'),
            }}
            className="min-h-48 px-8 py-6 bg-white text-slate-800 text-sm leading-relaxed focus:outline-none"
            style={{ fontFamily: 'Georgia, serif', lineHeight: '1.8' }}
          />
        </div>
      </div>

      {/* ── Finalise button ──────────────────────────────────────────────────── */}
      {!finalised && (
        <button
          onClick={handleFinalise}
          disabled={finalising || isGenerating}
          className="w-full py-4 rounded-xl text-white font-semibold text-base transition-all disabled:opacity-40"
          style={{ backgroundColor: '#1e3a5f' }}
        >
          {finalising ? 'Finalising...' : 'Mark as finalised'}
        </button>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      {showRegenerate && (
        <RegenerateModal
          onConfirm={handleRegenerate}
          onCancel={() => setShowRegenerate(false)}
          loading={regenerating}
        />
      )}

      {showEmail && (
        <EmailModal
          onSend={handleSendEmail}
          onClose={() => setShowEmail(false)}
        />
      )}

    </div>
  )
}