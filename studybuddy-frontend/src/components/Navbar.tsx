'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import { FiMenu, FiX } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'

export default function Navbar() {
  const supabase = useSupabaseClient()
  const user = useUser()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : 'auto'
    return () => { document.body.style.overflow = 'auto' }
  }, [menuOpen])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  const isHome = pathname === '/'

  return (
    <>
      {isHome ? (
        /* ─── Home page: centered bar ─── */
        <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] sm:w-[90%] lg:w-[80%]">
          <div className="flex justify-between items-center bg-white/10 border border-white/10 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-xl">
            <Link href="/" className="text-lg font-semibold">StudyBuddy</Link>
            <div className="hidden md:flex items-center gap-6">
              <NavLinks vertical={false} />
            </div>
            <div className="hidden md:flex items-center gap-3">
              <AuthButtons user={user} onLogout={handleLogout} vertical={false} />
            </div>
            <button
              onClick={() => setMenuOpen(true)}
              className="md:hidden text-2xl text-white"
            >
              <FiMenu />
            </button>
          </div>
        </nav>
      ) : (
        /* ─── All other pages ─── */
        <>
          {/* desktop sidebar */}
          <aside className="hidden md:flex fixed top-0 left-0 h-full w-60 bg-gray-900 text-white p-6 z-40 flex-col">
            <Link href="/" className="block mb-8 text-2xl font-bold">StudyBuddy</Link>
            <div className="flex-1"><NavLinks vertical={true} /></div>
            <div className="mt-auto"><AuthButtons user={user} onLogout={handleLogout} vertical={true} /></div>
          </aside>

          {/* mobile top bar, fully opaque */}
          <div className="md:hidden fixed top-4 inset-x-4 z-50">
            <div className="flex justify-between items-center bg-gray-900 px-4 py-2 rounded-full">
              <Link href="/" className="text-white font-bold text-lg">StudyBuddy</Link>
              <button onClick={() => setMenuOpen(true)} className="text-2xl text-white">
                <FiMenu />
              </button>
            </div>
          </div>
        </>
      )}

      {/* mobile overlay menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed inset-0 bg-black z-50 flex flex-col p-8 space-y-8 text-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex justify-between items-center">
              <Link href="/" onClick={() => setMenuOpen(false)} className="text-3xl font-bold">
                StudyBuddy
              </Link>
              <button onClick={() => setMenuOpen(false)} className="p-2 text-3xl">
                <FiX />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto">
              <ul className="space-y-6">
                {[
                  { href: '/dashboard', label: 'Dashbord' },
                  { href: '/chat',      label: 'AI Veileder' },
                  { href: '/flashcards',label: 'Flashkort' },
                  { href: '/timer',     label: 'Timer' },
                  { href: '/projects',  label: 'Prosjekter' },
                  { href: '/profile',   label: 'Profil' },
                ].map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      className="block text-2xl font-medium uppercase hover:text-blue-400 transition"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div>
              {user ? (
                <button
                  onClick={() => { handleLogout(); setMenuOpen(false) }}
                  className="w-full bg-white text-gray-900 py-3 rounded font-semibold hover:bg-gray-200 transition"
                >
                  Logg ut
                </button>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    onClick={() => setMenuOpen(false)}
                    className="block w-full py-3 text-center bg-blue-600 rounded font-semibold hover:bg-blue-700 transition mb-4"
                  >
                    Logg inn
                  </Link>
                  <Link
                    href="/auth/register"
                    onClick={() => setMenuOpen(false)}
                    className="block w-full py-3 text-center border border-white rounded font-semibold hover:bg-white hover:text-gray-900 transition"
                  >
                    Registrer
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function NavLinks({ vertical }: { vertical: boolean }) {
  const pathname = usePathname()
  const layout = vertical ? 'flex flex-col space-y-4' : 'flex items-center space-x-6'

  return (
    <div className={layout}>
      {[
        { href: '/dashboard', label: 'Dashbord' },
        { href: '/chat',      label: 'AI Veileder' },
        { href: '/flashcards',label: 'Flashkort' },
        { href: '/timer',     label: 'Timer' },
        { href: '/projects',  label: 'Prosjekter' },
        { href: '/profile',   label: 'Profil' },
      ].map(({ href, label }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`
              block px-2 py-1 rounded
              ${active ? 'bg-white text-gray-900 font-semibold' : 'text-white hover:bg-white/10'}
              transition
            `}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}

function AuthButtons({
  user, onLogout, vertical
}: {
  user: ReturnType<typeof useUser>
  onLogout: () => void
  vertical: boolean
}) {
  if (user) {
    return (
      <button
        onClick={onLogout}
        className={`
          ${vertical ? 'w-full mb-4 block' : ''}
          bg-white text-gray-900 py-2 rounded font-semibold hover:bg-gray-200 transition
        `}
      >
        Logg ut
      </button>
    )
  }

  if (vertical) {
    return (
      <>
        <Link
          href="/auth/login"
          onClick={onLogout}
          className="block w-full py-2 text-center bg-blue-600 rounded font-semibold hover:bg-blue-700 transition mb-3"
        >
          Logg inn
        </Link>
        <Link
          href="/auth/register"
          onClick={onLogout}
          className="block w-full py-2 text-center border border-white rounded font-semibold hover:bg-white hover:text-gray-900 transition"
        >
          Registrer
        </Link>
      </>
    )
  }

  return (
    <>
      <Link
        href="/auth/login"
        className="px-3 py-1.5 border border-white text-white rounded hover:bg-white hover:text-gray-900 transition"
      >
        Logg inn
      </Link>
      <Link
        href="/auth/register"
        className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded transition"
      >
        Registrer
      </Link>
    </>
  )
}
