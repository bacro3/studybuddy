'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import { FcGoogle } from 'react-icons/fc'
import { FaGithub } from 'react-icons/fa'

export default function RegisterPage() {
  const supabase = useSupabaseClient()
  const router = useRouter()
  const user = useUser()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.classList.add('lock-scroll')
    document.body.classList.add('lock-scroll')
    return () => {
      document.documentElement.classList.remove('lock-scroll')
      document.body.classList.remove('lock-scroll')
    }
  }, [])

  useEffect(() => {
    if (user) router.replace('/dashboard')
  }, [user, router])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    else router.push('/auth/login')
  }

  const handleOAuth = async (provider: 'google' | 'github') => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: provider === 'google' ? { queryParams: { prompt: 'select_account' } } : {},
    })
  }

  return (
    <>
      <header className="fixed top-0 left-0 w-full p-4 bg-gray-900/80 backdrop-blur z-10">
      </header>

      <div className="min-h-screen flex items-center justify-center bg-base text-white px-4 pt-20">
        <div className="w-full max-w-md bg-surface p-6 sm:p-8 rounded shadow-md space-y-6">
          <h2 className="text-2xl font-bold text-center">Create an Account</h2>
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <form onSubmit={handleRegister} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full p-3 rounded bg-gray-700 text-sm"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full p-3 rounded bg-gray-700 text-sm"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button className="w-full bg-primary hover:bg-indigo-600 py-2 rounded font-medium">
              Register
            </button>
          </form>
          <div className="text-center text-gray-400 text-sm">or sign up with</div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleOAuth('google')}
              className="flex items-center justify-center gap-2 bg-white text-black py-2 rounded"
            >
              <FcGoogle size={20} /> Google
            </button>
            <button
              onClick={() => handleOAuth('github')}
              className="flex items-center justify-center gap-2 bg-black text-white py-2 rounded"
            >
              <FaGithub size={20} /> GitHub
            </button>
          </div>
          <p className="text-sm text-center text-gray-300">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-accent underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}
