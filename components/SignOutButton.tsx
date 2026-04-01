'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function SignOutButton() {
  const router = useRouter()

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
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
