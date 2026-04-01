import { createServerSupabaseClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SignOutButton from '@/components/SignOutButton'

function StatusBadge({ status }: { status: string }) {
  if (status === 'pending_radiographer') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Awaiting your review
      </span>
    )
  }
  if (status === 'pending_doctor') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        With doctor
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
      Complete
    </span>
  )
}

export default async function RadiograherInbox() {
  const supabase = createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check role
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role, name')
    .eq('user_id', user.id)
    .single()

  if (roleData?.role !== 'radiographer') redirect('/login')

  // Fetch all submissions, most recent first
  const { data: submissions } = await supabase
    .from('patient_submissions')
    .select('id, created_at, full_name, id_number, status, consultation_type, date_of_birth')
    .order('created_at', { ascending: false })

  const pending = submissions?.filter(s => s.status === 'pending_radiographer') ?? []
  const others = submissions?.filter(s => s.status !== 'pending_radiographer') ?? []

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Patient inbox</h1>
          <p className="text-sm text-slate-500 mt-1">Welcome back, {roleData?.name ?? 'Radiographer'}</p>
        </div>
        <SignOutButton />
      </div>

      {/* Pending section */}
      {pending.length > 0 ? (
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-base font-semibold text-slate-700">Awaiting your review</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
              {pending.length}
            </span>
          </div>
          <div className="space-y-3">
            {pending.map(s => (
              <Link
                key={s.id}
                href={`/radiographer/patients/${s.id}`}
                className="block bg-white border-2 border-amber-200 rounded-2xl px-6 py-5
                           hover:border-amber-400 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800 text-lg">{s.full_name}</p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      ID: {s.id_number}
                      {s.date_of_birth && ` · DOB: ${fmt(s.date_of_birth)}`}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Submitted {fmt(s.created_at)} · {s.consultation_type?.join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={s.status} />
                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24">
                      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <div className="mb-10 bg-green-50 border border-green-100 rounded-2xl px-6 py-8 text-center">
          <p className="text-green-700 font-medium">All caught up — no patients awaiting review.</p>
        </div>
      )}

      {/* All other submissions */}
      {others.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-slate-700 mb-4">Recent submissions</h2>
          <div className="space-y-2">
            {others.map(s => (
              <Link
                key={s.id}
                href={`/radiographer/patients/${s.id}`}
                className="flex items-center justify-between bg-white border border-slate-200
                           rounded-xl px-5 py-4 hover:border-slate-300 transition-all"
              >
                <div>
                  <p className="font-medium text-slate-700">{s.full_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">ID: {s.id_number} · {fmt(s.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={s.status} />
                  <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24">
                    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
