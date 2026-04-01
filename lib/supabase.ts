import { createBrowserClient } from '@supabase/ssr'

// Browser client only — safe to import in 'use client' components
// Server-side clients are in lib/supabase.server.ts
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}