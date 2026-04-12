'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type Submission = {
  id: string
  full_name: string
  id_number: string
  date_of_birth: string
  sex: string
  ethnicity: string
  height_cm: number
  weight_kg: number
  bmi: number
  consultation_type: string[]
  fragility_fractures: string
  vertebral_fractures: string
  height_loss_cm: number
  recent_fracture: string
  additional_risks: string[]
  falls_last_year: string
  status: string
}

type DxaRow = { bmd: string; tScore: string; zScore: string; pctChange: string; significant: string }
type DxaResults = { l1l4: DxaRow; femoralNeck: DxaRow; totalHip: DxaRow }

const emptyRow = (): DxaRow => ({ bmd: '', tScore: '', zScore: '', pctChange: '', significant: '' })
const emptyDxa = (): DxaResults => ({ l1l4: emptyRow(), femoralNeck: emptyRow(), totalHip: emptyRow() })

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Field({ label, value, onChange, type = 'text', placeholder = '' }: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-800
                   text-base focus:outline-none focus:border-blue-500 transition-colors"
      />
    </div>
  )
}

function Textarea({ label, value, onChange, placeholder = '' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1.5">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-800
                   text-base focus:outline-none focus:border-blue-500 transition-colors resize-none"
      />
    </div>
  )
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-800
                   text-base focus:outline-none focus:border-blue-500 transition-colors"
      >
        <option value="">— Select —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <h3 className="font-semibold text-slate-700 text-base border-b border-slate-100 pb-3">{title}</h3>
      {children}
    </div>
  )
}

// ─── Patient summary (read-only) ──────────────────────────────────────────────

function PatientSummary({ s }: { s: Submission }) {
  const fmt = (iso: string) =>
    iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  const Row = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
    <div className="flex justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value ?? '—'}</span>
    </div>
  )

  return (
    <SectionCard title="Patient information (from patient form)">
      <Row label="Name" value={s.full_name} />
      <Row label="ID" value={s.id_number} />
      <Row label="Date of birth" value={fmt(s.date_of_birth)} />
      <Row label="Sex" value={s.sex} />
      <Row label="Ethnicity" value={s.ethnicity} />
      <Row label="Height" value={s.height_cm ? `${s.height_cm} cm` : '—'} />
      <Row label="Weight" value={s.weight_kg ? `${s.weight_kg} kg` : '—'} />
      <Row label="BMI" value={s.bmi ?? '—'} />
      <Row label="Fragility fractures" value={s.fragility_fractures} />
      <Row label="Vertebral fractures" value={s.vertebral_fractures} />
      <Row label="Recent fracture" value={s.recent_fracture} />
      <Row label="Risk factors" value={s.additional_risks?.join(', ') || 'None'} />
      <Row label="Falls (12 months)" value={s.falls_last_year} />
    </SectionCard>
  )
}

// ─── DXA results table ────────────────────────────────────────────────────────

