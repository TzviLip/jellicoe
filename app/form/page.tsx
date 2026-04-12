'use client'

import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Interruption = { duration: string }

type FormData = {
  fullName:                string
  dateOfBirth:             string
  sex:                     string
  ethnicity:               string
  firstMenstrualAge:       string
  lastMenstrualAge:        string
  menstrualInterruptionsYN: string
  menstrualInterruptions:  Interruption[]
  height:                  string
  weight:                  string
  fragilityFractures:      string
  vertebralFractures:      string
  recentBackPain:          string
  additionalRisks:         string[]
  fallsCount:              string
}

const EMPTY: FormData = {
  fullName:                '',
  dateOfBirth:             '',
  sex:                     '',
  ethnicity:               '',
  firstMenstrualAge:       '',
  lastMenstrualAge:        '',
  menstrualInterruptionsYN: '',
  menstrualInterruptions:  [],
  height:                  '',
  weight:                  '',
  fragilityFractures:      '',
  vertebralFractures:      '',
  recentBackPain:          '',
  additionalRisks:         [],
  fallsCount:              '',
}

// Step 4 (menstrual history) is skipped for male patients
// Consultation type is set by the radiographer, not the patient

// ─── Shared UI ────────────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.round(((step - 1) / (total - 1)) * 100)
  return (
    <div className="mb-8">
      <div className="flex justify-between text-xs text-slate-400 mb-2">
        <span>Step {step} of {total}</span>
        <span>{pct}% complete</span>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: '#1e3a5f' }} />
      </div>
    </div>
  )
}

function StepTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-8">
      <h1 className="font-semibold text-slate-800 leading-snug" style={{ fontSize: '1.4em' }}>{title}</h1>
      {hint && <p className="mt-2 text-slate-500" style={{ fontSize: '0.85em' }}>{hint}</p>}
    </div>
  )
}

function NextButton({ onClick, disabled = false, label = 'Continue' }: {
  onClick: () => void; disabled?: boolean; label?: string
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="mt-8 w-full rounded-xl text-white font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ backgroundColor: disabled ? '#94a3b8' : '#1e3a5f', padding: '1em 1.5em', fontSize: '1em' }}>
      {label}
    </button>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="mt-3 w-full rounded-xl text-slate-600 font-medium border border-slate-200 hover:bg-slate-100 transition-colors"
      style={{ padding: '0.75em 1.5em', fontSize: '0.9em' }}>
      Back
    </button>
  )
}

function OptionCard({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left rounded-xl border-2 font-medium transition-all duration-150 ${
        selected ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
      }`}
      style={{ padding: '0.9em 1.2em', fontSize: '1em' }}>
      <span className="flex items-center gap-3">
        <span className={`rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
          selected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
        }`} style={{ width: '1.2em', height: '1.2em' }}>
          {selected && <svg style={{ width: '0.7em', height: '0.7em' }} fill="none" viewBox="0 0 12 12">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>}
        </span>
        {label}
      </span>
    </button>
  )
}

function CheckCard({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left rounded-xl border-2 font-medium transition-all duration-150 ${
        checked ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
      }`}
      style={{ padding: '0.9em 1.2em', fontSize: '1em' }}>
      <span className="flex items-center gap-3">
        <span className={`rounded border-2 flex items-center justify-center flex-shrink-0 ${
          checked ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
        }`} style={{ width: '1.2em', height: '1.2em' }}>
          {checked && <svg style={{ width: '0.7em', height: '0.7em' }} fill="none" viewBox="0 0 12 12">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>}
        </span>
        {label}
      </span>
    </button>
  )
}

