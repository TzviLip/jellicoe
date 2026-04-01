'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import SignOutButton from '@/components/SignOutButton'

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder = '', hint = '' }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-800
                   text-base focus:outline-none focus:border-blue-500 transition-colors"
      />
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <h2 className="font-semibold text-slate-700 text-base border-b border-slate-100 pb-3">{title}</h2>
      {children}
    </div>
  )
}

function SaveButton({ onClick, saving, saved }: {
  onClick: () => void
  saving: boolean
  saved: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50"
      style={{ backgroundColor: saved ? '#16a34a' : '#1e3a5f' }}
    >
      {saving ? 'Saving...' : saved ? 'Saved' : 'Save changes'}
    </button>
  )
}

// ─── Email list editor ────────────────────────────────────────────────────────

function EmailListEditor({
  label,
  emails,
  onChange,
}: {
  label: string
  emails: string[]
  onChange: (emails: string[]) => void
}) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const trimmed = draft.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) return
    if (emails.includes(trimmed)) { setDraft(''); return }
    onChange([...emails, trimmed])
    setDraft('')
  }

  const remove = (email: string) => onChange(emails.filter(e => e !== email))

  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-2">{label}</label>

      {/* Current list */}
      {emails.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {emails.map(email => (
            <span
              key={email}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
                         font-medium bg-blue-50 text-blue-800 border border-blue-200"
            >
              {email}
              <button
                onClick={() => remove(email)}
                className="text-blue-400 hover:text-blue-700 transition-colors leading-none"
                title="Remove"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add new */}
      <div className="flex gap-2">
        <input
          type="email"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="name@practice.com"
          className="flex-1 px-4 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-slate-800
                     text-sm focus:outline-none focus:border-blue-500 transition-colors"
        />
        <button
          onClick={add}
          disabled={!draft.trim()}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-40"
          style={{ backgroundColor: '#1e3a5f' }}
        >
          Add
        </button>
      </div>
    </div>
  )
}

// ─── Letterhead preview ───────────────────────────────────────────────────────

function LetterheadPreview({ settings }: { settings: PracticeSettings }) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Live preview</p>
      </div>
      <div className="p-6 bg-white">
        <div className="border-b-2 pb-4 mb-4" style={{ borderColor: '#1e3a5f' }}>
          <p className="font-bold text-lg" style={{ color: '#1e3a5f', fontFamily: 'Georgia, serif' }}>
            {settings.practice_name || 'Practice name'}
          </p>
          <p className="text-sm text-slate-500 mt-0.5">
            {settings.practice_sub || 'Subspecialty'}
          </p>
          <div className="mt-2 text-xs text-slate-400 space-y-0.5">
            {settings.practice_address && <p>{settings.practice_address}</p>}
            {settings.practice_phone   && <p>Tel: {settings.practice_phone}</p>}
            {settings.practice_email   && <p>{settings.practice_email}</p>}
            {settings.practice_number  && <p>Practice no: {settings.practice_number}</p>}
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="h-2 bg-slate-100 rounded w-3/4" />
          <div className="h-2 bg-slate-100 rounded w-full" />
          <div className="h-2 bg-slate-100 rounded w-5/6" />
        </div>
        {/* Signature preview */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          {settings.doctor1_name && (
            <div className="mb-2">
              <p className="text-sm font-semibold" style={{ color: '#1e3a5f' }}>{settings.doctor1_name}</p>
              <p className="text-xs text-slate-400">Subspecialist in Osteoporosis & Bone Health</p>
              {settings.doctor1_number && <p className="text-xs text-slate-400">Practice no: {settings.doctor1_number}</p>}
            </div>
          )}
          {settings.doctor2_name && (
            <div>
              <p className="text-sm font-semibold" style={{ color: '#1e3a5f' }}>{settings.doctor2_name}</p>
              <p className="text-xs text-slate-400">Subspecialist in Osteoporosis & Bone Health</p>
              {settings.doctor2_number && <p className="text-xs text-slate-400">Practice no: {settings.doctor2_number}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PracticeSettings = {
  id: string
  practice_name: string
  practice_sub: string
  practice_address: string
  practice_phone: string
  practice_email: string
  practice_number: string
  doctor1_name: string
  doctor1_number: string
  doctor2_name: string
  doctor2_number: string
}

const emptySettings = (): PracticeSettings => ({
  id: '',
  practice_name: '',
  practice_sub: 'Subspecialist in Osteoporosis & Bone Health',
  practice_address: '',
  practice_phone: '',
  practice_email: '',
  practice_number: '',
  doctor1_name: '',
  doctor1_number: '',
  doctor2_name: '',
  doctor2_number: '',
})

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading]   = useState(true)
  const [role, setRole]         = useState('')
  const [userName, setUserName] = useState('')

  // Sections
  const [settings, setSettings]                 = useState<PracticeSettings>(emptySettings())
  const [doctorEmails, setDoctorEmails]         = useState<string[]>([])
  const [radiographerEmail, setRadiographerEmail] = useState('')

  // Save state per section
  const [savingLetterhead, setSavingLetterhead] = useState(false)
  const [savedLetterhead, setSavedLetterhead]   = useState(false)
  const [savingEmails, setSavingEmails]         = useState(false)
  const [savedEmails, setSavedEmails]           = useState(false)

  const upd = (key: keyof PracticeSettings) => (val: string) =>
    setSettings(prev => ({ ...prev, [key]: val }))

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role, name')
        .eq('user_id', user.id)
        .single()

      if (!roleData || !['doctor', 'admin'].includes(roleData.role)) {
        router.push('/login')
        return
      }

      setRole(roleData.role)
      setUserName(roleData.name ?? '')

      // Load practice settings
      const { data: ps } = await supabase
        .from('practice_settings')
        .select('*')
        .limit(1)
        .single()

      if (ps) setSettings(ps as PracticeSettings)

      // Load notification config
      const { data: nc } = await supabase
        .from('notification_config')
        .select('*')

      nc?.forEach(row => {
        if (row.event === 'radiographer_submitted') setDoctorEmails(row.recipient_emails ?? [])
        if (row.event === 'patient_submitted')       setRadiographerEmail(row.recipient_emails?.[0] ?? '')
      })

      setLoading(false)
    }
    load()
  }, [])

  const saveLetterhead = async () => {
    setSavingLetterhead(true)
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'letterhead', settings }),
    })
    setSavingLetterhead(false)
    setSavedLetterhead(true)
    setTimeout(() => setSavedLetterhead(false), 2500)
  }

  const saveEmails = async () => {
    setSavingEmails(true)
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'emails',
        doctorEmails,
        radiographerEmail,
      }),
    })
    setSavingEmails(false)
    setSavedEmails(true)
    setTimeout(() => setSavedEmails(false), 2500)
  }

  if (loading) return <div className="py-20 text-center text-slate-400">Loading settings...</div>

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">{userName}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/doctor')}
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200
                       rounded-xl hover:bg-slate-100 transition-colors"
          >
            Back to reports
          </button>
          <SignOutButton />
        </div>
      </div>

      <div className="space-y-6">

        {/* ── Email notifications ─────────────────────────────────────── */}
        <Card title="Email notifications">
          <p className="text-sm text-slate-500 -mt-2">
            Control who receives notifications at each stage of the workflow.
          </p>

          <EmailListEditor
            label="Doctors notified when radiographer submits"
            emails={doctorEmails}
            onChange={setDoctorEmails}
          />

          <Field
            label="Radiographer email (notified when patient submits)"
            value={radiographerEmail}
            onChange={setRadiographerEmail}
            placeholder="radiographer@practice.com"
          />

          <div className="flex justify-end pt-2">
            <SaveButton onClick={saveEmails} saving={savingEmails} saved={savedEmails} />
          </div>
        </Card>

        {/* ── Letterhead ──────────────────────────────────────────────── */}
        <Card title="Letterhead &amp; practice details">
          <p className="text-sm text-slate-500 -mt-2">
            These details appear at the top of every downloaded report.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Practice name"
              value={settings.practice_name}
              onChange={upd('practice_name')}
              placeholder="Bone Density & Osteoporosis Clinic"
            />
            <Field
              label="Sub-heading"
              value={settings.practice_sub}
              onChange={upd('practice_sub')}
              placeholder="Subspecialist in Osteoporosis & Bone Health"
            />
          </div>

          <Field
            label="Address"
            value={settings.practice_address}
            onChange={upd('practice_address')}
            placeholder="123 Harley Street, London W1G 9QD"
          />

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Phone number"
              value={settings.practice_phone}
              onChange={upd('practice_phone')}
              placeholder="020 7XXX XXXX"
            />
            <Field
              label="Practice email"
              value={settings.practice_email}
              onChange={upd('practice_email')}
              placeholder="admin@practice.com"
            />
          </div>

          <Field
            label="Practice number"
            value={settings.practice_number}
            onChange={upd('practice_number')}
            placeholder="e.g. HPCSA / GMC practice number"
          />

          <div className="flex justify-end pt-2">
            <SaveButton onClick={saveLetterhead} saving={savingLetterhead} saved={savedLetterhead} />
          </div>
        </Card>

        {/* ── Doctor signatures ───────────────────────────────────────── */}
        <Card title="Doctor signatures">
          <p className="text-sm text-slate-500 -mt-2">
            Shown at the bottom of every report. Leave blank if not applicable.
          </p>

          <div className="pb-4 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Doctor 1</p>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Full name"
                value={settings.doctor1_name}
                onChange={upd('doctor1_name')}
                placeholder="Dr Jane Smith"
              />
              <Field
                label="Practice / registration number"
                value={settings.doctor1_number}
                onChange={upd('doctor1_number')}
                placeholder="GMC: 1234567"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Doctor 2</p>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Full name"
                value={settings.doctor2_name}
                onChange={upd('doctor2_name')}
                placeholder="Dr John Jones"
              />
              <Field
                label="Practice / registration number"
                value={settings.doctor2_number}
                onChange={upd('doctor2_number')}
                placeholder="GMC: 7654321"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <SaveButton onClick={saveLetterhead} saving={savingLetterhead} saved={savedLetterhead} />
          </div>
        </Card>

        {/* ── Live preview ─────────────────────────────────────────────── */}
        <Card title="Document preview">
          <p className="text-sm text-slate-500 -mt-2">
            How the letterhead will appear on downloaded reports.
          </p>
          <LetterheadPreview settings={settings} />
        </Card>

      </div>
    </div>
  )
}
