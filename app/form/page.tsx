'use client'

import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type FormData = {
  // Step 1 — Consultation type
  consultationType: string[]

  // Step 2 — Name & ID
  fullName: string
  idNumber: string

  // Step 3 — DOB, sex, ethnicity
  dateOfBirth: string
  sex: string
  ethnicity: string

  // Step 4 — Height & weight
  height: string
  weight: string

  // Step 5 — Fragility fractures
  fragilityFractures: string
  vertebralFractures: string

  // Step 6 — Height loss & recent fracture
  heightLoss: string
  recentFracture: string

  // Step 7 — Additional risks
  additionalRisks: string[]

  // Step 8 — Falls
  fallsCount: string
}

const EMPTY: FormData = {
  consultationType: [],
  fullName: '',
  idNumber: '',
  dateOfBirth: '',
  sex: '',
  ethnicity: '',
  height: '',
  weight: '',
  fragilityFractures: '',
  vertebralFractures: '',
  heightLoss: '',
  recentFracture: '',
  additionalRisks: [],
  fallsCount: '',
}

const TOTAL_STEPS = 9 // 8 data steps + 1 review step

// ─── Shared UI components ─────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  const pct = Math.round(((step - 1) / (TOTAL_STEPS - 1)) * 100)
  return (
    <div className="mb-8">
      <div className="flex justify-between text-xs text-slate-400 mb-2">
        <span>Step {step} of {TOTAL_STEPS}</span>
        <span>{pct}% complete</span>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: '#1e3a5f' }}
        />
      </div>
    </div>
  )
}

function StepTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold text-slate-800 leading-snug">{title}</h1>
      {hint && <p className="mt-2 text-slate-500 text-sm">{hint}</p>}
    </div>
  )
}

function NextButton({
  onClick,
  disabled = false,
  label = 'Continue',
}: {
  onClick: () => void
  disabled?: boolean
  label?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="mt-8 w-full py-4 rounded-xl text-white font-semibold text-base
                 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ backgroundColor: disabled ? '#94a3b8' : '#1e3a5f' }}
    >
      {label}
    </button>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-3 w-full py-3 rounded-xl text-slate-600 font-medium text-sm
                 border border-slate-200 hover:bg-slate-100 transition-colors"
    >
      Back
    </button>
  )
}

function OptionCard({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-5 py-4 rounded-xl border-2 font-medium text-base
                  transition-all duration-150 ${
                    selected
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
    >
      <span className="flex items-center gap-3">
        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
          selected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
        }`}>
          {selected && (
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12">
              <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </span>
        {label}
      </span>
    </button>
  )
}

function CheckCard({
  label,
  checked,
  onClick,
}: {
  label: string
  checked: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-5 py-4 rounded-xl border-2 font-medium text-base
                  transition-all duration-150 ${
                    checked
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
    >
      <span className="flex items-center gap-3">
        <span className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
          checked ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
        }`}>
          {checked && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </span>
        {label}
      </span>
    </button>
  )
}

function TextInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  suffix = '',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  suffix?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-2">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 bg-white
                     text-slate-800 text-base focus:outline-none focus:border-blue-500
                     transition-colors"
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Individual steps ─────────────────────────────────────────────────────────

function Step1({ data, update, next }: StepProps) {
  const options = [
    'Initial Assessment',
    'Treatment Initiation',
    'Follow-up',
    'Complex Secondary Osteoporosis',
    'Drug Holiday Review',
  ]
  const toggle = (v: string) => {
    const current = data.consultationType
    update('consultationType', current.includes(v) ? current.filter(x => x !== v) : [...current, v])
  }
  return (
    <>
      <StepTitle
        title="What type of consultation is this?"
        hint="Select all that apply."
      />
      <div className="space-y-3">
        {options.map(o => (
          <CheckCard
            key={o}
            label={o}
            checked={data.consultationType.includes(o)}
            onClick={() => toggle(o)}
          />
        ))}
      </div>
      <NextButton onClick={next} disabled={data.consultationType.length === 0} />
    </>
  )
}

function Step2({ data, update, next, back }: StepProps) {
  return (
    <>
      <StepTitle title="What is your name and patient ID?" />
      <div className="space-y-4">
        <TextInput
          label="Full name"
          value={data.fullName}
          onChange={v => update('fullName', v)}
          placeholder="e.g. Jane Smith"
        />
        <TextInput
          label="Patient ID number"
          value={data.idNumber}
          onChange={v => update('idNumber', v)}
          placeholder="e.g. 123456"
        />
      </div>
      <NextButton onClick={next} disabled={!data.fullName.trim() || !data.idNumber.trim()} />
      <BackButton onClick={back} />
    </>
  )
}

