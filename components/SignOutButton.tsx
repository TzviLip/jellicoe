'use client'

import { createClient } from '@/lib/supabase'

export default function SignOutButton() {
  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    // Hard redirect — client-side router.push() doesn't fully reset auth state
    window.location.href = '/login'
  }

  return (
    <button
      onClick={signOut}
      className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200
                 rounded-lg hover:bg-slate-100 transition-colors"
    >
      Sign out
    </button>
  )
}