'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteSubmissionButton({
  id,
  patientName,
}: {
  id: string
  patientName: string
}) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [reason, setReason]       = useState('')
  const [deleting, setDeleting]   = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    const res = await fetch('/api/submission/delete', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id, reason }),
    })
    setDeleting(false)
    if (res.ok) {
      setShowModal(false)
      router.refresh()
    } else {
      alert('Failed to delete. Please try again.')
    }
  }

  return (
    <>
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setShowModal(true) }}
        className="p-1.5 text-slate-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
        title="Delete submission"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800 mb-1">Delete submission?</h3>
            <p className="text-sm text-slate-500 mb-5">
              This will permanently delete <strong>{patientName}</strong>'s submission.
              This action cannot be undone.
            </p>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              Reason <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. duplicate entry, test submission"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-800
                         text-sm focus:outline-none focus:border-red-400 transition-colors mb-5"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600
                           font-medium text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold
                           text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
