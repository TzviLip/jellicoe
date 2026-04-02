'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import SignOutButton from '@/components/SignOutButton'

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Field({ label, value, onChange, onBlur, placeholder = '', hint = '' }: {
  label: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
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
        onBlur={onBlur}
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
        <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
          {settings.doctors.map((doc, i) => doc.name ? (
            <div key={i}>
              <p className="text-sm font-semibold" style={{ color: '#1e3a5f' }}>{doc.name}</p>
              <p className="text-xs text-slate-400">{settings.practice_sub || 'Subspecialist in Osteoporosis & Bone Health'}</p>
              {doc.number && <p className="text-xs text-slate-400">Practice no: {doc.number}</p>}
            </div>
          ) : null)}
        </div>
      </div>
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Doctor = {
  name:     string
  number:   string
  user_id?: string
  email?:   string   // auto-populated when doctor clicks "This is me"
}

type PracticeSettings = {
  id: string
  practice_name: string
  practice_sub: string
  practice_address: string
  practice_phone: string
  practice_email: string
  practice_number: string
  doctors: Doctor[]
}

const emptySettings = (): PracticeSettings => ({
  id: '',
  practice_name: '',
  practice_sub: 'Subspecialist in Osteoporosis & Bone Health',
  practice_address: '',
  practice_phone:   '',
  practice_email:   '',
  practice_number:  '',
  doctors: [],
})

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading]     = useState(true)
  const [role, setRole]           = useState('')
  const [userName, setUserName]   = useState('')
  const [currentUserId, setCurrentUserId] = useState('')
  const [currentUserEmail, setCurrentUserEmail]             = useState('')
  const [radiographerEmails, setRadiographerEmails]         = useState<string[]>([])

  // Sections
  const [settings, setSettings]                   = useState<PracticeSettings>(emptySettings())
  const [newDoctorName, setNewDoctorName]         = useState('')
  const [newDoctorNumber, setNewDoctorNumber]     = useState('')

  // Staff management
  type StaffMember = { user_id: string; name: string; email: string; role: string }
  const [staff, setStaff]                 = useState<StaffMember[]>([])
  const [staffLoading, setStaffLoading]   = useState(false)
  const [inviteEmail, setInviteEmail]     = useState('')
  const [inviteName, setInviteName]       = useState('')
  const [inviteRole, setInviteRole]       = useState<'doctor' | 'radiographer'>('radiographer')
  const [inviting, setInviting]           = useState(false)
  const [inviteMsg, setInviteMsg]         = useState<{type:'ok'|'err', text:string} | null>(null)
  const [removingId, setRemovingId]       = useState<string | null>(null)

  // Save state per section
  const [savingLetterhead, setSavingLetterhead]           = useState(false)
  const [savedLetterhead, setSavedLetterhead]             = useState(false)

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
      setCurrentUserId(user.id)
      setCurrentUserEmail(user.email ?? '')

      // Load practice settings
      const { data: ps } = await supabase
        .from('practice_settings')
        .select('*')
        .limit(1)
        .single()

      if (ps) {
        const loaded = ps as PracticeSettings
        setSettings({ ...loaded, doctors: loaded.doctors ?? [] })
      }

      // Load notification config
      const { data: nc } = await supabase
        .from('notification_config')
        .select('*')

      nc?.forEach(row => {
      })

      // Load staff list
      setStaffLoading(true)
      const staffRes = await fetch('/api/admin/staff')
      if (staffRes.ok) {
        const staffData = await staffRes.json()
        setStaff(staffData.staff ?? [])
      }
      setStaffLoading(false)

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



  // Silent auto-save for instant actions (doctors, emails)
  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteName.trim()) return
    setInviting(true)
    setInviteMsg(null)
    const res = await fetch('/api/admin/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim(), name: inviteName.trim(), role: inviteRole }),
    })
    const data = await res.json()
    setInviting(false)
    if (res.ok) {
      setInviteMsg({ type: 'ok', text: `Account created for ${inviteName}. They will receive a password setup email.` })
      setInviteEmail('')
      setInviteName('')
      // Refresh staff list
      const staffRes = await fetch('/api/admin/staff')
      if (staffRes.ok) setStaff((await staffRes.json()).staff ?? [])
    } else {
      setInviteMsg({ type: 'err', text: data.error ?? 'Failed to create account.' })
    }
  }

  const handleRemoveStaff = async (user_id: string, name: string) => {
    if (!confirm(`Remove ${name}'s account? They will no longer be able to log in.`)) return
    setRemovingId(user_id)
    const res = await fetch('/api/admin/staff', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id }),
    })
    setRemovingId(null)
    if (res.ok) {
      setStaff(prev => prev.filter(s => s.user_id !== user_id))
    } else {
      const data = await res.json()
      alert(data.error ?? 'Failed to remove account.')
    }
  }

  const autoSaveDoctors = async (newDoctors: typeof settings.doctors) => {
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'letterhead', settings: { ...settings, doctors: newDoctors } }),
    }).catch(console.error)
  }

  const autoSaveRadiographerEmails = async (newEmails: string[]) => {
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'emails', radiographerEmails: newEmails }),
    }).catch(console.error)
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
            Doctor notifications are automatic. Radiographer notifications are managed below.
          </p>

          {/* Doctors — auto from linked accounts */}
          <div className="px-4 py-3 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-sm font-medium text-blue-800 mb-1">Doctors notified when radiographer submits</p>
            {settings.doctors.filter(d => d.user_id && d.email).length > 0 ? (
              <ul className="space-y-1">
                {settings.doctors.filter(d => d.user_id && d.email).map((d, i) => (
                  <li key={i} className="text-sm text-blue-700 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                    {d.name} — {d.email}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-blue-600 italic">
                No doctors linked yet. Go to Doctor signatures below and click "This is me".
              </p>
            )}
          </div>

          {/* Radiographers — manual list, supports multiple */}
          <EmailListEditor
            label="Radiographers notified when patient submits"
            emails={radiographerEmails}
            onChange={emails => {
              setRadiographerEmails(emails)
              autoSaveRadiographerEmails(emails)
            }}
          />
          <p className="text-xs text-slate-400 -mt-2">
            Add all radiographers who should receive new patient notifications.
            Multiple supported.
          </p>

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
            Reports are signed by whoever is logged in when they download or email.
            Add as many doctors as needed.
          </p>

          {settings.doctors.length > 0 && (
            <div className="space-y-3">
              {settings.doctors.map((doc, i) => (
                <div key={i} className="flex items-end gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <Field
                      label="Full name"
                      value={doc.name}
                      onChange={v => {
                        const updated = [...settings.doctors]
                        updated[i] = { ...updated[i], name: v }
                        setSettings(prev => ({ ...prev, doctors: updated }))
                      }}
                      onBlur={() => autoSaveDoctors(settings.doctors)}
                      placeholder="Dr Jane Smith"
                    />
                    <Field
                      label="Practice / registration number"
                      value={doc.number}
                      onChange={v => {
                        const updated = [...settings.doctors]
                        updated[i] = { ...updated[i], number: v }
                        setSettings(prev => ({ ...prev, doctors: updated }))
                      }}
                      onBlur={() => autoSaveDoctors(settings.doctors)}
                      placeholder="e.g. HPCSA 123456"
                    />
                  </div>
                  <div className="flex flex-col items-center gap-2 flex-shrink-0 pb-1">
                    {/* Only show linking UI once currentUserId has loaded */}
                    {currentUserId && doc.user_id === currentUserId ? (
                      <button
                        onClick={() => {
                          const updated = [...settings.doctors]
                          updated[i] = { ...updated[i], user_id: undefined, email: undefined }
                          setSettings(prev => ({ ...prev, doctors: updated }))
                          autoSaveDoctors(updated)
                        }}
                        className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors whitespace-nowrap"
                        title="Click to unlink your account from this entry"
                      >
                        Your account
                      </button>
                    ) : currentUserId ? (
                      <button
                        onClick={() => {
                          const updated = settings.doctors.map((d, idx) =>
                            idx === i
                              ? { ...d, user_id: currentUserId, email: currentUserEmail }
                              : d.user_id === currentUserId
                              ? { ...d, user_id: undefined, email: undefined }
                              : d
                          )
                          setSettings(prev => ({ ...prev, doctors: updated }))
                          autoSaveDoctors(updated)
                        }}
                        className="px-2 py-1 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
                        title="Link this entry to your login account"
                      >
                        This is me
                      </button>
                    ) : null}
                    <button
                      onClick={() => {
                        const updated = settings.doctors.filter((_, idx) => idx !== i)
                        setSettings(prev => ({ ...prev, doctors: updated }))
                        autoSaveDoctors(updated)
                      }}
                      className="text-slate-300 hover:text-red-500 transition-colors"
                      title="Remove"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              {settings.doctors.length === 0 ? 'Add a doctor' : 'Add another doctor'}
            </p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Full name" value={newDoctorName} onChange={setNewDoctorName} placeholder="Dr Jane Smith" />
              <Field label="Registration number" value={newDoctorNumber} onChange={setNewDoctorNumber} placeholder="HPCSA 123456" />
            </div>
            <button
              onClick={() => {
                if (!newDoctorName.trim()) return
                setSettings(prev => ({
                  ...prev,
                  doctors: [...prev.doctors, {
                    name:   newDoctorName.trim(),
                    number: newDoctorNumber.trim(),
                  }],
                }))
                const newDoctors = [...settings.doctors, {
                  name:   newDoctorName.trim(),
                  number: newDoctorNumber.trim(),
                }]
                autoSaveDoctors(newDoctors)
                setNewDoctorName('')
                setNewDoctorNumber('')
              }}
              disabled={!newDoctorName.trim()}
              className="px-4 py-2 text-sm font-medium text-white rounded-xl disabled:opacity-40 transition-all"
              style={{ backgroundColor: '#1e3a5f' }}
            >
              Add doctor
            </button>
          </div>

        </Card>

        {/* ── Live preview ─────────────────────────────────────────────── */}
        <Card title="Document preview">
          <p className="text-sm text-slate-500 -mt-2">
            How the letterhead will appear on downloaded reports.
          </p>
          <LetterheadPreview settings={settings} />
        </Card>

        {/* ── Staff accounts ───────────────────────────────────────────── */}
        <Card title="Staff accounts">
          <p className="text-sm text-slate-500 -mt-2">
            Manage who can log in. Invited staff receive an email to set their password.
          </p>

          {/* Current staff */}
          {staffLoading ? (
            <p className="text-sm text-slate-400">Loading staff...</p>
          ) : (
            <div className="space-y-2">
              {staff.map(s => (
                <div key={s.user_id} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.email} &nbsp;·&nbsp;
                      <span className={`font-medium ${s.role === 'doctor' ? 'text-blue-600' : 'text-teal-600'}`}>
                        {s.role}
                      </span>
                    </p>
                  </div>
                  {s.user_id !== currentUserId && (
                    <button
                      onClick={() => handleRemoveStaff(s.user_id, s.name)}
                      disabled={removingId === s.user_id}
                      className="p-1.5 text-slate-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-40"
                      title="Remove account"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              {staff.length === 0 && (
                <p className="text-sm text-slate-400 italic">No staff accounts yet.</p>
              )}
            </div>
          )}

          {/* Invite new staff */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Invite new staff member</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full name" value={inviteName} onChange={setInviteName} placeholder="Dr Jane Smith" />
              <Field label="Email address" value={inviteEmail} onChange={setInviteEmail} placeholder="jane@practice.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Role</label>
              <div className="flex gap-2">
                {(['radiographer', 'doctor'] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setInviteRole(r)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-colors capitalize ${
                      inviteRole === r
                        ? 'border-blue-600 bg-blue-50 text-blue-800'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {inviteMsg && (
              <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
                inviteMsg.type === 'ok'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {inviteMsg.text}
              </div>
            )}

            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim() || !inviteName.trim()}
              className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-40"
              style={{ backgroundColor: '#1e3a5f' }}
            >
              {inviting ? 'Creating account...' : 'Create account & send invite'}
            </button>
          </div>
        </Card>

      </div>
    </div>
  )
}