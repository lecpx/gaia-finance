import { createClient } from '@supabase/supabase-js'

// Sử dụng PUBLIC_ prefix cho Vercel client-side
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('❌ Missing Supabase environment variables! Check Vercel Environment Variables.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)