function Step3({ data, update, next, back }: StepProps) {
  const sexOptions = ['Male', 'Female', 'Prefer not to say']
  return (
    <>
      <StepTitle title="Tell us a little about yourself." />
      <div className="space-y-6">
        <TextInput
          label="Date of birth"
          value={data.dateOfBirth}
          onChange={v => update('dateOfBirth', v)}
          type="date"
        />
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">Sex</label>
          <div className="space-y-2">
            {sexOptions.map(o => (
              <OptionCard
                key={o}
                label={o}
                selected={data.sex === o}
                onClick={() => update('sex', o)}
              />
            ))}
          </div>
        </div>
        <TextInput
          label="Ethnicity"
          value={data.ethnicity}
          onChange={v => update('ethnicity', v)}
          placeholder="e.g. White British"
        />
      </div>
      <NextButton onClick={next} disabled={!data.dateOfBirth || !data.sex} />
      <BackButton onClick={back} />
    </>
  )
}

function Step4({ data, update, next, back }: StepProps) {
  const bmi =
    data.height && data.weight
      ? (parseFloat(data.weight) / Math.pow(parseFloat(data.height) / 100, 2)).toFixed(1)
      : null

  return (
    <>
      <StepTitle
        title="What is your height and weight?"
        hint="This helps calculate your BMI automatically."
      />
      <div className="space-y-4">
        <TextInput
          label="Height"
          value={data.height}
          onChange={v => update('height', v)}
          type="number"
          placeholder="170"
          suffix="cm"
        />
        <TextInput
          label="Weight"
          value={data.weight}
          onChange={v => update('weight', v)}
          type="number"
          placeholder="70"
          suffix="kg"
        />
        {bmi && (
          <div className="px-4 py-3 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-sm text-blue-700">
              Your BMI: <span className="font-semibold">{bmi}</span>
            </p>
          </div>
        )}
      </div>
      <NextButton onClick={next} disabled={!data.height || !data.weight} />
      <BackButton onClick={back} />
    </>
  )
}

function Step5({ data, update, next, back }: StepProps) {
  return (
    <>
      <StepTitle
        title="Have you had any fractures?"
        hint="Include site and approximate age if known. Write 'None' if not applicable."
      />
      <div className="space-y-4">
        <TextInput
          label="Fragility fractures (site and age)"
          value={data.fragilityFractures}
          onChange={v => update('fragilityFractures', v)}
          placeholder="e.g. Right wrist, age 68 — or None"
        />
        <TextInput
          label="Vertebral fractures (if known)"
          value={data.vertebralFractures}
          onChange={v => update('vertebralFractures', v)}
          placeholder="e.g. T10, clinical — or None"
        />
      </div>
      <NextButton onClick={next} disabled={!data.fragilityFractures.trim()} />
      <BackButton onClick={back} />
    </>
  )
}

function Step6({ data, update, next, back }: StepProps) {
  const recentOptions = ['Yes', 'No', 'Not sure']
  return (
    <>
      <StepTitle title="A couple more questions about fractures." />
      <div className="space-y-6">
        <TextInput
          label="Height loss (if known)"
          value={data.heightLoss}
          onChange={v => update('heightLoss', v)}
          type="number"
          placeholder="0"
          suffix="cm"
        />
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">
            Have you had a fracture in the past year?
          </label>
          <div className="space-y-2">
            {recentOptions.map(o => (
              <OptionCard
                key={o}
                label={o}
                selected={data.recentFracture === o}
                onClick={() => update('recentFracture', o)}
              />
            ))}
          </div>
        </div>
      </div>
      <NextButton onClick={next} disabled={!data.recentFracture} />
      <BackButton onClick={back} />
    </>
  )
}

function Step7({ data, update, next, back }: StepProps) {
  const risks = [
    'Previous fracture',
    'Parent had a hip fracture',
    'Taking glucocorticoids (steroids)',
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
      <StepTitle
        title="Do any of these apply to you?"
        hint="Select all that apply. Skip if none apply."
      />
      <div className="space-y-2">
        {risks.map(r => (
          <CheckCard
            key={r}
            label={r}
            checked={data.additionalRisks.includes(r)}
            onClick={() => toggle(r)}
          />
        ))}
      </div>
      <NextButton onClick={next} label="Continue" />
      <BackButton onClick={back} />
    </>
  )
}