function TextInput({ label, value, onChange, type = 'text', placeholder = '', suffix = '' }: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string; suffix?: string
}) {
  return (
    <div>
      <label className="block font-medium text-slate-600 mb-2" style={{ fontSize: '0.9em' }}>{label}</label>
      <div className="relative">
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full rounded-xl border-2 border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
          style={{ padding: '0.85em 1em', fontSize: '1em', paddingRight: suffix ? '3.5em' : undefined }} />
        {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium" style={{ fontSize: '0.85em' }}>{suffix}</span>}
      </div>
    </div>
  )
}

function SelectInput({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]
}) {
  return (
    <div>
      <label className="block font-medium text-slate-600 mb-2" style={{ fontSize: '0.9em' }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl border-2 border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
        style={{ padding: '0.85em 1em', fontSize: '1em' }}>
        <option value="">— Select —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

// ─── Steps ────────────────────────────────────────────────────────────────────

function Step2({ data, update, next, back }: StepProps) {
  return (
    <>
      <StepTitle title="What is your full name?" />
      <TextInput label="Full name" value={data.fullName} onChange={v => update('fullName', v)} placeholder="e.g. Jane Smith" />
      <NextButton onClick={next} disabled={!data.fullName.trim()} />
      <BackButton onClick={back} />
    </>
  )
}

function Step3({ data, update, next, back }: StepProps) {
  const ethnicityOptions = ['White', 'Indian', 'Coloured / Mixed', 'Black']

  const dobError = (() => {
    if (!data.dateOfBirth) return null
    const dob = new Date(data.dateOfBirth)
    if (isNaN(dob.getTime())) return 'Please enter a valid date.'
    if (dob > new Date()) return 'Date of birth cannot be in the future.'
    if (dob < new Date('1900-01-01')) return 'Please enter a realistic date of birth.'
    return null
  })()

  return (
    <>
      <StepTitle title="Tell us a little about yourself." />
      <div className="space-y-5">
        <div>
          <TextInput label="Date of birth" value={data.dateOfBirth} onChange={v => update('dateOfBirth', v)} type="date" />
          {dobError && <p className="mt-2 text-red-600 font-medium" style={{ fontSize: '0.85em' }}>{dobError}</p>}
        </div>
        <div>
          <label className="block font-medium text-slate-600 mb-2" style={{ fontSize: '0.9em' }}>Sex</label>
          <div className="space-y-2">
            {['Male', 'Female', 'Prefer not to say'].map(o => (
              <OptionCard key={o} label={o} selected={data.sex === o} onClick={() => update('sex', o)} />
            ))}
          </div>
        </div>
        <SelectInput label="Ethnicity" value={data.ethnicity} onChange={v => update('ethnicity', v)} options={ethnicityOptions} />
      </div>
      <NextButton onClick={next} disabled={!data.dateOfBirth || !data.sex || !!dobError} />
      <BackButton onClick={back} />
    </>
  )
}

// Step 4 — Menstrual history (shown for female / prefer not to say)
function Step4({ data, update, next, back }: StepProps) {
  const interruptions = data.menstrualInterruptions

  const addInterruption = () => {
    update('menstrualInterruptions', [...interruptions, { duration: '' }])
  }

  const updateInterruption = (i: number, val: string) => {
    const updated = [...interruptions]
    updated[i] = { duration: val }
    update('menstrualInterruptions', updated)
  }

  const removeInterruption = (i: number) => {
    update('menstrualInterruptions', interruptions.filter((_, idx) => idx !== i))
  }

  return (
    <>
      <StepTitle title="Menstrual history" hint="These questions help assess bone density risk factors." />
      <div className="space-y-5">
        <TextInput
          label="Age at first menstrual cycle"
          value={data.firstMenstrualAge}
          onChange={v => update('firstMenstrualAge', v)}
          type="number" placeholder="e.g. 13" suffix="years"
        />
        <TextInput
          label="Age at last menstrual cycle (or current age if still ongoing)"
          value={data.lastMenstrualAge}
          onChange={v => update('lastMenstrualAge', v)}
          type="number" placeholder="e.g. 51" suffix="years"
        />
        <div>
          <label className="block font-medium text-slate-600 mb-2" style={{ fontSize: '0.9em' }}>
            Any interruptions to your menstrual cycle before menopause, other than pregnancy?
          </label>
          <div className="space-y-2">
            {['Yes', 'No'].map(o => (
              <OptionCard key={o} label={o} selected={data.menstrualInterruptionsYN === o}
                onClick={() => {
                  update('menstrualInterruptionsYN', o)
                  if (o === 'No') update('menstrualInterruptions', [])
                }} />
            ))}
          </div>
        </div>

        {data.menstrualInterruptionsYN === 'Yes' && (
          <div className="space-y-3">
            <label className="block font-medium text-slate-600" style={{ fontSize: '0.9em' }}>
              Duration of each interruption
            </label>
            {interruptions.map((item, i) => (
              <div key={i} className="flex gap-2 items-center">
                <div className="flex-1">
                  <TextInput
                    label={`Interruption ${i + 1}`}
                    value={item.duration}
                    onChange={v => updateInterruption(i, v)}
                    placeholder="e.g. 6 months, 2 years"
                  />
                </div>
                <button onClick={() => removeInterruption(i)}
                  className="mt-6 p-2 text-slate-400 hover:text-red-500 transition-colors"
                  title="Remove">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))}
            <button onClick={addInterruption}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              + Add another interruption
            </button>
          </div>
        )}
      </div>
      <NextButton onClick={next} disabled={!data.menstrualInterruptionsYN} />
      <BackButton onClick={back} />
    </>
  )
}

function Step5({ data, update, next, back }: StepProps) {
  const heightVal = parseFloat(data.height)
  const weightVal = parseFloat(data.weight)
  const heightError = data.height && (isNaN(heightVal) || heightVal < 50 || heightVal > 250)
    ? 'Please enter a height between 50 and 250 cm.' : null
  const weightError = data.weight && (isNaN(weightVal) || weightVal < 20 || weightVal > 300)
    ? 'Please enter a weight between 20 and 300 kg.' : null
  const bmi = data.height && data.weight && !heightError && !weightError
    ? (weightVal / Math.pow(heightVal / 100, 2)).toFixed(1) : null
  const canContinue = data.height && data.weight && !heightError && !weightError

  return (
    <>
      <StepTitle title="What is your height and weight?" hint="This helps calculate your BMI automatically." />
      <div className="space-y-4">
        <div>
          <TextInput label="Height" value={data.height} onChange={v => update('height', v)} type="number" placeholder="170" suffix="cm" />
          {heightError && <p className="mt-2 text-red-600 font-medium" style={{ fontSize: '0.85em' }}>{heightError}</p>}
        </div>
        <div>
          <TextInput label="Weight" value={data.weight} onChange={v => update('weight', v)} type="number" placeholder="70" suffix="kg" />
          {weightError && <p className="mt-2 text-red-600 font-medium" style={{ fontSize: '0.85em' }}>{weightError}</p>}
        </div>
        {bmi && (
          <div className="px-4 py-3 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-blue-700" style={{ fontSize: '0.9em' }}>
              Your BMI: <span className="font-semibold">{bmi}</span>
            </p>
          </div>
        )}
      </div>
      <NextButton onClick={next} disabled={!canContinue} />
      <BackButton onClick={back} />
    </>
  )
}

function Step6({ data, update, next, back }: StepProps) {
  return (
    <>
      <StepTitle title="Have you had any fractures or back pain?" hint="Write 'None' if not applicable." />
      <div className="space-y-4">
        <TextInput label="Fragility fractures (site and approximate age)"
          value={data.fragilityFractures} onChange={v => update('fragilityFractures', v)}
          placeholder="e.g. Right wrist, age 68 — or None" />
        <TextInput label="Vertebral fractures (if known)"
          value={data.vertebralFractures} onChange={v => update('vertebralFractures', v)}
          placeholder="e.g. T10, clinical — or None" />
        <div>
          <label className="block font-medium text-slate-600 mb-2" style={{ fontSize: '0.9em' }}>
            Have you experienced recent back pain?
          </label>
          <div className="space-y-2">
            {['Yes', 'No', 'Not sure'].map(o => (
              <OptionCard key={o} label={o} selected={data.recentBackPain === o}
                onClick={() => update('recentBackPain', o)} />
            ))}
          </div>
        </div>
      </div>
      <NextButton onClick={next} disabled={!data.fragilityFractures.trim() || !data.recentBackPain} />
      <BackButton onClick={back} />
    </>
  )
}

function Step7({ data, update, next, back }: StepProps) {
  const risks = [
    'Previous fracture',
    'Parent had a hip fracture',
    'Taking glucocorticoids (steroids) for 3 months or longer',
    'Rheumatoid arthritis',
    'Hypogonadism',
    'Taking aromatase inhibitors or ADT',
    'Malabsorption condition',
    'Chronic kidney disease (CKD)',
    'Diabetes mellitus',
    'Smoking',
    'Alcohol (more than 3 units per day)',
    "Parkinson's disease",
    'Eating disorder',
    'Hormone blockers',
  ]
  const toggle = (v: string) => {
    const current = data.additionalRisks
    update('additionalRisks', current.includes(v) ? current.filter(x => x !== v) : [...current, v])
  }
  return (
    <>
      <StepTitle title="Do any of these apply to you?" hint="Select all that apply. Skip if none apply." />
      <div className="space-y-2">
        {risks.map(r => (
          <CheckCard key={r} label={r} checked={data.additionalRisks.includes(r)} onClick={() => toggle(r)} />
        ))}
      </div>
      <NextButton onClick={next} label="Continue" />
      <BackButton onClick={back} />
    </>
  )
}

function Step8({ data, update, next, back }: StepProps) {
  return (
    <>
      <StepTitle title="How many falls have you had in the past 12 months?" hint="Include any fall, even minor ones." />
      <div className="space-y-2">
        {['0', '1', '2', '3', '4', '5 or more'].map(o => (
          <OptionCard key={o} label={o} selected={data.fallsCount === o} onClick={() => update('fallsCount', o)} />
        ))}
      </div>
      <NextButton onClick={next} disabled={!data.fallsCount} />
      <BackButton onClick={back} />
    </>
  )
}

function StepReview({ data, back, onSubmit, submitting, goToStep }: StepProps & {
  onSubmit: () => void
  submitting: boolean
  goToStep: (step: number) => void
}) {
  const bmi = data.height && data.weight
    ? (parseFloat(data.weight) / Math.pow(parseFloat(data.height) / 100, 2)).toFixed(1) : '—'

  const isMale = data.sex === 'Male'

  // Each row is [label, value, stepToGoTo]
  const rows: [string, string, number][] = [
    ['Full name',            data.fullName,                     2],
    ['Date of birth',        data.dateOfBirth,                  3],
    ['Sex',                  data.sex,                          3],
    ['Ethnicity',            data.ethnicity,                    3],
    ...(!isMale ? [
      ['Age at first period',  data.firstMenstrualAge ? `${data.firstMenstrualAge} years` : '', 4],
      ['Age at last period',   data.lastMenstrualAge  ? `${data.lastMenstrualAge} years`  : '', 4],
      ['Menstrual interruptions', data.menstrualInterruptionsYN === 'Yes'
        ? `Yes — ${data.menstrualInterruptions.map(i => i.duration).filter(Boolean).join(', ') || 'durations not entered'}`
        : data.menstrualInterruptionsYN, 4],
    ] as [string, string, number][] : []),
    ['Height',               data.height ? `${data.height} cm` : '—', 5],
    ['Weight',               data.weight ? `${data.weight} kg` : '—', 5],
    ['BMI',                  bmi,                               5],
    ['Fragility fractures',  data.fragilityFractures,           6],
    ['Vertebral fractures',  data.vertebralFractures,           6],
    ['Recent back pain',     data.recentBackPain,               6],
    ['Additional risks',     data.additionalRisks.length > 0 ? data.additionalRisks.join(', ') : 'None selected', 7],
    ['Falls (past 12 months)', data.fallsCount,                 8],
  ]

  return (
    <>
      <StepTitle title="Please check your answers." hint="Tap any row to edit it." />
      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 mb-2 overflow-hidden">
        {rows.map(([label, value, step]) => (
          <button
            key={label}
            onClick={() => goToStep(step)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors text-left group"
          >
            <span className="text-slate-500 flex-shrink-0 mr-4" style={{ fontSize: '0.85em' }}>{label}</span>
            <span className="font-medium text-slate-800 text-right flex items-center gap-2" style={{ fontSize: '0.85em' }}>
              {value || '—'}
              <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </button>
        ))}
      </div>

      <button onClick={onSubmit} disabled={submitting}
        className="mt-6 w-full rounded-xl text-white font-semibold transition-all duration-150 disabled:opacity-60"
        style={{ backgroundColor: '#1e3a5f', padding: '1em 1.5em', fontSize: '1em' }}>
        {submitting ? 'Submitting...' : 'Submit my information'}
      </button>
      <BackButton onClick={back} />
      <p className="mt-4 text-center text-slate-400" style={{ fontSize: '0.8em' }}>
        By submitting, you consent to your information being stored securely for the purpose of your bone density assessment.
      </p>
    </>
  )
}

// ─── Thank you ────────────────────────────────────────────────────────────────

function ThankYou() {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24">
          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h1 className="font-semibold text-slate-800 mb-3" style={{ fontSize: '1.5em' }}>Thank you</h1>
      <p className="text-slate-500 leading-relaxed max-w-sm mx-auto" style={{ fontSize: '1em' }}>
        Your information has been received securely. Your clinical team will be in touch regarding your bone density assessment.
      </p>
      <p className="mt-6 text-slate-400" style={{ fontSize: '0.85em' }}>You may now close this page.</p>
    </div>
  )
}

// ─── Step props ───────────────────────────────────────────────────────────────

type StepProps = {
  data:   FormData
  update: (key: keyof FormData, value: FormData[keyof FormData]) => void
  next:   () => void
  back:   () => void
}

// ─── Zoom control ─────────────────────────────────────────────────────────────

function ZoomControl({ fontSize, setFontSize }: { fontSize: number; setFontSize: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2 mb-6 p-3 bg-slate-50 rounded-xl border border-slate-200">
      <span className="text-slate-500 text-sm flex-1">Text size</span>
      <div className="flex gap-1">
        {[14, 18, 22].map((size, i) => (
          <button
            key={size}
            onClick={() => setFontSize(size)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              fontSize === size
                ? 'bg-navy-600 text-white'
                : 'text-slate-500 hover:bg-slate-200'
            }`}
            style={{
              fontSize: `${10 + i * 2}px`,
              backgroundColor: fontSize === size ? '#1e3a5f' : undefined,
              color: fontSize === size ? 'white' : undefined,
            }}
          >
            A
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────

export default function FormPage() {
  const [step, setStep]           = useState(2)
  const [data, setData]           = useState<FormData>(EMPTY)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // Default to 18px — larger than the usual 16px, readable for elderly patients
  const [fontSize, setFontSize]   = useState(18)

  const update = (key: keyof FormData, value: FormData[keyof FormData]) => {
    setData(prev => ({ ...prev, [key]: value }))
  }

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'instant' })

  const isMale = data.sex === 'Male'

  // Build the step sequence — skip step 4 (menstrual) for male patients
  const steps = isMale ? [2, 3, 5, 6, 7, 8, 9] : [2, 3, 4, 5, 6, 7, 8, 9]
  const totalVisible = steps.length
  const visibleIndex = steps.indexOf(step)

  const next = () => {
    const nextStep = steps[visibleIndex + 1]
    if (nextStep !== undefined) { setStep(nextStep); scrollTop() }
  }
  const back = () => {
    const prevStep = steps[visibleIndex - 1]
    if (prevStep !== undefined) { setStep(prevStep); scrollTop() }
  }
  const goToStep = (s: number) => { setStep(s); scrollTop() }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        setSubmitted(true)
      } else {
        const body = await res.json().catch(() => ({}))
        alert(`Submission failed: ${body?.error ?? `Server error ${res.status}`}`)
      }
    } catch {
      alert('Could not connect to the server. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) return <ThankYou />

  const props: StepProps = { data, update, next, back }

  return (
    // Font size drives all em-based sizes throughout the form
    <div style={{ fontSize: `${fontSize}px` }}>
      <ZoomControl fontSize={fontSize} setFontSize={setFontSize} />
      <ProgressBar step={visibleIndex + 1} total={totalVisible} />
      <div key={step} className="animate-in fade-in slide-in-from-right-4 duration-200">
        {step === 2 && <Step2 {...props} />}
        {step === 3 && <Step3 {...props} />}
        {step === 4 && <Step4 {...props} />}
        {step === 5 && <Step5 {...props} />}
        {step === 6 && <Step6 {...props} />}
        {step === 7 && <Step7 {...props} />}
        {step === 8 && <Step8 {...props} />}
        {step === 9 && <StepReview {...props} onSubmit={handleSubmit} submitting={submitting} goToStep={goToStep} />}
      </div>
    </div>
  )
}