function DxaTable({ results, onChange }: {
  results: DxaResults
  onChange: (results: DxaResults) => void
}) {
  const rows: { key: keyof DxaResults; label: string }[] = [
    { key: 'l1l4', label: 'L1–L4' },
    { key: 'femoralNeck', label: 'Femoral neck' },
    { key: 'totalHip', label: 'Total hip' },
  ]

  const update = (site: keyof DxaResults, field: keyof DxaRow, val: string) => {
    onChange({ ...results, [site]: { ...results[site], [field]: val } })
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-2 pr-3 font-medium text-slate-500 w-28">Site</th>
            <th className="text-left py-2 pr-3 font-medium text-slate-500">BMD (g/cm²)</th>
            <th className="text-left py-2 pr-3 font-medium text-slate-500">T-score</th>
            <th className="text-left py-2 pr-3 font-medium text-slate-500">Z-score</th>
            <th className="text-left py-2 pr-3 font-medium text-slate-500">% change</th>
            <th className="text-left py-2 font-medium text-slate-500">Significant?</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map(({ key, label }) => (
            <tr key={key}>
              <td className="py-2 pr-3 font-medium text-slate-700">{label}</td>
              {(['bmd', 'tScore', 'zScore', 'pctChange'] as const).map(field => (
                <td key={field} className="py-2 pr-2">
                  <input
                    type="text"
                    value={results[key][field]}
                    onChange={e => update(key, field, e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-800
                               text-sm focus:outline-none focus:border-blue-400 transition-colors"
                    placeholder="—"
                  />
                </td>
              ))}
              <td className="py-2">
                <select
                  value={results[key].significant}
                  onChange={e => update(key, 'significant', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-800
                             text-sm focus:outline-none focus:border-blue-400"
                >
                  <option value="">—</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RadiograherPatient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [submission, setSubmission] = useState<Submission | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]             = useState(false)
  const [saved, setSaved]               = useState(false)
  const [claimWarning, setClaimWarning] = useState<string | null>(null)

  // Section 5 — DXA technical
  const [consultationType, setConsultationType] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [model, setModel] = useState('')
  const [software, setSoftware] = useState('')
  const [referenceDb, setReferenceDb] = useState('')
  const [studyDate, setStudyDate] = useState('')
  const [priorStudyDate, setPriorStudyDate] = useState('')
  const [artefacts, setArtefacts] = useState('')

  // Section 6 — DXA results
  const [dxaResults, setDxaResults] = useState<DxaResults>(emptyDxa())
  const [lowestTScore, setLowestTScore] = useState('')
  const [whoClass, setWhoClass] = useState('')

  // Section 7 — TBS
  const [tbsValue, setTbsValue] = useState('')
  const [tbsInterpretation, setTbsInterpretation] = useState('')
  const [tbsAdjustedFrax, setTbsAdjustedFrax] = useState('')

  // Section 8 — VFA
  const [vfaIndication, setVfaIndication] = useState('')
  const [vfaFractures, setVfaFractures] = useState('')
  const [vfaSummary, setVfaSummary] = useState('')

  // Section 9 — Secondary workup
  const [labSummary, setLabSummary] = useState('')

  // Section 10 — Risk stratification
  const [riskCategory, setRiskCategory] = useState('')
  const [fraxMajorHip, setFraxMajorHip] = useState('')
  const [riskRationale, setRiskRationale] = useState('')

  // Section 11 — Therapeutic strategy
  const [therapeuticStrategy, setTherapeuticStrategy] = useState<string[]>([])
  const [treatmentRationale, setTreatmentRationale] = useState('')

  // Section 12 — Longitudinal plan
  const [repeatDxaYears, setRepeatDxaYears] = useState('')
  const [repeatTbs, setRepeatTbs] = useState('')
  const [monitoringPlan, setMonitoringPlan] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('patient_submissions')
        .select('*')
        .eq('id', id)
        .single()

      if (data) {
        setSubmission(data as Submission)
        // Soft-claim this record — warn if someone else has it open
        fetch('/api/radiographer/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, action: 'claim' }),
        })
          .then(r => r.json())
          .then(res => {
            if (res.activeClaim) {
              setClaimWarning(`${res.claimerName} may currently be editing this record. Proceed carefully.`)
            }
          })
          .catch(() => {})
        // Pre-fill if already started
        setConsultationType(data.consultation_type?.[0] ?? '')
        if (data.dxa_manufacturer) setManufacturer(data.dxa_manufacturer)
        if (data.dxa_model) setModel(data.dxa_model)
        if (data.dxa_software) setSoftware(data.dxa_software)
        if (data.dxa_reference_db) setReferenceDb(data.dxa_reference_db)
        if (data.study_date) setStudyDate(data.study_date)
        if (data.prior_study_date) setPriorStudyDate(data.prior_study_date)
        if (data.dxa_artefacts) setArtefacts(data.dxa_artefacts)
        if (data.dxa_results && Object.keys(data.dxa_results).length) setDxaResults(data.dxa_results as DxaResults)
        if (data.tbs_value) setTbsValue(data.tbs_value)
        if (data.tbs_interpretation) setTbsInterpretation(data.tbs_interpretation)
        if (data.tbs_adjusted_frax) setTbsAdjustedFrax(data.tbs_adjusted_frax)
        if (data.vfa_indication) setVfaIndication(data.vfa_indication)
        if (data.vfa_fractures) setVfaFractures(data.vfa_fractures)
        if (data.vfa_summary) setVfaSummary(data.vfa_summary)
        if (data.lab_summary) setLabSummary(data.lab_summary)
        if (data.risk_category) setRiskCategory(data.risk_category)
        if (data.frax_major_hip) setFraxMajorHip(data.frax_major_hip)
        if (data.risk_rationale) setRiskRationale(data.risk_rationale)
        if (data.therapeutic_strategy) setTherapeuticStrategy(data.therapeutic_strategy)
        if (data.treatment_rationale) setTreatmentRationale(data.treatment_rationale)
        if (data.repeat_dxa_years) setRepeatDxaYears(data.repeat_dxa_years)
        if (data.repeat_tbs) setRepeatTbs(data.repeat_tbs)
        if (data.monitoring_plan) setMonitoringPlan(data.monitoring_plan)
      }
      setLoading(false)
    }
    load()

    // Release claim when leaving the page
    return () => {
      fetch('/api/radiographer/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'release' }),
      }).catch(() => {})
    }
  }, [id])

  const toggleStrategy = (v: string) => {
    setTherapeuticStrategy(prev =>
      prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]
    )
  }

  const handleSubmit = async () => {
    setSaving(true)
    const res = await fetch(`/api/radiographer/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: id,
        dxa_manufacturer: manufacturer,
        dxa_model: model,
        dxa_software: software,
        dxa_reference_db: referenceDb,
        study_date: studyDate || null,
        prior_study_date: priorStudyDate || null,
        dxa_artefacts: artefacts,
        dxa_results: { ...dxaResults, lowestTScore, whoClass },
        tbs_value: tbsValue,
        tbs_interpretation: tbsInterpretation,
        tbs_adjusted_frax: tbsAdjustedFrax,
        vfa_indication: vfaIndication,
        vfa_fractures: vfaFractures,
        vfa_summary: vfaSummary,
        lab_summary: labSummary,
        risk_category: riskCategory,
        frax_major_hip: fraxMajorHip,
        risk_rationale: riskRationale,
        therapeutic_strategy: therapeuticStrategy,
        treatment_rationale: treatmentRationale,
        repeat_dxa_years: repeatDxaYears,
        repeat_tbs: repeatTbs,
        monitoring_plan: monitoringPlan,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => router.push('/radiographer'), 1500)
    } else {
      alert('Something went wrong saving. Please try again.')
    }
  }

  if (loading) {
    return <div className="py-20 text-center text-slate-400">Loading patient...</div>
  }

  if (!submission) {
    return <div className="py-20 text-center text-slate-400">Patient not found.</div>
  }

  if (saved) {
    return (
      <div className="py-20 text-center">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p className="text-lg font-semibold text-slate-700">Submitted — doctors notified</p>
        <p className="text-sm text-slate-400 mt-1">Returning to inbox...</p>
      </div>
    )
  }

  const strategyOptions = [
    'Lifestyle optimisation only',
    'Anti-resorptive first line',
    'Anabolic-first strategy',
    'Sequential therapy plan',
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push('/radiographer')}
          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
        >
          <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-semibold text-slate-800">{submission.full_name}</h1>
          <p className="text-sm text-slate-500">ID: {submission.id_number}{consultationType ? ` · ${consultationType}` : ''}</p>
        </div>
      </div>

      <div className="space-y-6">
        <PatientSummary s={submission} />

        {/* Consultation type */}
        <SectionCard title="Consultation type">
          <Select
            label="What type of consultation is this?"
            value={consultationType}
            onChange={setConsultationType}
            options={['Initial Assessment', 'Treatment Initiation', 'Follow-up', 'Complex Secondary Osteoporosis', 'Drug Holiday Review']}
          />
        </SectionCard>

        {/* Section 5: DXA technical */}
        <SectionCard title="Section 5 — DXA technical details">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Manufacturer" value={manufacturer} onChange={setManufacturer} placeholder="e.g. Hologic" />
            <Field label="Model" value={model} onChange={setModel} placeholder="e.g. Discovery A" />
            <Field label="Software version" value={software} onChange={setSoftware} placeholder="e.g. 13.6" />
            <Field label="Reference database" value={referenceDb} onChange={setReferenceDb} placeholder="e.g. NHANES III" />
            <Field label="Date of study" value={studyDate} onChange={setStudyDate} type="date" />
            <Field label="Prior study date" value={priorStudyDate} onChange={setPriorStudyDate} type="date" />
          </div>
          <Textarea label="Technical limitations / artefacts" value={artefacts} onChange={setArtefacts} placeholder="None, or describe..." />
        </SectionCard>

        {/* Section 6: DXA results */}
        <SectionCard title="Section 6 — DXA results">
          <DxaTable results={dxaResults} onChange={setDxaResults} />
          <div className="grid grid-cols-2 gap-4 mt-2">
            <Field label="Lowest valid T-score" value={lowestTScore} onChange={setLowestTScore} placeholder="e.g. −2.8" />
            <Select
              label="WHO classification"
              value={whoClass}
              onChange={setWhoClass}
              options={['Normal', 'Osteopenia', 'Osteoporosis']}
            />
          </div>
        </SectionCard>

        {/* Section 7: TBS */}
        <SectionCard title="Section 7 — Trabecular Bone Score (TBS)">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Lumbar TBS value" value={tbsValue} onChange={setTbsValue} placeholder="e.g. 1.280" />
            <Select
              label="Interpretation"
              value={tbsInterpretation}
              onChange={setTbsInterpretation}
              options={['Normal', 'Partially degraded', 'Degraded']}
            />
          </div>
          <Field label="TBS-adjusted FRAX (major / hip)" value={tbsAdjustedFrax} onChange={setTbsAdjustedFrax} placeholder="e.g. 18% / 7%" />
        </SectionCard>

        {/* Section 8: VFA */}
        <SectionCard title="Section 8 — Vertebral Fracture Assessment (VFA)">
          <Field label="Indication for VFA" value={vfaIndication} onChange={setVfaIndication} />
          <Textarea label="Fractures identified (level & grade)" value={vfaFractures} onChange={setVfaFractures} placeholder="e.g. T8 grade 1, or None identified" />
          <Select
            label="Summary"
            value={vfaSummary}
            onChange={setVfaSummary}
            options={['No fractures', 'Single mild', 'Multiple moderate/severe']}
          />
        </SectionCard>

        {/* Section 9: Lab summary */}
        <SectionCard title="Section 9 — Secondary osteoporosis workup">
          <Textarea
            label="Laboratory summary (Ca, Vit D, PTH, TSH, Creatinine, SPEP, etc.)"
            value={labSummary}
            onChange={setLabSummary}
            placeholder="Summarise relevant lab results..."
          />
        </SectionCard>

        {/* Section 10: Risk */}
        <SectionCard title="Section 10 — Integrated fracture risk">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Risk category"
              value={riskCategory}
              onChange={setRiskCategory}
              options={['Low', 'Moderate', 'High', 'Very high']}
            />
            <Field label="FRAX (major / hip)" value={fraxMajorHip} onChange={setFraxMajorHip} placeholder="e.g. 22% / 9%" />
          </div>
          <Textarea label="Rationale for risk classification" value={riskRationale} onChange={setRiskRationale} />
        </SectionCard>

        {/* Section 11: Therapeutic */}
        <SectionCard title="Section 11 — Therapeutic strategy">
          <div className="space-y-2">
            {strategyOptions.map(o => (
              <label key={o} className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-slate-200 cursor-pointer hover:border-slate-300 transition-colors">
                <input
                  type="checkbox"
                  checked={therapeuticStrategy.includes(o)}
                  onChange={() => toggleStrategy(o)}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm text-slate-700">{o}</span>
              </label>
            ))}
          </div>
          <Textarea label="Treatment rationale" value={treatmentRationale} onChange={setTreatmentRationale} />
        </SectionCard>

        {/* Section 12: Longitudinal plan */}
        <SectionCard title="Section 12 — Longitudinal plan">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Repeat DXA in (years)" value={repeatDxaYears} onChange={setRepeatDxaYears} placeholder="e.g. 2" />
            <Select label="Repeat TBS" value={repeatTbs} onChange={setRepeatTbs} options={['Yes', 'No']} />
          </div>
          <Textarea label="Monitoring plan" value={monitoringPlan} onChange={setMonitoringPlan} />
        </SectionCard>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full py-4 rounded-xl text-white font-semibold text-base
                     transition-all disabled:opacity-50"
          style={{ backgroundColor: '#1e3a5f' }}
        >
          {saving ? 'Saving & notifying doctors...' : 'Submit and notify doctors'}
        </button>

        <p className="text-xs text-center text-slate-400 pb-4">
          This will mark the record as ready for the doctor and send an email notification.
        </p>
      </div>
    </div>
  )
}