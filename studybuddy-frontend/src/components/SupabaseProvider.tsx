'use client'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { supabase } from '@/utils/supabaseClient'


export default function SupabaseProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionContextProvider supabaseClient={supabase}>
      {children}
    </SessionContextProvider>
  )
}
