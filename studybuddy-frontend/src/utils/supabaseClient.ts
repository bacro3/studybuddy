import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "missing-url"
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "missing-key"

if (supabaseUrl === "missing-url") {
  console.error("❌ Supabase URL is missing from .env")
}
if (supabaseAnonKey === "missing-key") {
  console.error("❌ Supabase anon key is missing from .env")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
