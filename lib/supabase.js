import { createClient } from '@supabase/supabase-js'

// Prefer server-side SERVICE_ROLE key for server APIs (more permissions).
// Fallback to NEXT_PUBLIC_ANON key for client-side usage if service role is not provided.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl) {
  // Let the app boot, but log a clear error for debugging in server logs
  console.error('Supabase URL is not set in environment variables (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL)')
}

// On the server (Node), prefer the service role key if available
let _supabase
if (typeof window === 'undefined') {
  const serverKey = supabaseServiceRoleKey || supabaseAnonKey
  if (!serverKey) {
    console.error('Supabase server key is missing (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY)')
  }
  _supabase = createClient(supabaseUrl, serverKey, { auth: { persistSession: false } })
} else {
  // In browser use the public anon key
  if (!supabaseAnonKey) {
    console.error('Supabase anon key is missing (NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  }
  _supabase = createClient(supabaseUrl, supabaseAnonKey)
}

export const supabase = _supabase
