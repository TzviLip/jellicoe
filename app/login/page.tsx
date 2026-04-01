'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError || !data.user) {
      setError('Incorrect email or password. Please try again.')
      setLoading(false)
      return
    }

    // Fetch role to decide where to send the user
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', data.user.id)
      .single()

    if (roleData?.role === 'doctor') {
      router.push('/doctor')
    } else {
      router.push('/radiographer')
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-slate-800">Staff sign in</h1>
          <p className="mt-2 text-sm text-slate-500">Use your practice email and password</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="you@yourpractice.com"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-800
                         text-base focus:outline-none focus:border-blue-500 transition-colors"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-800
                         text-base focus:outline-none focus:border-blue-500 transition-colors"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || !email || !password}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-base
                       transition-all disabled:opacity-40"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>

        <p className="mt-6 text-xs text-center text-slate-400">
          Forgotten your password? Contact your system administrator.
        </p>
      </div>
    </div>
  )
}
