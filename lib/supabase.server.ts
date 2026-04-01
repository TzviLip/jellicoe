// This file is server-only. It must never be imported in 'use client' files.
// The createAdminClient uses SUPABASE_SERVICE_KEY which would be exposed if
// bundled client-side.
import 'server-only'
export { createAdminClient, createServerSupabaseClient } from './supabase'