function Step8({ data, update, next, back }: StepProps) {
  const options = ['0', '1', '2', '3', '4', '5 or more']
  return (
    <>
      <StepTitle
        title="How many falls have you had in the past 12 months?"
        hint="Include any fall, even minor ones."
      />
      <div className="space-y-2">
        {options.map(o => (
          <OptionCard
            key={o}
            label={o}
            selected={data.fallsCount === o}
            onClick={() => update('fallsCount', o)}
          />
        ))}
      </div>
      <NextButton onClick={next} disabled={!data.fallsCount} />
      <BackButton onClick={back} />
    </>
  )
}

function StepReview({ data, back, onSubmit, submitting }: StepProps & { onSubmit: () => void; submitting: boolean }) {
  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between py-3 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800 text-right max-w-[55%]">{value || '—'}</span>
    </div>
  )

  const bmi =
    data.height && data.weight
      ? (parseFloat(data.weight) / Math.pow(parseFloat(data.height) / 100, 2)).toFixed(1)
      : '—'

  return (
    <>
      <StepTitle
        title="Please check your answers."
        hint="Review everything below before submitting."
      />
      <div className="bg-white rounded-2xl border border-slate-200 px-5 divide-y divide-slate-100 mb-2">
        <Row label="Consultation type" value={data.consultationType.join(', ')} />
        <Row label="Full name" value={data.fullName} />
        <Row label="Patient ID" value={data.idNumber} />
        <Row label="Date of birth" value={data.dateOfBirth} />
        <Row label="Sex" value={data.sex} />
        <Row label="Ethnicity" value={data.ethnicity} />
        <Row label="Height" value={data.height ? `${data.height} cm` : '—'} />
        <Row label="Weight" value={data.weight ? `${data.weight} kg` : '—'} />
        <Row label="BMI" value={bmi} />
        <Row label="Fragility fractures" value={data.fragilityFractures} />
        <Row label="Vertebral fractures" value={data.vertebralFractures} />
        <Row label="Height loss" value={data.heightLoss ? `${data.heightLoss} cm` : '—'} />
        <Row label="Recent fracture (past year)" value={data.recentFracture} />
        <Row
          label="Additional risks"
          value={data.additionalRisks.length > 0 ? data.additionalRisks.join(', ') : 'None selected'}
        />
        <Row label="Falls in past 12 months" value={data.fallsCount} />
      </div>

      <button
        onClick={onSubmit}
        disabled={submitting}
        className="mt-6 w-full py-4 rounded-xl text-white font-semibold text-base
                   transition-all duration-150 disabled:opacity-60"
        style={{ backgroundColor: '#1e3a5f' }}
      >
        {submitting ? 'Submitting...' : 'Submit my information'}
      </button>
      <BackButton onClick={back} />

      <p className="mt-4 text-xs text-center text-slate-400">
        By submitting, you consent to your information being stored securely for the
        purpose of your bone density assessment.
      </p>
    </>
  )
}

// ─── Thank-you screen ─────────────────────────────────────────────────────────

function ThankYou() {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24">
          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h1 className="text-2xl font-semibold text-slate-800 mb-3">Thank you</h1>
      <p className="text-slate-500 text-base leading-relaxed max-w-sm mx-auto">
        Your information has been received securely. Your clinical team will be in touch
        regarding your bone density assessment.
      </p>
      <p className="mt-6 text-sm text-slate-400">You may now close this page.</p>
    </div>
  )
}

// ─── Step props type ──────────────────────────────────────────────────────────

type StepProps = {
  data: FormData
  update: (key: keyof FormData, value: FormData[keyof FormData]) => void
  next: () => void
  back: () => void
}

// ─── Main form ────────────────────────────────────────────────────────────────

export default function FormPage() {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<FormData>(EMPTY)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const update = (key: keyof FormData, value: FormData[keyof FormData]) => {
    setData(prev => ({ ...prev, [key]: value }))
  }

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS))
  const back = () => setStep(s => Math.max(s - 1, 1))

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) setSubmitted(true)
      else alert('Something went wrong. Please try again.')
    } catch {
      alert('Could not connect. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) return <ThankYou />

  const props: StepProps = { data, update, next, back }

  return (
    <div>
      <ProgressBar step={step} />

      <div key={step} className="animate-in fade-in slide-in-from-right-4 duration-200">
        {step === 1 && <Step1 {...props} />}
        {step === 2 && <Step2 {...props} />}
        {step === 3 && <Step3 {...props} />}
        {step === 4 && <Step4 {...props} />}
        {step === 5 && <Step5 {...props} />}
        {step === 6 && <Step6 {...props} />}
        {step === 7 && <Step7 {...props} />}
        {step === 8 && <Step8 {...props} />}
        {step === 9 && (
          <StepReview {...props} onSubmit={handleSubmit} submitting={submitting} />
        )}
      </div>
    </div>
  )
}
